import React, { useState, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import {
    MOCK_SUPERVISOR_TASKS,
    CheckCircleIcon, ExclamationTriangleIcon, ClipboardListIcon,
    BrainIcon, LightbulbIcon, GraduationCapIcon, ChevronRightIcon,
    RobotIcon
} from '../constants';
import type { SupervisorTask, OperationalInsight } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { supabase } from '../insforgeClient';
import { useNotification } from './NotificationSystem';

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    const styles = {
        'High': 'bg-red-100 text-red-700 border-red-200',
        'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
        'Low': 'bg-green-100 text-green-700 border-green-200'
    };
    return (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles[priority as keyof typeof styles]}`}>
            {priority === 'High' ? 'Alta' : priority === 'Medium' ? 'Media' : 'Baja'}
        </span>
    );
};

const ISOCard: React.FC<{ reference: SupervisorTask['isoReference'], onClose: () => void }> = ({ reference, onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border-l-8 border-sky-600">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-sky-800 dark:text-sky-400 flex items-center gap-2">
                    <GraduationCapIcon /> Contexto Normativo ISO
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6">
                <div className="mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase">Cláusula ISO 9001:2015</span>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{reference?.clause}</p>
                </div>
                <div className="mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase">¿Por qué es importante?</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 italic leading-relaxed">"{reference?.explanation}"</p>
                </div>
                <button onClick={onClose} className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors">
                    Entendido
                </button>
            </div>
        </div>
    </div>
);

const OperationalIntelligence: React.FC = () => {
    const { addNotification } = useNotification();
    const [tasks, setTasks] = useState(MOCK_SUPERVISOR_TASKS);
    const [insights, setInsights] = useState<OperationalInsight[]>([]);
    const [selectedISO, setSelectedISO] = useState<SupervisorTask['isoReference'] | null>(null);
    const [score, setScore] = useState(78); // Gamified Score
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoadingInsights(true);
        try {
            const { data, error } = await supabase
                .from('operational_insights')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                const mappedInsights: OperationalInsight[] = data.map(i => ({
                    id: i.id,
                    title: i.title,
                    description: i.description || '',
                    frequency: i.frequency || 'N/A',
                    correction: i.correction || ''
                }));
                setInsights(mappedInsights);
            } else {
                // If no data in DB, we could leave empty or fallback. 
                // For now, let's leave empty to encourage DB usage, 
                // or if the user prefers, we could insert defaults? 
                // Let's stick to empty but show a message or valid empty state.
            }

        } catch (error) {
            console.error('Error fetching insights:', error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar los insights.' });
        } finally {
            setLoadingInsights(false);
        }
    };

    const handleCompleteTask = (id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Done' } : t));
        setScore(prev => Math.min(100, prev + 5)); // Reward
    };

    const generateAiInsights = async () => {
        setIsGenerating(true);
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || 'YOUR_API_KEY';
            const ai = new GoogleGenAI({ apiKey });
            const pendingParams = tasks.filter(t => t.status === 'Pending').map(t => t.title).join(', ');
            const prompt = `Actúa como Supervisor Senior de Calidad. Tengo un Score de Cumplimiento de ${score}/100.
            Tareas pendientes críticas: ${pendingParams}.
            Genera 3 recomendaciones operativas tácticas (muy breves y directas) para mejorar el turno.
            Usa formato Markdown con viñetas.`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash-001',
                contents: prompt
            });

            setAiRecommendations(response.text);
        } catch (error) {
            console.error(error);
            setAiRecommendations("⚠️ No pude conectar con el cerebro de operaciones. Verifica tu conexión.");
        } finally {
            setIsGenerating(false);
        }
    };

    const pendingTasks = tasks.filter(t => t.status === 'Pending');
    const completedTasks = tasks.filter(t => t.status === 'Done');
    const progress = (completedTasks.length / tasks.length) * 100;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <Breadcrumbs crumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Inteligencia Operativa' }]} />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 flex items-center gap-2">
                        <BrainIcon /> Supervisor Cockpit
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                        Tu asistente personal para priorizar, corregir y aprender. Mantén el orden operativo alineado con la norma.
                    </p>
                </div>

                {/* Gamified Score Card */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (score / 100) * 175.9} className={`transition-all duration-1000 ${score > 80 ? 'text-green-500' : score > 60 ? 'text-yellow-500' : 'text-red-500'}`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-xl dark:text-white">{score}</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Impacto en Calidad</p>
                        <p className="text-xs text-slate-500">Basado en cumplimiento normativo</p>
                    </div>
                </div>
            </div>

            {/* --- SECTION 1: THE MORNING BRIEF (Prioritization) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-sky-700 to-sky-900 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ClipboardListIcon /> Prioridades del Turno
                                </h2>
                                <p className="text-sky-100 text-sm mt-1">
                                    Completa estas acciones para asegurar el cumplimiento ISO.
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold">{pendingTasks.length}</span>
                                <p className="text-xs opacity-80 uppercase">Pendientes</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 w-full">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="p-2">
                            {tasks.map(task => (
                                <div key={task.id} className={`p-4 m-2 rounded-lg border transition-all ${task.status === 'Done' ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:shadow-md'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleCompleteTask(task.id)}
                                                disabled={task.status === 'Done'}
                                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'Done' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-500'}`}
                                            >
                                                {task.status === 'Done' && <i className="fas fa-check text-xs"></i>}
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold ${task.status === 'Done' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</h3>
                                                    <PriorityBadge priority={task.priority} />
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{task.description}</p>

                                                {/* Educational Micro-Interaction */}
                                                <button
                                                    onClick={() => setSelectedISO(task.isoReference || null)}
                                                    className="text-xs flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium hover:underline bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded w-fit"
                                                >
                                                    <GraduationCapIcon /> ¿Por qué hacer esto? (ISO {task.isoReference?.clause})
                                                </button>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            {task.estimatedTime}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {pendingTasks.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    <CheckCircleIcon />
                                    <p className="mt-2 font-medium">¡Todo al día! Gran trabajo de supervisión.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- SECTION 2: INTELLIGENT INSIGHTS (Correction & Learning) --- */}
                <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800/30">
                        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                            <LightbulbIcon /> Anomalías Recurrentes
                        </h2>
                        {loadingInsights ? (
                            <div className="text-center py-4 text-slate-500 text-sm">Cargando insights...</div>
                        ) : (
                            <div className="space-y-4">
                                {insights.length > 0 ? (
                                    insights.map(insight => (
                                        <div key={insight.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-l-4 border-amber-400">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{insight.title}</h4>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{insight.frequency}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{insight.description}</p>

                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                                                <i className="fas fa-info-circle mt-0.5"></i>
                                                <span>{insight.correction}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-500 text-xs">No hay anomalías registradas.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <RobotIcon /> Recomendaciones IA
                            </h2>
                            <button
                                onClick={generateAiInsights}
                                disabled={isGenerating}
                                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}
                            >
                                {isGenerating ? <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div> : <BrainIcon className="w-3 h-3" />}
                                {isGenerating ? 'Analizando...' : 'Generar'}
                            </button>
                        </div>
                        {aiRecommendations ? (
                            <div className="prose prose-sm dark:prose-invert text-xs text-slate-600 dark:text-slate-300">
                                <ReactMarkdown>{aiRecommendations}</ReactMarkdown>
                            </div>
                        ) : (
                            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 opacity-60">
                                <li className="flex gap-2">
                                    <i className="fas fa-arrow-right mt-1"></i>
                                    Solicita un análisis inteligente para ver recomendaciones personalizadas basadas en tus tareas pendientes.
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {selectedISO && <ISOCard reference={selectedISO} onClose={() => setSelectedISO(null)} />}
        </div>
    );
};

export default OperationalIntelligence;
