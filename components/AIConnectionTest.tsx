import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const AIConnectionTest: React.FC = () => {
    const [status, setStatus] = useState<string>('Esperando acción...');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const testConnection = async () => {
        setStatus('Probando conexión...');
        setLogs([]);

        try {
            const apiKey = process.env.API_KEY;
            addLog(`API Key detectada: ${apiKey ? 'SÍ (' + apiKey.length + ' chars)' : 'NO'}`);

            if (!apiKey) {
                setStatus('FALLO: No hay API Key');
                return;
            }

            addLog('Inicializando cliente GoogleGenAI...');
            const ai = new GoogleGenAI({ apiKey });

            addLog('Enviando solicitud a gemini-1.5-flash...');
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [{ text: 'Responde solo con la palabra: CONECTADO' }] }
            });

            addLog('Respuesta recibida.');
            addLog(`Texto: ${response.text}`);
            setStatus('ÉXITO: Conexión establecida.');

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR: Ver logs');
            addLog(`Error Message: ${error.message}`);
            addLog(`Error Name: ${error.name}`);
            if (error.cause) addLog(`Cause: ${JSON.stringify(error.cause)}`);
        }
    };

    return (
        <div className="fixed top-20 left-20 z-[9999] bg-white text-black p-6 border-4 border-red-500 rounded-xl shadow-2xl w-96 font-mono text-xs">
            <h1 className="text-xl font-bold mb-4 bg-red-100 p-2">DIAGNÓSTICO DE IA</h1>

            <button
                onClick={testConnection}
                className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 mb-4"
            >
                PROBAR CONEXIÓN AHORA
            </button>

            <div className="font-bold mb-2">Estado: {status}</div>

            <div className="bg-gray-100 p-2 h-48 overflow-y-auto border border-gray-300">
                {logs.map((log, i) => (
                    <div key={i} className="border-b border-gray-200 py-1">{log}</div>
                ))}
            </div>

            <div className="mt-4 text-gray-500 text-[10px]">
                Build ID: {Date.now()}
            </div>
        </div>
    );
};

export default AIConnectionTest;
