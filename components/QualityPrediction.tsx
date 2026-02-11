
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import Breadcrumbs from './Breadcrumbs';
import { MOCK_PREDICTIVE_METRICS, ExclamationTriangleIcon, CheckCircleIcon, ChartLineIcon, IndustryIcon, RobotIcon } from '../constants';
import type { PredictiveAlert, LineRiskProfile } from '../types';

const QualityPrediction: React.FC = () => {
    // State for Real-time Simulation
    const [metrics, setMetrics] = useState(MOCK_PREDICTIVE_METRICS);
    const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
    const [lines, setLines] = useState<LineRiskProfile[]>([
        { lineId: 'L1', lineName: 'Línea de Corte #1', riskScore: 15, topRiskFactor: 'None', status: 'Safe' },
        { lineId: 'L2', lineName: 'Troqueladora Automática', riskScore: 85, topRiskFactor: 'Vibración Hidráulica', status: 'Critical' },
        { lineId: 'L3', lineName: 'Cabina Pintura', riskScore: 45, topRiskFactor: 'Humedad Relativa', status: 'Warning' },
    ]);
    const [isSimulating, setIsSimulating] = useState(false);

    // Simulation Effect
    useEffect(() => {
        let interval: any;
        if (isSimulating) {
            interval = setInterval(() => {
                // 1. Update Metrics (Random Walk)
                setMetrics(prev => {
                    const last = prev[prev.length - 1];
                    const newValue = Math.min(100, Math.max(0, last.value + (Math.random() - 0.45) * 5));
                    const newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const newEntry = { timestamp: newTime, value: newValue, threshold: 80, predicted: true };
                    return [...prev.slice(1), newEntry];
                });

                // 2. Trigger Alerts
                setLines(prev => prev.map(line => {
                    if (line.lineId === 'L2') {
                        // Simulate increasing risk for L2
                        const newRisk = Math.min(99, line.riskScore + (Math.random() > 0.3 ? 2 : -1));
                        if (newRisk > 80 && !alerts.find(a => a.lineId === 'L2')) {
                            const newAlert: PredictiveAlert = {
                                id: Date.now().toString(),
                                severity: 'Critical',
                                message: 'Riesgo inminente de micro-fisuras por vibración.',
                                timestamp: new Date().toLocaleTimeString(),
                                recommendedAction: 'Detener y calibrar eje Z inmediatamente.',
                                lineId: 'L2'
                            };
                            setAlerts(curr => [newAlert, ...curr]);
                        }
                        return { ...line, riskScore: newRisk, status: newRisk > 80 ? 'Critical' : newRisk > 50 ? 'Warning' : 'Safe' };
                    }
                    return line;
                }));

            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isSimulating, alerts]);

    const getRiskColor = (score: number) => {
        if (score < 50) return 'bg-green-500';
        if (score < 80) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <Breadcrumbs crumbs={[{ label: 'Calidad', path: '/quality' }, { label: 'Predicción' }]} />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 flex items-center gap-2">
                        <ChartLineIcon /> Calidad Predictiva (IoT)
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Monitoreo en tiempo real y detección temprana de anomalías.
                    </p>
                </div>
                <button 
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all shadow-md ${isSimulating ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                >
                    {isSimulating ? '🛑 Detener Simulación' : '▶️ Simular IoT Data'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Heatmap */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Riesgo por Línea</h2>
                    <div className="space-y-4">
                        {lines.map(line => (
                            <div key={line.lineId} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                                <div className="flex justify-between items-start z-10 relative">
                                    <div>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{line.lineName}</h3>
                                        <p className="text-xs text-slate-500">{line.topRiskFactor}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold text-white ${getRiskColor(line.riskScore)}`}>
                                        {line.riskScore}% Riesgo
                                    </div>
                                </div>
                                {/* Progress Bar Background */}
                                <div className="absolute bottom-0 left-0 h-1 bg-slate-200 w-full">
                                    <div className={`h-full transition-all duration-500 ${getRiskColor(line.riskScore)}`} style={{ width: `${line.riskScore}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Tendencia de Vibración (Troqueladora)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                                <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" label="Límite Crítico" />
                                <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Smart Alerts Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <RobotIcon /> Alertas Inteligentes de Calidad
                </h2>
                {alerts.length === 0 ? (
                    <div className="text-center p-8 text-slate-400">
                        <CheckCircleIcon />
                        <p className="mt-2">Sin alertas predictivas activas.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <div key={alert.id} className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg animate-fade-in">
                                <div className="text-red-500 text-xl mt-1">
                                    <ExclamationTriangleIcon />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-red-800 dark:text-red-300">Alerta de Probabilidad de Falla</h3>
                                        <span className="text-xs text-red-600 dark:text-red-400 font-mono">{alert.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">{alert.message}</p>
                                    <div className="mt-3 bg-white dark:bg-slate-800 p-3 rounded border border-red-200 dark:border-red-800/50 flex items-center gap-2">
                                        <IndustryIcon />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Acción Recomendada: {alert.recommendedAction}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QualityPrediction;
