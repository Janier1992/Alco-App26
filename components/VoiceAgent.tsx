
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { MOCK_LOTS, INITIAL_MAINTENANCE_TASKS, MOCK_WASTE_DATA } from '../constants';

// --- Audio Utils (Encoding/Decoding) ---

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

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Context Generator ---
const getSystemContext = () => {
    const criticalMaintenance = INITIAL_MAINTENANCE_TASKS.filter(t => t.priority === 'Crítica').length;
    const waste = MOCK_WASTE_DATA.reduce((acc, curr) => acc + curr.quantityKg, 0);
    
    return `
    Eres el Asistente de Voz Inteligente de "Alco Suite", una plataforma de manufactura.
    
    TU ROL:
    Ayudar a operarios y gerentes con información rápida sobre la planta.
    
    INFORMACIÓN ACTUALIZADA DE LA PLANTA:
    - Estado General: Operativo Normal.
    - OEE Global: 84.2%
    - Calidad (FTQ): 96.5%
    - Mantenimiento: Hay ${criticalMaintenance} órdenes críticas pendientes.
    - Medio Ambiente: ${waste} kg de residuos generados este mes.
    - Últimos Lotes: ${MOCK_LOTS.slice(0,2).map(l => l.id + ' (' + l.currentStage + ')').join(', ')}.
    
    INSTRUCCIONES:
    1. Responde de forma breve y conversacional (ideal para voz).
    2. Si te preguntan algo técnico, da una respuesta resumida.
    3. Si te preguntan por un dato que no tienes, di que no tienes acceso a ese sensor específico.
    `;
};

const VoiceAgent: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    const nextStartTime = useRef<number>(0);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const outputNode = useRef<GainNode | null>(null);
    const sources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const sessionPromise = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopSession = () => {
        if (sources.current) {
            sources.current.forEach(source => {
                try { source.stop(); } catch(e) {}
            });
            sources.current.clear();
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (processorRef.current) {
             try {
                processorRef.current.disconnect();
             } catch(e) {}
             processorRef.current = null;
        }

        if (sourceRef.current) {
            try {
                sourceRef.current.disconnect();
            } catch(e) {}
            sourceRef.current = null;
        }

        if (inputAudioContext.current) {
            inputAudioContext.current.close().catch(() => {});
            inputAudioContext.current = null;
        }
        if (outputAudioContext.current) {
            outputAudioContext.current.close().catch(() => {});
            outputAudioContext.current = null;
        }
        
        sessionPromise.current = null;

        setIsActive(false);
        setStatus('disconnected');
        setIsSpeaking(false);
    };

    const startSession = async () => {
        setErrorMessage(null);
        try {
            setStatus('connecting');
            setIsActive(true);
            
            // 1. Check Browser Support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                 throw new Error("Navegador no compatible o contexto no seguro (HTTPS requerido).");
            }

            // 2. Initialize AI Client
            // FIX: Obtain API key directly from process.env.API_KEY.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // 3. Capture Microphone (Robust Method)
            let stream: MediaStream | null = null;
            try {
                // Try with preferred constraints
                stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
            } catch (err: any) {
                console.warn("Preferred mic config failed, retrying with defaults...", err);
                
                // Specific Error Handling
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                     throw new Error("Permiso denegado. Habilite el micrófono en el navegador.");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                     throw new Error("No se encontró ningún micrófono conectado.");
                }
                
                // Fallback: Try simplest audio constraint
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (retryErr) {
                    console.error("Fallback mic access failed:", retryErr);
                    throw new Error("No se pudo acceder al micrófono. Verifique que esté conectado y habilitado.");
                }
            }
            
            if (!stream) throw new Error("No se pudo establecer el flujo de audio.");
            streamRef.current = stream;

            // 4. Initialize Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            
            // Use default sample rate of the system to avoid resampling issues
            inputAudioContext.current = new AudioContextClass(); 
            outputAudioContext.current = new AudioContextClass({ sampleRate: 24000 }); // Gemini output is 24k
            
            await inputAudioContext.current.resume();
            await outputAudioContext.current.resume();
            
            if(outputAudioContext.current) {
                outputNode.current = outputAudioContext.current.createGain();
                outputNode.current.connect(outputAudioContext.current.destination);
            }
            
            // 5. Connect to Gemini Live
            // FIX: Updated to the latest recommended Gemini Live model name.
            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: getSystemContext(),
                },
                callbacks: {
                    onopen: async () => {
                        console.log("Gemini Live Connected");
                        setStatus('connected');
                        
                        if (!inputAudioContext.current || !streamRef.current) return;
                        
                        // Use the actual sample rate of the context
                        const sourceRate = inputAudioContext.current.sampleRate;
                        
                        sourceRef.current = inputAudioContext.current.createMediaStreamSource(streamRef.current);
                        // Use buffer size 4096 for balance between latency and stability
                        processorRef.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
                        
                        processorRef.current.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            
                            // Convert Float32 (-1.0 to 1.0) to Int16
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                let s = Math.max(-1, Math.min(1, inputData[i]));
                                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }
                            
                            const pcmBlob: GenAIBlob = {
                                data: arrayBufferToBase64(int16.buffer),
                                mimeType: `audio/pcm;rate=${sourceRate}`
                            };

                            sessionPromise.current?.then(session => {
                                try {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                } catch(err) {
                                    console.error("Error sending audio chunk:", err);
                                }
                            });
                        };

                        sourceRef.current.connect(processorRef.current);
                        processorRef.current.connect(inputAudioContext.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        
                        if (base64Audio && outputAudioContext.current && outputNode.current) {
                            setIsSpeaking(true);
                            const ctx = outputAudioContext.current;
                            nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);

                            try {
                                const audioBuffer = await decodeAudioData(
                                    base64ToUint8Array(base64Audio),
                                    ctx,
                                    24000,
                                    1
                                );

                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNode.current);
                                
                                source.addEventListener('ended', () => {
                                    sources.current.delete(source);
                                    if (sources.current.size === 0) {
                                        setIsSpeaking(false);
                                    }
                                });

                                source.start(nextStartTime.current);
                                nextStartTime.current += audioBuffer.duration;
                                sources.current.add(source);
                            } catch (decErr) {
                                console.error("Audio decoding error:", decErr);
                            }
                        }
                        
                        if (message.serverContent?.interrupted) {
                            console.log("Model interrupted");
                            sources.current.forEach(s => { try { s.stop(); } catch(e) {} });
                            sources.current.clear();
                            nextStartTime.current = 0;
                            setIsSpeaking(false);
                        }
                    },
                    onclose: () => {
                        console.log("Gemini Live Closed");
                        if(isActive) stopSession();
                    },
                    onerror: (err) => {
                        console.error("Gemini Live Error", err);
                        setErrorMessage("Error de conexión con IA.");
                        stopSession();
                    }
                }
            });

        } catch (error: any) {
            console.error("Failed to start voice session:", error);
            setErrorMessage(error.message || "Error desconocido");
            stopSession();
        }
    };

    const toggleVoiceAgent = () => {
        if (isActive) {
            stopSession();
        } else {
            startSession();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1500] flex flex-col items-end gap-2">
            {isActive && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 mb-2 w-72 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                            <span className="relative flex h-3 w-3">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            </span>
                            Asistente Alco
                        </h3>
                        <button onClick={stopSession} className="text-slate-400 hover:text-red-500">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div className="h-20 bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden relative border border-slate-200 dark:border-slate-700">
                        {status === 'connecting' && (
                            <span className="text-xs text-slate-500 animate-pulse font-medium">Conectando...</span>
                        )}
                        {status === 'connected' && (
                            <>
                                {isSpeaking ? (
                                    <div className="flex items-center gap-1 h-8">
                                        {[1,2,3,4,5].map(i => (
                                            <div key={i} className="w-1.5 bg-sky-500 rounded-full animate-bounce" style={{height: '60%', animationDelay: `${i * 0.1}s`}}></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mx-auto mb-1 animate-pulse">
                                            <i className="fas fa-microphone text-sky-600 dark:text-sky-400"></i>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Escuchando</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    
                    {errorMessage ? (
                         <p className="text-xs text-red-500 mt-2 text-center font-medium bg-red-50 dark:bg-red-900/20 p-1 rounded">{errorMessage}</p>
                    ) : (
                         <p className="text-[10px] text-slate-400 mt-2 text-center px-2 leading-tight">
                            Habla naturalmente. Pregunta sobre OEE, calidad o mantenimiento.
                        </p>
                    )}
                </div>
            )}

            <button 
                onClick={toggleVoiceAgent}
                className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all transform hover:scale-110 border-4 border-white dark:border-slate-800 ${
                    isActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white'
                }`}
                title={isActive ? "Detener Asistente" : "Iniciar Asistente IA"}
            >
                {isActive ? <i className="fas fa-stop"></i> : <i className="fas fa-microphone"></i>}
            </button>
        </div>
    );
};

export default VoiceAgent;
