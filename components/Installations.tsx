
import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Breadcrumbs from './Breadcrumbs';
import {
    ConstructionIcon, ShieldCheckIcon, RobotIcon, RulerIcon,
    ExclamationTriangleIcon, DropIcon, SearchIcon,
    ChevronRightIcon, DownloadIcon, FileAltIcon, CheckCircleIcon,
    RefreshIcon
} from '../constants';
import { useNotification } from './NotificationSystem';

const Installations: React.FC = () => {
    const { addNotification } = useNotification();
    const [selectedTab, setSelectedTab] = useState<'standard' | 'checklist'>('standard');
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Checklist State
    const [checklist, setChecklist] = useState([
        { id: '1', text: 'Vanos rectos y a plomo (Tolerancia +/- 5mm)', completed: null },
        { id: '2', text: 'Ubicación de anclajes cada 70cm máximo', completed: null },
        { id: '3', text: 'Uso de cuñas plásticas (Prohibición de madera)', completed: null },
        { id: '4', text: 'Cordón de silicona perimetral uniforme (min 6mm)', completed: null },
        { id: '5', text: 'Limpieza de perfiles sin rastro de mortero', completed: null },
        { id: '6', text: 'Fijación mecánica verificada según NSR-10', completed: null },
    ]);

    const handleAiConsult = async () => {
        if (!aiQuery.trim()) return;
        setIsAiLoading(true);
        addNotification({ type: 'info', title: 'CONSULTOR IA', message: 'Analizando requerimiento técnico de obra...' });

        try {
            const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Actúa como Experto en Instalaciones Alco. Pregunta: "${aiQuery}". 
            Responde de forma técnica citando NSR-10 o estándares de estanqueidad si aplica. Sé breve.`;
            const response = await model.generateContent(prompt);

            // Simulamos respuesta en modal o alerta por ahora
            alert(`DICTAMEN IA: ${response.response.text()}`);
            setAiQuery('');
        } catch (e) {
            addNotification({ type: 'error', title: 'FALLO IA', message: 'No se pudo procesar la consulta técnica.' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleCheck = (id: string, value: boolean) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: value } : item));
    };

    const progress = Math.round((checklist.filter(i => i.completed !== null).length / checklist.length) * 100);

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'OPERACIONES', path: '/dashboard' }, { label: 'SOPORTE OBRAS COBE' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Soporte <span className="text-emerald-500">Obras</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest flex items-center gap-2"><ShieldCheckIcon /> Aseguramiento de Estándares COBE Alco</p>
                </div>
                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-alco-surface rounded-2xl border dark:border-white/5 shadow-sm">
                    <button onClick={() => setSelectedTab('standard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTab === 'standard' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Estándar Alco</button>
                    <button onClick={() => setSelectedTab('checklist')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTab === 'checklist' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Validación QA</button>
                </div>
            </div>

            {selectedTab === 'standard' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white dark:bg-alco-surface p-10 rounded-[3.5rem] border-l-8 border-emerald-500 shadow-xl border dark:border-white/5">
                            <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3"><RulerIcon className="text-emerald-500" /> Límites Técnicos Críticos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[
                                    { label: 'Tolerancia Vanos', value: '+/- 5mm', desc: 'Máximo 10mm total.' },
                                    { label: 'Anclajes', value: 'Máximo 70cm', desc: 'Fijación obligatoria NSR-10.' }
                                ].map((limit, i) => (
                                    <div key={i} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 transition-all hover:bg-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{limit.label}</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">{limit.value}</p>
                                        <p className="text-xs text-slate-500 italic">{limit.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-950 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute -right-10 -bottom-10 opacity-10"><RobotIcon className="text-[12rem] text-emerald-500" /></div>
                            <h4 className="text-sm font-black text-emerald-400 uppercase mb-4 tracking-widest flex items-center gap-2"><i className="fas fa-microchip" /> Consultor IA en Obra</h4>
                            <p className="text-slate-400 text-sm leading-relaxed italic max-w-xl">"Realice consultas técnicas sobre normatividad o protocolos de instalación."</p>
                            <div className="mt-8 flex gap-4">
                                <input
                                    className="flex-grow p-4 bg-white/5 border border-white/10 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="¿PREGUNTA TÉCNICA?..."
                                    value={aiQuery}
                                    onChange={e => setAiQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAiConsult()}
                                />
                                <button onClick={handleAiConsult} disabled={isAiLoading} className="px-6 py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-all">
                                    {isAiLoading ? <RefreshIcon className="animate-spin" /> : <ChevronRightIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[3rem] border border-rose-100 dark:border-rose-900/30">
                            <h3 className="text-lg font-black text-rose-700 dark:text-rose-400 uppercase mb-6 flex items-center gap-2"><ExclamationTriangleIcon /> Prohibiciones</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3"><div className="size-5 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black">!</div><p className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-snug">Uso de cuñas de madera.</p></li>
                                <li className="flex gap-3"><div className="size-5 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black">!</div><p className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-snug">Silicona en superficies húmedas.</p></li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in-up space-y-8">
                    <div className="bg-white dark:bg-alco-surface rounded-[4rem] border dark:border-white/5 shadow-xl overflow-hidden">
                        <div className="p-10 border-b dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Checklist QA: Liberación de Vano</h3>
                            <button onClick={() => setChecklist(checklist.map(i => ({ ...i, completed: null })))} className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"><RefreshIcon className="scale-75" /> Reiniciar</button>
                        </div>
                        <div className="p-4">
                            {checklist.map(item => (
                                <div key={item.id} className="p-6 border-b dark:border-white/5 last:border-none flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <div className="flex gap-5 items-center">
                                        <div className={`size-10 rounded-xl flex items-center justify-center text-lg ${item.completed === true ? 'bg-emerald-500 text-white' : item.completed === false ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-300'}`}>
                                            {item.completed === true ? <CheckCircleIcon /> : item.completed === false ? <ExclamationTriangleIcon /> : <i className="far fa-circle"></i>}
                                        </div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">{item.text}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCheck(item.id, true)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${item.completed === true ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>Conforme</button>
                                        <button onClick={() => handleCheck(item.id, false)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${item.completed === false ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>Falla</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-10 bg-slate-50 dark:bg-white/5 flex justify-end">
                            <button onClick={() => addNotification({ type: 'success', title: 'REGISTRO GUARDADO', message: 'Liberación de obra cargada al sistema.' })} className="px-12 py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">Firmar Liberación</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Installations;
