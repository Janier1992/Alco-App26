import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
    RobotIcon, MicrophoneIcon, CameraIcon, ChevronRightIcon,
    GlobeIcon, LinkIcon, SparklesIcon, XCircleIcon
} from '../constants';
import type { AgentMessage, AgentPersona } from '../types';
import ReactMarkdown from 'react-markdown';
import { useAgent } from './AgentContext';

// --- Audio Utils ---
function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Safe check for data integrity
            if (i * numChannels + channel < dataInt16.length) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
    }
    return buffer;
}

const getContextFromPath = (path: string): string => {
    if (path.includes('dashboard')) return 'Estás en el Dashboard Principal. Tienes visibilidad de los KPIs globales.';
    if (path.includes('nc')) return 'Estás en el módulo de No Conformidades. Puedes ayudar a analizar causas raíz y redactar acciones correctivas.';
    if (path.includes('forms')) return 'Estás en Formularios. Ayuda a verificar tolerancias y criterios de aceptación.';
    if (path.includes('audits')) return 'Estás en Auditorías. Sugiere preguntas de auditoría basadas en ISO 9001.';
    if (path.includes('projects')) return 'Estás en Gestión de Proyectos. Analiza cronogramas y riesgos.';
    return 'Estás en el menú principal.';
};

const getSystemContext = (useSearch: boolean, currentPath: string, persona: AgentPersona = 'Global') => {
    const baseContext = `Eres "Quality Copilot", el Sistema Inteligente de Alco. CONTEXTO ACTUAL: ${getContextFromPath(currentPath)}`;

    const personaPrompts: Record<AgentPersona, string> = {
        Global: `
        ROL: Coordinador General de Calidad.
        OBJETIVO: Visión holística del sistema.
        ESTILO: Formal, directivo y estratégico.
        `,
        Ops: `
        ROL: Asistente de Operaciones y Producción.
        OBJETIVO: Resolver dudas técnicas inmediatas en planta.
        ESTILO: Práctico, breve y técnico. "Al grano".
        COMPETENCIAS: Interpretación de Planos, Tolerancias, Maquinaria.
        `,
        QA: `
        ROL: Auditor Senior de Calidad (QC/QA).
        OBJETIVO: Detección rigurosa de desviaciones.
        ESTILO: Analítico, basado en evidencia y normativa ISO 9001/ASTM.
        `,
        Project: `
        ROL: Gestor de Proyectos (PM).
        OBJETIVO: Control de cronograma y riesgos.
        ESTILO: Orientado a plazos y riesgos.
        `,
        Supply: `
        ROL: Analista de Proveedores y Compras.
        OBJETIVO: Aseguramiento de calidad de insumos.
        ESTILO: Negociador y detallista.
        `
    };

    return `
    ${baseContext}
    
    TU IDENTIDAD ACTIVA: ${personaPrompts[persona]}
    
    CAPACIDADES GENERALES:
    - ${useSearch ? 'ACCESO ONLINE ACTIVADO: Valida datos en tiempo real.' : 'MODO OFFLINE: Responde con tu base de conocimiento interna.'}
    - MÉTODO DE RESPUESTA: Usa Markdown. Sé conciso. Si detectas riesgo, inicia con [ALERTA].
    `;
};

const AgentHub: React.FC = () => {
    const { isAgentOpen, toggleAgent, activeDocument, setActiveDocument } = useAgent();
    // const [isOpen, setIsOpen] = useState(false); // Replaced by context
    const [mode, setMode] = useState<'text' | 'voice'>('text');
    const [useGoogleSearch, setUseGoogleSearch] = useState(true);
    const [activeAgent, setActiveAgent] = useState<AgentPersona>('Global');
    const location = useLocation();

    // --- State ---
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<AgentMessage[]>([
        { id: 'welcome', role: 'agent', content: 'Hola. Soy Quality Copilot v5.0. Analizo procesos, predigo riesgos y te asisto con la normativa. ¿En qué trabajamos hoy?' }
    ]);
    const [groundingSources, setGroundingSources] = useState<any[]>([]);
    const [attachedImage, setAttachedImage] = useState<{ data: string, mime: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Voice Refs ---
    const nextStartTime = useRef<number>(0);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const outputNode = useRef<GainNode | null>(null);
    const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const sessionPromise = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    useEffect(() => {
        if (isAgentOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isAgentOpen, mode]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setAttachedImage({ data: base64, mime: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() && !attachedImage) return;

        const userMsg: AgentMessage = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setGroundingSources([]);
        setIsProcessing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const parts: any[] = [{ text: input || 'Analiza esta situación técnica.' }];

            // Add active document if present
            if (activeDocument) {
                parts.push({
                    inlineData: {
                        data: activeDocument.content,
                        mimeType: activeDocument.mime
                    }
                });
                parts.unshift({ text: `[SYSTEM] El usuario está visualizando el documento "${activeDocument.name}". Úsalo como contexto principal si es relevante.` });
            }

            if (attachedImage) {
                parts.push({ inlineData: { data: attachedImage.data, mimeType: attachedImage.mime } });
            }

            const response = await ai.models.generateContent({
                model: useGoogleSearch ? 'gemini-2.0-flash-exp' : 'gemini-2.0-flash-exp', // Updated model
                contents: { parts },
                config: {
                    systemInstruction: getSystemContext(useGoogleSearch, location.pathname, activeAgent),
                    tools: useGoogleSearch ? [{ googleSearch: {} }] : undefined
                }
            });

            // Extract Grounding
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks) {
                const links = chunks.filter((c: any) => c.web).map((c: any) => ({
                    title: c.web.title,
                    uri: c.web.uri
                }));
                setGroundingSources(links);
            }

            const agentMsg: AgentMessage = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: response.text || 'He procesado tu solicitud.'
            };
            setMessages(prev => [...prev, agentMsg]);
            setAttachedImage(null);
        } catch (error) {
            setMessages(prev => [...prev, { id: 'err', role: 'agent', content: '⚠️ Error de conexión con el núcleo de IA. Verifica tu red.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Voice logic
    const stopVoiceSession = () => {
        sources.current?.forEach(source => { try { source.stop(); } catch (e) { } });
        sources.current?.clear();
        streamRef.current?.getTracks().forEach(track => track.stop());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        inputAudioContext.current?.close().catch(() => { });
        outputAudioContext.current?.close().catch(() => { });
        sessionPromise.current = null;
        setVoiceStatus('disconnected');
        setIsSpeaking(false);
    };

    const startVoiceSession = async () => {
        try {
            setVoiceStatus('connecting');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const ctxIn = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctxOut = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            inputAudioContext.current = ctxIn;
            outputAudioContext.current = ctxOut;
            outputNode.current = ctxOut.createGain();
            outputNode.current.connect(ctxOut.destination);

            let personaInstruction = getSystemContext(false, location.pathname, activeAgent);

            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                    systemInstruction: personaInstruction,
                },
                callbacks: {
                    onopen: () => {
                        setVoiceStatus('connected');
                        const source = ctxIn.createMediaStreamSource(stream);
                        const script = ctxIn.createScriptProcessor(4096, 1, 1);
                        script.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                            sessionPromise.current?.then(s => s.sendRealtimeInput({
                                media: { data: arrayBufferToBase64(int16.buffer), mimeType: 'audio/pcm;rate=16000' }
                            }));
                        };
                        source.connect(script);
                        script.connect(ctxIn.destination);
                        processorRef.current = script;
                        sourceRef.current = source;
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64) {
                            setIsSpeaking(true);
                            const audioBuffer = await decodeAudioData(base64ToUint8Array(base64), ctxOut, 24000, 1);
                            const source = ctxOut.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode.current!);
                            nextStartTime.current = Math.max(nextStartTime.current, ctxOut.currentTime);
                            source.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                            sources.current.add(source);
                            source.onended = () => {
                                sources.current.delete(source);
                                if (sources.current.size === 0) setIsSpeaking(false);
                            };
                        }
                    },
                    onerror: (e) => console.error(e),
                    onclose: () => stopVoiceSession()
                }
            });
        } catch (err) {
            setVoiceStatus('disconnected');
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end gap-4">
            {isAgentOpen && (
                <div className="bg-white dark:bg-[#1e1e2d] w-[400px] h-[600px] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right">
                    {/* HEADER */}
                    <div className="p-4 bg-gradient-to-r from-[#5d5fef] to-[#4f46e5] space-y-3">
                        <div className="flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md text-yellow-300">
                                    <SparklesIcon />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wide">Quality Copilot</h3>
                                    <p className="text-[10px] text-indigo-100 opacity-90 font-medium">{voiceStatus === 'connected' ? '🎙️ Voz Activa' : '🟢 Sistema Online'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setUseGoogleSearch(!useGoogleSearch)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${useGoogleSearch ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100' : 'bg-white/10 border-white/20 text-white/60'}`}
                                    title="Búsqueda Web"
                                >
                                    <GlobeIcon />
                                </button>
                                <button
                                    onClick={() => setMode(mode === 'text' ? 'voice' : 'text')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'voice' ? 'bg-white text-[#5d5fef] shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <MicrophoneIcon />
                                </button>
                                <button onClick={() => toggleAgent(false)} className="text-white/70 hover:text-white p-2">
                                    <XCircleIcon />
                                </button>
                            </div>
                        </div>
                        {/* AGENT SELECTOR */}
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {(['Global', 'Ops', 'QA', 'Project', 'Supply'] as AgentPersona[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setActiveAgent(p)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeAgent === p ? 'bg-white text-[#5d5fef] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    {p === 'Global' ? '🧠 General' : p === 'Ops' ? '🏭 Ops' : p === 'QA' ? '🛡️ Calidad' : p === 'Project' ? '📅 Proyectos' : '📦 Compras'}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* ACTIVE DOCUMENT INDICATOR */}
                    {activeDocument && (
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center animate-fade-in">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className='text-xl'>📄</span>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Analizando Documento</span>
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate max-w-[200px]">{activeDocument.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setActiveDocument(null)} className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 p-1">
                                <XCircleIcon />
                            </button>
                        </div>
                    )}

                    {/* BODY */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50 dark:bg-[#151520]">
                        {mode === 'text' ? (
                            <>
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#5d5fef] text-white rounded-tr-sm' : 'bg-white dark:bg-[#252535] text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-white/5'}`}>
                                            <div className="prose dark:prose-invert prose-xs">
                                                <ReactMarkdown>{m.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-[#252535] p-4 rounded-3xl rounded-tl-sm border border-slate-100 dark:border-white/5 flex gap-2 items-center">
                                            <div className="w-2 h-2 bg-[#5d5fef] rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-[#5d5fef] rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-[#5d5fef] rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                )}
                                {groundingSources.length > 0 && (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2 flex items-center gap-2">
                                            <GlobeIcon /> Fuentes Verificadas
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {groundingSources.map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-black/20 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                                                >
                                                    <LinkIcon /> {source.title.substring(0, 20)}...
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                                <div className="relative">
                                    <div className={`absolute inset-0 bg-[#5d5fef] rounded-full opacity-20 blur-xl transition-all duration-1000 ${isSpeaking ? 'scale-150' : 'scale-100'}`}></div>
                                    <div className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'border-[#5d5fef] bg-indigo-50 dark:bg-white/10 scale-110' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#252535]'}`}>
                                        <div className={`text-3xl ${isSpeaking ? 'text-[#5d5fef] animate-pulse' : 'text-slate-300 dark:text-slate-600'}`}>
                                            <MicrophoneIcon />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-bold dark:text-white">{isSpeaking ? 'Escuchando Voz...' : 'Modo Conversación'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[200px] mx-auto">Habla naturalmente. El Copilot puede escucharte y responder con voz de alta fidelidad.</p>
                                </div>
                                <button onClick={voiceStatus === 'connected' ? stopVoiceSession : startVoiceSession} className={`px-6 py-3 rounded-full font-bold text-xs shadow-lg transition-transform active:scale-95 ${voiceStatus === 'connected' ? 'bg-rose-500 text-white' : 'bg-[#5d5fef] text-white hover:bg-[#4f46e5]'}`}>
                                    {voiceStatus === 'connected' ? 'Desconectar Voz' : 'Iniciar Sesión de Voz'}
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* FOOTER */}
                    {mode === 'text' && (
                        <div className="p-3 bg-white dark:bg-[#1e1e2d] border-t border-slate-100 dark:border-white/5">
                            {attachedImage && (
                                <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    <CameraIcon /> Imagen adjunta
                                    <button onClick={() => setAttachedImage(null)} className="ml-auto hover:text-rose-500"><XCircleIcon /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-[#5d5fef] bg-slate-50 dark:bg-white/5 rounded-xl transition-colors">
                                    <CameraIcon />
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <input
                                    className="flex-grow bg-slate-50 dark:bg-[#252535] border-transparent focus:border-[#5d5fef] focus:ring-0 rounded-xl px-4 py-2.5 text-sm transition-all dark:text-white placeholder:text-slate-400"
                                    placeholder="Escribe tu consulta..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} disabled={isProcessing || (!input && !attachedImage)} className="p-3 bg-[#5d5fef] text-white rounded-xl disabled:opacity-50 hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TOGGLE BUTTON */}
            <button
                onClick={() => toggleAgent()}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-2xl transition-all duration-300 z-50
                    ${isAgentOpen ? 'bg-slate-800 text-white rotate-90 scale-90' : 'bg-[#5d5fef] text-white hover:scale-110 hover:shadow-indigo-500/50 animate-bounce-subtle'}
                `}
            >
                {isAgentOpen ? <XCircleIcon /> : <RobotIcon />}
            </button>
        </div>
    );
};

export default AgentHub;
