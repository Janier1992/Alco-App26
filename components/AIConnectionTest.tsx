import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

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

            addLog('Inicializando cliente GoogleGenerativeAI...');
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

            addLog('Enviando solicitud a gemini-1.5-flash...');
            const response = await model.generateContent('Responde solo con la palabra: CONECTADO');

            addLog('Respuesta recibida.');
            addLog(`Texto: ${response.response.text()}`);
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white text-black p-8 border-8 border-red-600 rounded-3xl shadow-2xl w-[500px] font-mono text-sm relative animate-pulse">
                <button
                    onClick={() => setStatus('CERRADO')}
                    className="absolute top-2 right-2 text-red-500 font-bold border border-red-500 px-2 rounded hover:bg-red-50"
                >
                    CERRAR DIAGNÓSTICO
                </button>

                {status === 'CERRADO' ? null : (
                    <>
                        <h1 className="text-2xl font-black mb-6 bg-red-100 p-4 text-center text-red-700 uppercase tracking-widest">
                            ⚠️ MODO DIAGNÓSTICO ACTIVO ⚠️
                        </h1>

                        <button
                            onClick={testConnection}
                            className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-lg hover:bg-blue-700 mb-6 shadow-lg transform transition-transform active:scale-95"
                        >
                            INICIAR PRUEBA DE CONEXIÓN
                        </button>

                        <div className="font-bold mb-2 text-lg">Estado: <span className="text-blue-600">{status}</span></div>

                        <div className="bg-gray-50 p-4 h-64 overflow-y-auto border-2 border-gray-200 rounded-xl font-mono text-xs">
                            {logs.map((log, i) => (
                                <div key={i} className="border-b border-gray-200 py-1.5">{log}</div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AIConnectionTest;
