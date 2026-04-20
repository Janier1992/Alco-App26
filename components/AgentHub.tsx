
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    RobotIcon, MicrophoneIcon, CameraIcon, ChevronRightIcon,
    GlobeIcon, LinkIcon, SparklesIcon, XCircleIcon, BookIcon
} from '../constants';
import type { AgentMessage, AgentPersona } from '../types';
import ReactMarkdown from 'react-markdown';
import { useAgent } from './AgentContext';
import { useNotification } from './NotificationSystem';
import {
    KB_DOCUMENTS, loadDocument, getKBParts, getKBSystemContext,
    type KBDocument
} from '../utils/knowledgeBaseService';
import { insforge } from '../insforgeClient';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_KEY;
const BASE_PATH = import.meta.env.BASE_URL || '/Alco-App26/';

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
    'forms': 'Estás en Formularios de Inspección. Ayuda a verificar tolerancias y criterios de aceptación.',
    'audits': 'Estás en Auditorías ISO 9001. Sugiere preguntas de auditoría y evalúa evidencias.',
    'projects': 'Estás en Gestión de Proyectos. Analiza cronogramas y riesgos.',
    'claims': 'Estás en Reclamos de Calidad. Ayuda a clasificar y redactar respuestas a clientes.',
    'metrology': 'Estás en Metrología. Asesora sobre calibración, trazabilidad y control de equipos.',
    'maintenance': 'Estás en Mantenimiento. Ayuda a diagnosticar fallas y planificar mantenimiento preventivo.',
};

const getContextFromPath = (path: string): string => {
    for (const key in LOCATION_MAP) {
        if (path.includes(key)) return LOCATION_MAP[key];
    }
    return 'Estás en el menú principal de Alco SGC Pro.';
};

const getSystemContext = (useSearch: boolean, currentPath: string, persona: AgentPersona = 'Global', kbDocs: KBDocument[]) => {
    
    const baseContext = `Eres el "Experto Técnico Alco", un asistente especializado EXCLUSIVAMENTE en los manuales y procedimientos de la carpeta DOCUMENTE.md.

TU MISIÓN: Responder consultas técnicas basándote ÚNICAMENTE en la documentación oficial proporcionada.

REGLA CRÍTICA DE RESTRICCIÓN:
- Si la respuesta NO está en los documentos activos de la base de conocimiento, responde: "Lo siento, como Experto Técnico Alco, no encuentro información sobre ese tema específico en los manuales actuales. Por favor, consulta a un supervisor o revisa la documentación física."
- PROHIBIDO alucinar o usar conocimiento general de internet para especificar tolerancias, procesos de fabricación o criterios de aceptación de Alco.
- SOLO los documentos proporcionados son la fuente de verdad.

CONTEXTO DE NAVEGACIÓN: ${getContextFromPath(currentPath)}

${getKBSystemContext(kbDocs)}`;

    const personaPrompts: Record<AgentPersona, string> = {
        Global: `
ROL: Especialista en Normativa y Manuales Alco.
OBJETIVO: Asegurar que el usuario siga los instructivos técnicos al pie de la letra.
ESTILO: Técnico, riguroso y preciso.`,
        Ops: `
ROL: Asistente de Planta (Enfoque en Instructivos de Fabricación).
OBJETIVO: Extraer medidas, tolerancias y pasos de los instructivos PC-OPT.
ESTILO: Directo. Cita tablas y valores específicos del documento.`,
        QA: `
ROL: Inspector de Calidad Senior.
OBJETIVO: Validar piezas contra los manuales de inspección.
ESTILO: Crítico y basado en criterios de aceptación/rechazo del manual.`,
        Project: `
ROL: Gestor de Implementación Calidad.
OBJETIVO: Relacionar los manuales con las fases del proyecto.
ESTILO: Estructural y analítico.`,
        Supply: `
ROL: Auditor de Especificaciones de Material.
OBJETIVO: Verificar que los insumos cumplan con las fichas técnicas cargadas.
ESTILO: Detallista.`
    };

    return `${baseContext}

IDENTIDAD ACTIVA: ${personaPrompts[persona]}

REGLAS DE RESPUESTA:
- Puedes responder a saludos y cortesía. Prioriza SIEMPRE los documentos activos para temas técnicos.
- Si hay varios documentos, indica de cuál estás extrayendo la información.
- Usa lenguaje técnico colombiano usado en Alco.
- NO respondas preguntas que no tengan que ver con Alco o con Gestión de Calidad.`;
};

// --- Knowledge Base Panel ---
const KBPanel: React.FC<{
    docs: KBDocument[];
    loading: Set<string>;
    onToggle: (id: string) => void;
    onSync: () => void;
    isSyncing: boolean;
    fragmentCount: number | null;
}> = ({ docs, loading, onToggle, onSync, isSyncing, fragmentCount }) => (
    <div className="px-4 py-3 bg-indigo-950/40 border-b border-indigo-800/30 animate-fade-in">
        <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] flex items-center gap-2">
                <BookIcon className="w-3 h-3" /> Base de Conocimiento Técnico
            </p>
            <button 
                onClick={onSync}
                disabled={isSyncing}
                className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded hover:bg-indigo-500/40 transition-colors flex items-center gap-1 uppercase font-bold disabled:opacity-50"
            >
                <SparklesIcon className="w-2 h-2" /> Sync RAG
            </button>
        </div>
        <div className="space-y-1.5">
            {docs.map(doc => (
                <button
                    key={doc.id}
                    onClick={() => onToggle(doc.id)}
                    disabled={loading.has(doc.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all text-[10px] font-semibold border ${doc.active
                            ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                        }`}
                >
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 border transition-colors ${doc.active ? 'bg-indigo-400 border-indigo-400' : 'border-slate-500'}`}>
                        {doc.active && <svg viewBox="0 0 10 10" className="w-full h-full text-white"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                    </div>
                    <span className="truncate flex-1">{doc.name}</span>
                    {loading.has(doc.id) && (
                        <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {!loading.has(doc.id) && (
                        <span className="text-slate-500 flex-shrink-0">{doc.sizeKb! > 999 ? `${(doc.sizeKb! / 1024).toFixed(1)} MB` : `${doc.sizeKb} KB`}</span>
                    )}
                </button>
            ))}
        </div>
        {docs.some(d => d.active) && (
            <div className="mt-2 flex flex-col gap-0.5">
                <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {docs.filter(d => d.active).length} doc(s) activo(s)
                </p>
                {fragmentCount !== null && (
                    <p className="text-[8px] text-indigo-400/70 font-medium">
                        Indexado: {fragmentCount} fragmentos en base de datos
                    </p>
                )}
            </div>
        )}
    </div>
);

const AgentHub: React.FC = () => {
    const { isAgentOpen, toggleAgent, activeDocument, setActiveDocument } = useAgent();
    const { addNotification } = useNotification();
    const [mode, setMode] = useState<'text' | 'voice'>('text');
    const [useGoogleSearch, setUseGoogleSearch] = useState(true);
    const [activeAgent, setActiveAgent] = useState<AgentPersona>('Global');
    const [showKBPanel, setShowKBPanel] = useState(false);
    const location = useLocation();

    // Knowledge Base state
    const [kbDocs, setKbDocs] = useState<KBDocument[]>(KB_DOCUMENTS);
    const [kbLoading, setKbLoading] = useState<Set<string>>(new Set());

    // Auto-load and activate the primary manual on mount
    const fetchKbStats = async () => {
        try {
            const { count, error } = await insforge.database
                .from('kb_fragments')
                .select('*', { count: 'exact', head: true });
            if (!error && count !== null) setKbFragmentCount(count);
        } catch (e) {
            console.error("Stats Error:", e);
        }
    };

    const autoLoadPrimary = async () => {
        const primary = kbDocs.find(d => d.id === 'alco_inspeccion');
        if (primary && !primary.loaded) {
            setKbLoading(prev => new Set(prev).add(primary.id));
            const loaded = await loadDocument(primary);
            setKbLoading(prev => {
                const next = new Set(prev);
                next.delete(primary.id);
                return next;
            });
            setKbDocs(prev => prev.map(d => d.id === primary.id ? { ...loaded, active: true } : d));
        }
    };

    useEffect(() => {
        autoLoadPrimary();
        fetchKbStats();
        const interval = setInterval(fetchKbStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Chat state
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<AgentMessage[]>([
        { id: 'welcome', role: 'agent', content: '¡Hola! Soy **Agente Calidad v5.0**. Estoy conectado a los documentos técnicos de Alco.\n\n📚 Activa documentos en la **Base de Conocimiento** para que pueda asesorarte con información específica de los instructivos y procedimientos. ¿En qué trabajamos hoy?' }
    ]);
    const [groundingSources, setGroundingSources] = useState<any[]>([]);
    const [kbFragmentCount, setKbFragmentCount] = useState<number | null>(null);
    const [attachedImage, setAttachedImage] = useState<{ data: string, mime: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Voice refs
    const nextStartTime = useRef<number>(0);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const outputNode = useRef<GainNode | null>(null);
    const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (isAgentOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isAgentOpen, mode]);

    const syncManuals = async () => {
        setIsProcessing(true);
        addNotification({ type: 'info', title: '🔄 Sincronizando RAG', message: 'Iniciando procesamiento de manuales...' });
        
        try {
            if (!API_KEY) throw new Error("API_KEY_MISSING");
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

            const embedWithRetry = async (text: string, retries = 5): Promise<number[]> => {
                for (let i = 0; i < retries; i++) {
                    try {
                        const res = await embeddingModel.embedContent(text);
                        return res.embedding.values;
                    } catch (err: any) {
                        if (err.status === 429 || err.message.includes('429') && i < retries - 1) {
                            const delay = (i + 1) * 3000;
                            console.warn(`[429] Reintentando embedding en ${delay}ms...`);
                            await new Promise(r => setTimeout(r, delay));
                            continue;
                        }
                        throw err;
                    }
                }
                throw new Error("MAX_RETRIES_EXCEEDED");
            };

            // Limpiar previo para evitar duplicados si se desea (Opcional, depende de la lógica)
            // await insforge.database.from("kb_fragments").delete().neq("id", "0");

            for (const doc of KB_DOCUMENTS) {
                addNotification({ type: 'info', title: `📄 Procesando`, message: doc.name });
                const loaded = await loadDocument(doc);
                if (!loaded.data) continue;

                const result = await model.generateContent([
                    "Extrae el texto completo de este manual técnico. Sé extremadamente preciso.",
                    { inlineData: { data: loaded.data, mimeType: "application/pdf" } }
                ]);
                const text = result.response.text();
                
                await new Promise(r => setTimeout(r, 2000));

                const fragments = [];
                let start = 0;
                while (start < text.length) {
                    fragments.push(text.substring(start, start + 1000));
                    start += 800; // Overlap para mejor búsqueda
                }

                for (let i = 0; i < fragments.length; i++) {
                    const chunk = fragments[i];
                    const vector = await embedWithRetry(chunk);

                    await insforge.database.from("kb_fragments").insert([{
                        document_id: doc.id,
                        content: chunk,
                        embedding: vector,
                        metadata: { source: doc.name, index: i }
                    }]);
                    
                    if (i % 5 === 0) {
                        console.log(`[RAG-SYNC] ${doc.name}: ${i}/${fragments.length} fragmentos`);
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            addNotification({ type: 'success', title: '✅ RAG Actualizado', message: 'Conocimiento técnico sincronizado correctamente.' });
        } catch (err: any) {
            console.error("Sync Error:", err);
            addNotification({ type: 'error', title: 'Error Sync', message: 'Se alcanzó el límite de la API. Intenta de nuevo en unos minutos.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleKBDoc = useCallback(async (docId: string) => {
        const doc = kbDocs.find(d => d.id === docId);
        if (!doc) return;

        // If deactivating, just toggle
        if (doc.active) {
            setKbDocs(prev => prev.map(d => d.id === docId ? { ...d, active: false } : d));
            return;
        }

        // If activating and not loaded yet, fetch it
        if (!doc.loaded) {
            setKbLoading(prev => new Set(prev).add(docId));
            const loaded = await loadDocument(doc);
            setKbLoading(prev => {
                const next = new Set(prev);
                next.delete(docId);
                return next;
            });

            if (!loaded.loaded) {
                addNotification({ type: 'error', title: 'Error KB', message: `No se pudo cargar: ${doc.name}` });
                return;
            }

            setKbDocs(prev => prev.map(d => d.id === docId ? { ...loaded, active: true } : d));
            addNotification({ type: 'success', title: '📄 Documento Cargado', message: `${doc.name} activo en el agente.` });
        } else {
            setKbDocs(prev => prev.map(d => d.id === docId ? { ...d, active: true } : d));
        }
    }, [kbDocs, addNotification]);

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

    const searchRAG = async (query: string, genAI: GoogleGenerativeAI) => {
        try {
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            
            let vector: number[] | null = null;
            for (let i = 0; i < 3; i++) {
                try {
                    const embResult = await embeddingModel.embedContent(query);
                    vector = embResult.embedding.values;
                    break;
                } catch (e: any) {
                    if (e.status === 429 && i < 2) {
                        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                        continue;
                    }
                    throw e;
                }
            }

            if (!vector) return [];

            const { data, error } = await insforge.database.rpc('match_kb_fragments', {
                query_embedding: vector,
                match_threshold: 0.3, 
                match_count: 5
            });

            if (error) throw error;
            return data || [];
        } catch (err: any) {
            console.error("RAG Search Error:", err);
            return [];
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

            // 1. Obtener contexto de manuales vía RAG (Búsqueda inteligente)
            let contextParts: any[] = [];
            const activeKBCount = kbDocs.filter(d => d.active).length;
            
            if (activeKBCount > 0) {
                // Solo buscamos en RAG si el mensaje tiene longitud suficiente (evitamos saludos)
                if (input.trim().length > 4) {
                    try {
                        console.log(`[RAG] Buscando contexto técnico para: "${input}"`);
                        const ragFragments = await searchRAG(input, genAI);
                        
                        if (ragFragments && ragFragments.length > 0) {
                            const contextText = ragFragments.map((f: any) => `[FUENTE: ${f.metadata.source}] ${f.content}`).join('\n\n');
                            contextParts.push({
                                text: `ESTADO TÉCNICO ALCO (Información Verificada de Manuales):\n${contextText}\n\nINSTRUCCIÓN CRÍTICA: Responde basándote únicamente en estos datos. Si la información no está aquí, advierte que no se encuentra en los manuales de Alco.`
                            });
                        } else {
                            // En lugar de inyectar advertencia agresiva, dejamos que el modelo responda 
                            // pero recordándole su identidad de experto Alco.
                            contextParts.push({
                                text: `SISTEMA: No se encontraron fragmentos técnicos específicos para esta consulta en la base de datos vectorial.`
                            });
                        }
                    } catch (ragErr) {
                        console.error("[RAG ERROR]", ragErr);
                        contextParts.push({
                            text: `ERROR DEL SISTEMA RAG: No se pudo acceder a la búsqueda semántica. Responde cordialmente pero indica que no puedes consultar los manuales en este momento.`
                        });
                    }
                }
            }

            // 2. Construir payload final (Contexto + Imagen + Consulta)
            const parts: any[] = [...contextParts];

            if (attachedImage) {
                parts.push({ inlineData: { data: attachedImage.data, mimeType: attachedImage.mime } });
            }

            parts.push({ text: input || 'Analiza esta situación técnica.' });

            // 3. Obtener Instrucción de Sistema
            const systemInstruction = getKBSystemContext(kbDocs);

            let responseText = "";

            const callModelWithRetry = async (modelName: string, maxRetries = 3) => {
                let lastErr: any = null;
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        const model = genAI.getGenerativeModel({
                            model: modelName,
                            systemInstruction,
                            generationConfig: {
                                temperature: 0,
                                topK: 1,
                                topP: 1,
                            },
                        } as any);
                        
                        // Aumentamos el timeout para documentos pesados
                        const timeoutLimit = i === 0 ? 90000 : 120000;
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("TIMEOUT")), timeoutLimit)
                        );
                        
                        const result = await Promise.race([
                            model.generateContent(parts),
                            timeoutPromise
                        ]) as any;
                        const response = await result.response;
                        return response.text();
                    } catch (err: any) {
                        lastErr = err;
                        const isSaturated = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('demand');
                        const isTimeout = err.message === "TIMEOUT";

                        console.warn(`[IA Retry ${i+1}/${maxRetries}] Failure:`, err.message);

                        if ((!isSaturated && !isTimeout) || i === maxRetries - 1) throw err;
                        
                        // Espera progresiva antes de reintentar (2s, 4s, 6s)
                        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                    }
                }
                throw lastErr;
            };

            try {
                responseText = await callModelWithRetry("gemini-flash-latest");
            } catch (err1: any) {
                console.warn("Flash failed, trying Pro/Alternative:", err1);

                const isSaturated = err1?.status === 503 || err1?.message?.includes('503') || err1?.status === 429 || err1?.message?.includes('429');

                if (isSaturated) {
                    // Try Lite version if main is saturated
                    responseText = await callModelWithRetry("gemini-2.5-flash-lite");
                } else {
                    throw err1;
                }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: responseText || 'He procesado tu solicitud.'
            }]);
            setAttachedImage(null);

        } catch (error: any) {
            console.error("AI Error:", error);

            let userFriendlyMessage = `⚠️ **Error de Sistema**\n\nNo pude procesar la solicitud.\n\n*Detalle:* ${error.message || 'Error desconocido'}`;

            const isSaturated = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('demand');
            const isQuota = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota');

            if (error.message === "API_KEY_MISSING") {
                userFriendlyMessage = `🛑 **Configuración Incompleta**\n\nFalta la API Key de IA. Contacta al administrador.`;
            } else if (error.message === "TIMEOUT") {
                userFriendlyMessage = `⏱️ **Tiempo de Espera Agotado**\n\nLa solicitud tomó demasiado. Revisa tu conexión e intenta de nuevo.\n\n_Nota: Si tienes documentos muy pesados activos, desactívalos._`;
                addNotification({ type: 'warning', title: 'IA Lenta', message: 'La solicitud tardó demasiado. Desactiva documentos para agilizar.' });
            } else if (isSaturated) {
                userFriendlyMessage = `⏳ **Servidores de Google Ocupados (503)**\n\nHay una demanda muy alta en este momento. Por favor, reintenta en unos segundos.`;
                addNotification({ type: 'warning', title: 'Servicio Ocupado', message: 'Alta demanda en los servidores de Google.' });
            } else if (isQuota) {
                userFriendlyMessage = `📉 **Límite de Cuota Alcanzado (429)**\n\nSe ha agotado el límite de peticiones gratuitas. Por favor espera un minuto.`;
                addNotification({ type: 'warning', title: 'Cuota Agotada', message: 'Límite de peticiones diarias/minuto excedido.' });
            } else if (!navigator.onLine) {
                userFriendlyMessage = `🔌 **Sin Conexión a Internet**\n\nDetecto que no tienes conexión a internet en tu equipo.`;
            } else if (error?.message?.includes('fetch')) {
                userFriendlyMessage = `📡 **Error de Red**\n\nHubo un fallo en la comunicación con los servidores. Revisa tu internet.`;
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
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        sources.current?.forEach(source => { try { source.stop(); } catch (e) { } });
        sources.current?.clear();
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
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

            const ctxIn = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctxOut = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            inputAudioContext.current = ctxIn;
            outputAudioContext.current = ctxOut;
            outputNode.current = ctxOut.createGain();
            outputNode.current.connect(ctxOut.destination);

            const host = "generativelanguage.googleapis.com";
            const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setVoiceStatus('connected');
                const setupMsg = {
                    setup: {
                        model: "models/gemini-flash-latest",
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                        },
                        systemInstruction: {
                            parts: [{ text: getSystemContext(false, location.pathname, activeAgent, kbDocs) }]
                        }
                    }
                };
                ws.send(JSON.stringify(setupMsg));

                const source = ctxIn.createMediaStreamSource(stream);
                const script = ctxIn.createScriptProcessor(4096, 1, 1);
                script.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                    const audioMsg = {
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "audio/pcm;rate=16000",
                                data: arrayBufferToBase64(int16.buffer)
                            }]
                        }
                    };
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(audioMsg));
                };
                source.connect(script);
                script.connect(ctxIn.destination);
                processorRef.current = script;
                sourceRef.current = source;
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const base64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64) {
                        setIsSpeaking(true);
                        const audioBuffer = await decodeAudioData(base64ToUint8Array(base64), ctxOut, 24000, 1);
                        const src = ctxOut.createBufferSource();
                        src.buffer = audioBuffer;
                        src.connect(outputNode.current!);
                        nextStartTime.current = Math.max(nextStartTime.current, ctxOut.currentTime);
                        src.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.current.add(src);
                        src.onended = () => {
                            sources.current.delete(src);
                            if (sources.current.size === 0) setIsSpeaking(false);
                        };
                    }
                } catch (e) { console.error("WS Parse Error", e); }
            };

            ws.onerror = (e) => {
                console.error("WebSocket Error:", e);
                setVoiceStatus('disconnected');
                addNotification({ type: 'error', title: 'Error de Conexión', message: 'Falló la conexión de voz.' });
            };

            ws.onclose = () => stopVoiceSession();

        } catch (err) {
            console.error("Voice Session Error:", err);
            setVoiceStatus('disconnected');
            setMessages(prev => [...prev, {
                id: 'err_voice',
                role: 'agent',
                content: `⚠️ **Error de Voz**\n\nNo se pudo conectar con el modo de voz en tiempo real.`
            }]);
        }
    };

    const activeKBCount = kbDocs.filter(d => d.active).length;

    return (
        <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end gap-4">
            {isAgentOpen && (
                <div className="bg-white dark:bg-[#111827] w-[420px] h-[640px] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/[0.06] flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right backdrop-blur-xl">
                    {/* HEADER */}
                    <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 space-y-3 flex-shrink-0">
                        <div className="flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md text-yellow-300">
                                    <SparklesIcon />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wide">Agente Calidad</h3>
                                    <p className="text-[10px] text-indigo-100 opacity-90 font-medium flex items-center gap-1.5">
                                        {voiceStatus === 'connected' ? '🎙️ Voz Activa' : '🟢 Online'}
                                        {activeKBCount > 0 && (
                                            <span className="bg-emerald-500/30 border border-emerald-400/40 px-1.5 py-0.5 rounded-md text-emerald-200 text-[9px] font-black">
                                                📄 {activeKBCount} doc{activeKBCount > 1 ? 's' : ''} activo{activeKBCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* KB Toggle */}
                                <button
                                    onClick={() => setShowKBPanel(!showKBPanel)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${showKBPanel ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100' : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'}`}
                                    title="Base de Conocimiento"
                                >
                                    <BookIcon />
                                </button>
                                {/* Web Search */}
                                <button
                                    onClick={() => setUseGoogleSearch(!useGoogleSearch)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${useGoogleSearch ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100' : 'bg-white/10 border-white/20 text-white/60'}`}
                                    title="Búsqueda Web"
                                >
                                    <GlobeIcon />
                                </button>
                                {/* Voice */}
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
                        {/* AGENT PERSONAS */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

                    {/* KNOWLEDGE BASE PANEL */}
                    {showKBPanel && (
                        <KBPanel 
                            docs={kbDocs} 
                            loading={kbLoading} 
                            onToggle={handleToggleKBDoc} 
                            onSync={syncManuals}
                            isSyncing={isProcessing}
                            fragmentCount={kbFragmentCount}
                        />
                    )}

                    {/* ACTIVE DOCUMENT INDICATOR */}
                    {activeDocument && (
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className='text-xl'>📄</span>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Documento Activo (Biblioteca)</span>
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate max-w-[220px]">{activeDocument.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setActiveDocument(null)} className="text-indigo-400 hover:text-indigo-600 p-1 flex-shrink-0">
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
                                        <div className={`max-w-[92%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                                                : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-200 rounded-tl-sm border border-slate-100 dark:border-white/[0.06]'
                                            }`}>
                                            <div className="prose dark:prose-invert prose-xs max-w-none">
                                                <ReactMarkdown>{m.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="bg-white dark:bg-white/[0.04] p-4 rounded-3xl rounded-tl-sm border border-slate-100 dark:border-white/[0.06] flex flex-col gap-2 shadow-sm">
                                            <div className="flex gap-2 items-center">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                            {activeKBCount > 0 && (
                                                <span className="text-[10px] text-indigo-400 font-bold italic animate-pulse">
                                                    Analizando {activeKBCount} manual(es) técnico(s)...
                                                </span>
                                            )}
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
                                                <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-black/20 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors">
                                                    <LinkIcon /> {source.title.substring(0, 25)}...
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                                <div className="relative">
                                    <div className={`absolute inset-0 bg-indigo-500 rounded-full opacity-20 blur-xl transition-all duration-1000 ${isSpeaking ? 'scale-150' : 'scale-100'}`} />
                                    <div className={`relative w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'border-indigo-500 bg-indigo-50 dark:bg-white/10 scale-110' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04]'}`}>
                                        <div className={`text-3xl ${isSpeaking ? 'text-indigo-500 animate-pulse' : 'text-slate-300 dark:text-slate-600'}`}>
                                            <MicrophoneIcon />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-lg font-bold dark:text-white">{isSpeaking ? 'Escuchando...' : 'Modo Conversación'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[220px] mx-auto">Habla naturalmente. El Agente puede escucharte y responder con voz.</p>
                                </div>
                                <button onClick={voiceStatus === 'connected' ? stopVoiceSession : startVoiceSession}
                                    className={`px-6 py-3 rounded-full font-bold text-xs shadow-lg transition-transform active:scale-95 ${voiceStatus === 'connected' ? 'bg-rose-500 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/40'}`}>
                                    {voiceStatus === 'connected' ? 'Desconectar Voz' : 'Iniciar Sesión de Voz'}
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* FOOTER */}
                    {mode === 'text' && (
                        <div className="p-3 bg-white dark:bg-[#111827] border-t border-slate-100 dark:border-white/[0.04] flex-shrink-0">
                            {attachedImage && (
                                <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    <CameraIcon /> Imagen adjunta
                                    <button onClick={() => setAttachedImage(null)} className="ml-auto hover:text-rose-500"><XCircleIcon /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-indigo-500 bg-slate-50 dark:bg-white/[0.04] rounded-xl transition-colors flex-shrink-0">
                                    <CameraIcon />
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <input
                                    className="flex-grow bg-slate-50 dark:bg-white/[0.04] border border-transparent focus:border-indigo-500/40 focus:ring-0 rounded-xl px-4 py-2.5 text-sm transition-all dark:text-white placeholder:text-slate-400 outline-none"
                                    placeholder={activeKBCount > 0 ? `Consulta con ${activeKBCount} doc(s) activo(s)...` : "Escribe tu consulta..."}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isProcessing || (!input && !attachedImage)}
                                    className="p-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl disabled:opacity-50 hover:shadow-indigo-500/30 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex-shrink-0"
                                >
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
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-2xl transition-all duration-300 z-50
                    ${isAgentOpen
                        ? 'bg-slate-800 text-white rotate-90 scale-90'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-110 hover:shadow-indigo-500/50 animate-bounce-subtle'
                    }`}
            >
                {isAgentOpen ? <XCircleIcon /> : <RobotIcon />}
            </button>
        </div>
    );
};

export default AgentHub;
