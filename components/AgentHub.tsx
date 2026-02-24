
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    RobotIcon, MicrophoneIcon, CameraIcon, ChevronRightIcon,
    GlobeIcon, LinkIcon, SparklesIcon, XCircleIcon
} from '../constants';
import type { AgentMessage, AgentPersona } from '../types';
import ReactMarkdown from 'react-markdown';
import { useAgent } from './AgentContext';
import { useNotification } from './NotificationSystem';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_KEY;

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

const LOCATION_MAP: Record<string, string> = {
    'dashboard': 'Estás en el Dashboard Principal. Tienes visibilidad de los KPIs globales.',
    'nc': 'Estás en el módulo de No Conformidades. Puedes ayudar a analizar causas raíz y redactar acciones correctivas.',
    'forms': 'Estás en Formularios. Ayuda a verificar tolerancias y criterios de aceptación.',
    'audits': 'Estás en Auditorías. Sugiere preguntas de auditoría basadas en ISO 9001.',
    'projects': 'Estás en Gestión de Proyectos. Analiza cronogramas y riesgos.',
};

const getContextFromPath = (path: string): string => {
    for (const key in LOCATION_MAP) {
        if (path.includes(key)) return LOCATION_MAP[key];
    }
    return 'Estás en el menú principal.';
};



const getSystemContext = (useSearch: boolean, currentPath: string, persona: AgentPersona = 'Global') => {
    const baseContext = `Eres "Agente Calidad", el Sistema Inteligente de Alco.CONTEXTO ACTUAL: ${getContextFromPath(currentPath)} `;

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
ROL: Auditor Senior de Calidad(QC / QA).
    OBJETIVO: Detección rigurosa de desviaciones.
        ESTILO: Analítico, basado en evidencia y normativa ISO 9001 / ASTM.
`,
        Project: `
ROL: Gestor de Proyectos(PM).
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
- MÉTODO DE RESPUESTA: Usa Markdown.Sé conciso.Si detectas riesgo, inicia con[ALERTA].
- IDIOMA: Responde SIEMPRE en Español, a menos que se solicite explícitamente otro idioma para una traducción.
`;
};

const AgentHub: React.FC = () => {
    const { isAgentOpen, toggleAgent, activeDocument, setActiveDocument } = useAgent();
    // Use notification system
    const { addNotification } = useNotification();
    const [mode, setMode] = useState<'text' | 'voice'>('text');
    const [useGoogleSearch, setUseGoogleSearch] = useState(true);
    const [activeAgent, setActiveAgent] = useState<AgentPersona>('Global');
    const location = useLocation();

    // --- State ---
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<AgentMessage[]>([
        { id: 'welcome', role: 'agent', content: 'Hola. Soy Agente Calidad v5.0. Analizo procesos, predigo riesgos y te asisto con la normativa. ¿En qué trabajamos hoy?' }
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
    const sessionPromise = useRef<Promise<any> | null>(null); // Kept for type compatibility but might change
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const wsRef = useRef<WebSocket | null>(null); // For manual WebSocket


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
            if (!API_KEY) throw new Error("API_KEY_MISSING");
            const genAI = new GoogleGenerativeAI(API_KEY);

            // Prepare Prompt Parts
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

            // System Instruction
            const systemInstruction = getSystemContext(useGoogleSearch, location.pathname, activeAgent);

            let responseText = "";

            try {
                // Attempt 1: Gemini 1.5 Flash
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash-001",
                    systemInstruction: systemInstruction,
                } as any);

                // Implement a manual timeout since the GenAI SDK might hang on slow connections
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT")), 15000)
                );

                const result = await Promise.race([
                    model.generateContent(parts),
                    timeoutPromise
                ]) as any;

                const response = await result.response;
                responseText = response.text();
            } catch (err1: any) {
                console.warn("Flash failed, trying Pro:", err1);

                // Si el error fue un 429 o un Timeout, propagarlo inmediatamente sin reintentar con Pro (para no saturar más)
                if (err1.message === "TIMEOUT" || err1?.status === 429 || err1?.message?.includes('429')) {
                    throw err1;
                }

                // Attempt 2: Gemini 1.5 Pro (Fallback)
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-pro-001",
                    systemInstruction: systemInstruction,
                } as any);

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT")), 25000) // Pro gets more time
                );

                const result = await Promise.race([
                    model.generateContent(parts),
                    timeoutPromise
                ]) as any;

                const response = await result.response;
                responseText = response.text();
            }

            const agentMsg: AgentMessage = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: responseText || 'He procesado tu solicitud.'
            };
            setMessages(prev => [...prev, agentMsg]);
            setAttachedImage(null);

        } catch (error: any) {
            console.error("AI Error:", error);

            let userFriendlyMessage = `⚠️ **Error de Sistema**\n\nNo pude procesar la solicitud en este momento. \n\n*Detalle técnico:* ${error.message || 'Error desconocido'}`;

            // Categorize errors for better UX
            if (error.message === "API_KEY_MISSING") {
                userFriendlyMessage = `🛑 **Configuración Incompleta**\n\nNo se ha configurado la llave de acceso a la Inteligencia Artificial (API Key). Por favor contacta al administrador del sistema.`;
            } else if (error.message === "TIMEOUT") {
                userFriendlyMessage = `⏱️ **Tiempo de Espera Agotado**\n\nLa red está inestable o los servidores de IA están lentos en este momento. Por favor, revisa tu conexión e intenta de nuevo en unos segundos.`;
                addNotification({ type: 'warning', title: 'Red Inestable', message: 'La solicitud a la IA tomó demasiado tiempo.' });
            } else if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota')) {
                userFriendlyMessage = `⏳ **Servidores Saturados**\n\nEstoy procesando demasiadas solicitudes en todos los frentes operacionales en este instante (Error 429/Cuota Excedida). Por favor espera un minuto e inténtalo de nuevo.`;
                addNotification({ type: 'warning', title: 'Agente Ocupado', message: 'Cuota de peticiones excedida temporalmente.' });
            } else if (!navigator.onLine || error?.message?.includes('fetch')) {
                userFriendlyMessage = `🔌 **Sin Conexión a Internet**\n\nParece que has perdido la conexión. Necesito internet para mis capacidades de IA.`;
            }

            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                role: 'agent',
                content: userFriendlyMessage
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Voice logic
    const stopVoiceSession = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        sources.current?.forEach(source => { try { source.stop(); } catch (e) { } });
        sources.current?.clear();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        inputAudioContext.current?.close().catch(() => { });
        outputAudioContext.current?.close().catch(() => { });
        setVoiceStatus('disconnected');
        setIsSpeaking(false);
    };

    const startVoiceSession = async () => {
        try {
            setVoiceStatus('connecting');
            if (!API_KEY) throw new Error("API Key no configurada");

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio Contexts
            const ctxIn = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctxOut = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            inputAudioContext.current = ctxIn;
            outputAudioContext.current = ctxOut;
            outputNode.current = ctxOut.createGain();
            outputNode.current.connect(ctxOut.destination);

            // Manual WebSocket Connection for Live API
            const host = "generativelanguage.googleapis.com";
            const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setVoiceStatus('connected');
                // Initial Setup Message
                const setupMsg = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
                            }
                        },
                        systemInstruction: {
                            parts: [{ text: getSystemContext(false, location.pathname, activeAgent) }]
                        }
                    }
                };
                ws.send(JSON.stringify(setupMsg));

                // Start Audio Processing
                const source = ctxIn.createMediaStreamSource(stream);
                const script = ctxIn.createScriptProcessor(4096, 1, 1);

                script.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }

                    // Send Realtime Input
                    const audioMsg = {
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "audio/pcm;rate=16000",
                                data: arrayBufferToBase64(int16.buffer)
                            }]
                        }
                    };
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(audioMsg));
                    }
                };

                source.connect(script);
                script.connect(ctxIn.destination);
                processorRef.current = script;
                sourceRef.current = source;
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Check for server_content with model_turn and parts
                    const base64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
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
                } catch (e) {
                    console.error("WS Message Parse Error", e);
                }
            };

            ws.onerror = (e) => {
                console.error("WebSocket Error:", e);
                setVoiceStatus('disconnected');
                addNotification({
                    type: 'error',
                    title: 'Error de Conexión',
                    message: 'Falló la conexión de voz. Verifique su API Key o permisos de red.'
                });
            };

            ws.onclose = () => {
                stopVoiceSession();
            };

        } catch (err) {
            console.error("Voice Session Error:", err);
            setVoiceStatus('disconnected');
            setMessages(prev => [...prev, {
                id: 'err_voice',
                role: 'agent',
                content: `⚠️ **Error de Voz**\n\nNo se pudo conectar con el modo Live`
            }]);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end gap-4">
            {isAgentOpen && (
                <div className="bg-white dark:bg-[#111827] w-[400px] h-[600px] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.06] flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right backdrop-blur-xl">
                    {/* HEADER */}
                    <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 space-y-3">
                        <div className="flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md text-yellow-300">
                                    <SparklesIcon />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wide">Agente Calidad</h3>
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
                                    className={`p-2 rounded-lg transition-all ${mode === 'voice' ? 'bg-white text-indigo-600 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}
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
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeAgent === p ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50 dark:bg-[#0a0e18]">
                        {mode === 'text' ? (
                            <>
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                        <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-sm' : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-white/[0.06]'}`}>
                                            <div className="prose dark:prose-invert prose-xs">
                                                <ReactMarkdown>{m.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-white/[0.04] p-4 rounded-3xl rounded-tl-sm border border-slate-100 dark:border-white/[0.06] flex gap-2 items-center">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
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
                                    <div className={`absolute inset-0 bg-indigo-500 rounded-full opacity-20 blur-xl transition-all duration-1000 ${isSpeaking ? 'scale-150' : 'scale-100'}`}></div>
                                    <div className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'border-indigo-500 bg-indigo-50 dark:bg-white/10 scale-110' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]'}`}>
                                        <div className={`text-3xl ${isSpeaking ? 'text-indigo-500 animate-pulse' : 'text-slate-300 dark:text-slate-600'}`}>
                                            <MicrophoneIcon />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-bold dark:text-white">{isSpeaking ? 'Escuchando Voz...' : 'Modo Conversación'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[200px] mx-auto">Habla naturalmente. El Agente puede escucharte y responder con voz de alta fidelidad.</p>
                                </div>
                                <button onClick={voiceStatus === 'connected' ? stopVoiceSession : startVoiceSession} className={`px-6 py-3 rounded-full font-bold text-xs shadow-lg transition-transform active:scale-95 ${voiceStatus === 'connected' ? 'bg-rose-500 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/40'}`}>
                                    {voiceStatus === 'connected' ? 'Desconectar Voz' : 'Iniciar Sesión de Voz'}
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* FOOTER */}
                    {mode === 'text' && (
                        <div className="p-3 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-white/[0.04]">
                            {attachedImage && (
                                <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    <CameraIcon /> Imagen adjunta
                                    <button onClick={() => setAttachedImage(null)} className="ml-auto hover:text-rose-500"><XCircleIcon /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-indigo-500 bg-slate-50 dark:bg-white/[0.04] rounded-xl transition-colors">
                                    <CameraIcon />
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <input
                                    className="flex-grow bg-slate-50 dark:bg-white/[0.04] border border-transparent focus:border-indigo-500/40 focus:ring-0 rounded-xl px-4 py-2.5 text-sm transition-all dark:text-white placeholder:text-slate-400"
                                    placeholder="Escribe tu consulta..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} disabled={isProcessing || (!input && !attachedImage)} className="p-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl disabled:opacity-50 hover:shadow-indigo-500/30 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
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
                    ${isAgentOpen ? 'bg-slate-800 text-white rotate-90 scale-90' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-110 hover:shadow-indigo-500/50 animate-bounce-subtle'}
                `}
            >
                {isAgentOpen ? <XCircleIcon /> : <RobotIcon />}
            </button>
        </div>
    );
};

export default AgentHub;
