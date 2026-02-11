
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MicrophoneIcon, RefreshIcon } from '../constants';
import { useNotification } from './NotificationSystem';

interface TranscriptionButtonProps {
    onTranscription: (text: string) => void;
    className?: string;
    smartMode?: boolean;
}

const TranscriptionButton: React.FC<TranscriptionButtonProps> = ({ onTranscription, className, smartMode = false }) => {
    const { addNotification } = useNotification();
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return addNotification({ type: 'error', title: 'NAVEGADOR NO COMPATIBLE', message: 'Su navegador no soporta captura de audio.' });
        }

        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            addNotification({ type: 'info', title: 'ESCUCHANDO', message: 'Dictado técnico en curso...' });
        } catch (err: any) {
            console.error("Error al acceder al micrófono:", err);
            let errorMessage = 'Ocurrió un error al intentar acceder al micrófono.';
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.includes('device not found')) {
                errorMessage = 'No se encontró ningún micrófono conectado o habilitado en su dispositivo.';
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Debe permitir el uso del micrófono en su navegador para usar esta función.';
            }
            addNotification({ type: 'error', title: 'FALLO DE HARDWARE', message: errorMessage });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscription = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'audio/webm',
                                    data: base64Audio,
                                },
                            },
                            {
                                text: smartMode
                                    ? "Actúa como un asistente de llenado de formularios de calidad. Extrae los datos técnicos del audio y devuélvelos en formato JSON estricto (sin markdown) con las siguientes claves si se mencionan: 'op', 'areaProceso', 'planoOpc', 'cantTotal' (número), 'defecto', 'estado', 'observacion'. Si no hay datos claros, devuelve un JSON con la clave 'observacion' que contenga el texto transcrito."
                                    : "Actúa como transcriptor experto en manufactura. Transcribe este audio exactamente. Si hay errores gramaticales o de dicción, corrígelos para que suenen técnicos y profesionales. Devuelve solo el texto final."
                            },
                        ],
                    },
                });

                const transcribedText = response.text || "";
                if (transcribedText.trim()) {
                    onTranscription(transcribedText);
                    addNotification({ type: 'success', title: 'DICTADO PROCESADO', message: 'Texto integrado en el formulario.' });
                } else {
                    addNotification({ type: 'warning', title: 'AUDIO NO CLARO', message: 'No se detectó voz clara en el dictado.' });
                }
                setIsTranscribing(false);
            };
        } catch (error) {
            console.error("Error en transcripción IA:", error);
            addNotification({ type: 'error', title: 'FALLO TRANSCRIPCIÓN', message: 'El motor Gemini no pudo procesar el audio.' });
            setIsTranscribing(false);
        }
    };

    return (
        <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`flex items-center justify-center transition-all p-3 rounded-2xl ${isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-[#5d5fef] hover:bg-slate-200 dark:hover:bg-slate-600'
                } ${isTranscribing ? 'opacity-50 cursor-wait' : 'hover:scale-110 active:scale-95'} ${className}`}
            title={isRecording ? "Detener Dictado" : "Iniciar Dictado por Voz"}
        >
            {isTranscribing ? (
                <RefreshIcon className="animate-spin text-lg" />
            ) : (
                <MicrophoneIcon />
            )}
        </button>
    );
};

export default TranscriptionButton;
