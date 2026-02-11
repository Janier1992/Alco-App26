
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { NonConformity, NCSeverity, NCStatus, CAPAAction } from '../types';
import Breadcrumbs from './Breadcrumbs';
import {
    ExclamationTriangleIcon, PlusIcon,
    BrainIcon, SaveIcon, RobotIcon, ClipboardCheckIcon,
    TrashIcon, EditIcon, AREAS_PROCESO, RefreshIcon,
    SparklesIcon,
    ChevronRightIcon, CalendarIcon, UserCircleIcon
} from '../constants';
import { useNotification } from './NotificationSystem';
import ReactMarkdown from 'react-markdown';



const NonConformities: React.FC = () => {
    const { addNotification } = useNotification();
    const [ncs, setNcs] = useState<NonConformity[]>(() => {
        const saved = localStorage.getItem('alco_ncs_v2');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // CAPA Action Inputs
    const [newActionDesc, setNewActionDesc] = useState('');
    const [newActionResp, setNewActionResp] = useState('');

    useEffect(() => {
        localStorage.setItem('alco_ncs_v2', JSON.stringify(ncs));
    }, [ncs]);

    const handleCreateNC = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const id = `NC-25-${(ncs.length + 1).toString().padStart(3, '0')}`;
        const nc: NonConformity = {
            id,
            title: (formData.get('title') as string).toUpperCase(),
            process: formData.get('process') as string,
            project: formData.get('project') as string,
            severity: formData.get('severity') as NCSeverity,
            description: formData.get('description') as string,
            status: 'Abierta',
            actions: [],
            createdAt: new Date().toISOString().split('T')[0],
            rca: { why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '' },
            history: [
                {
                    id: Date.now().toString(),
                    date: new Date().toLocaleString(),
                    user: 'USUARIO ACTUAL', // En auth real sería el user logueado
                    action: 'APERTURA',
                    details: 'Creación inicial del hallazgo'
                }
            ]
        };
        setNcs([nc, ...ncs]);
        setIsCreateModalOpen(false);
        addNotification({ type: 'success', title: 'HALLAZGO ABIERTO', message: `No Conformidad ${id} registrada para seguimiento.` });
    };

    const logHistory = (nc: NonConformity, action: string, details: string): NonConformity => {
        const newEvent: any = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(),
            user: 'USUARIO ACTUAL',
            action,
            details
        };
        return { ...nc, history: [...(nc.history || []), newEvent] };
    };

    const handleAddCapaAction = () => {
        if (!selectedNC || !newActionDesc.trim()) return;
        const newAction: CAPAAction = {
            id: `CAPA-${Date.now()}`,
            description: newActionDesc.toUpperCase(),
            responsible: newActionResp.toUpperCase(),
            dueDate: new Date().toISOString().split('T')[0],
            completed: false
        };
        // Add action and log history
        let updated = { ...selectedNC, actions: [...selectedNC.actions, newAction] };
        updated = logHistory(updated, 'NUEVA ACCIÓN', `Se asignó acción a ${newAction.responsible}: ${newAction.description}`);

        handleUpdateNC(updated);
        setNewActionDesc('');
        setNewActionResp('');
    };

    const handleToggleCapaAction = (actionId: string) => {
        if (!selectedNC) return;
        const updated = {
            ...selectedNC,
            actions: selectedNC.actions.map(a => a.id === actionId ? { ...a, completed: !a.completed } : a)
        };
        handleUpdateNC(updated);
    };

    const handleUpdateNC = (updated: NonConformity) => {
        setNcs(prev => prev.map(nc => nc.id === updated.id ? updated : nc));
        setSelectedNC(updated);
    };

    const handleAISuggestion = async () => {
        // if (!selectedNC?.rca?.why1) return addNotification({ type: 'warning', title: 'FALTA CONTEXTO', message: 'Defina al menos el primer "¿Por qué?" para el análisis.' });
        setIsGeneratingAI(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analiza la No Conformidad: "${selectedNC.title}". Proceso: ${selectedNC.process}. Descripción del Problema: "${selectedNC.description}". Determina la causa raíz técnica final y sugiere un plan de acción correctivo de 3 pasos (CAPA). Formato: Markdown técnico Alco Proyectos.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            handleUpdateNC({ ...selectedNC, rca: { ...selectedNC.rca!, aiSuggestedRootCause: response.text } });
            addNotification({ type: 'success', title: 'DICTAMEN IA LISTO', message: 'Análisis RCA incorporado al expediente.' });
        } catch (e) {
            addNotification({ type: 'error', title: 'ERROR IA', message: 'Fallo en la conexión con el motor RCA.' });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none uppercase transition-all placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <Breadcrumbs crumbs={[{ label: 'Sección II: Mejora', path: '/dashboard' }, { label: 'GESTIÓN DE MEJORA' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Gestión de <span className="text-rose-600">Mejora</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 italic">
                        <ExclamationTriangleIcon className="text-rose-600" /> Panel de No Conformidades y Análisis RCA Asistido por IA
                    </p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto px-10 py-5 bg-rose-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all">
                    + Abrir Nuevo Hallazgo
                </button>
            </div>

            {/* VISTA MÓVIL: TARJETAS */}
            <div className="md:hidden space-y-4">
                {ncs.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 dark:bg-alco-surface rounded-3xl border border-slate-200 dark:border-white/5">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sin hallazgos activos</p>
                    </div>
                ) : ncs.map(nc => (
                    <div key={nc.id} className="bg-white dark:bg-alco-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <span className="text-[9px] text-rose-600 font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">{nc.id}</span>
                            <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${nc.status === 'Cerrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>{nc.status}</span>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm leading-tight">{nc.title}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{nc.process}</p>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Sev: {nc.severity}</span>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedNC(nc); setIsActionModalOpen(true); }} className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100"><BrainIcon /></button>
                                <button onClick={() => { if (confirm('¿Eliminar registro?')) setNcs(prev => prev.filter(n => n.id !== nc.id)); }} className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100"><TrashIcon /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* VISTA DESKTOP: TABLA */}
            <div className="hidden md:block bg-white dark:bg-alco-surface rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-xl animate-fade-in">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b dark:border-white/5">
                            <tr>
                                <th className="px-10 py-6">ID / Descripción del Hallazgo</th>
                                <th className="px-10 py-6">Proceso Origen</th>
                                <th className="px-10 py-6 text-center">Estado</th>
                                <th className="px-10 py-6 text-right">Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-white/5">
                            {ncs.length === 0 ? (
                                <tr><td colSpan={4} className="px-10 py-24 text-center opacity-30 text-xs font-black uppercase tracking-[0.3em]">Sin hallazgos activos en el ciclo de mejora</td></tr>
                            ) : ncs.map(nc => (
                                <tr key={nc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <td className="px-10 py-8">
                                        <p className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">{nc.title}</p>
                                        <div className="flex gap-3 mt-1.5">
                                            <span className="text-[9px] text-rose-600 font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">{nc.id}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Severidad: {nc.severity}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="text-xs font-bold text-slate-500 uppercase">{nc.process}</p>
                                        <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-tighter italic">OBRA: {nc.project}</p>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${nc.status === 'Cerrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-sky-50 text-sky-700 border-sky-100'
                                            }`}>{nc.status}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => { setSelectedNC(nc); setIsActionModalOpen(true); }} className="p-3 bg-sky-50 text-sky-600 rounded-2xl hover:scale-110 transition-all shadow-sm border border-sky-100 dark:bg-sky-900/10 dark:border-sky-800" title="Analizar Hallazgo"><BrainIcon /></button>
                                            <button onClick={() => { if (confirm('¿Eliminar registro?')) setNcs(prev => prev.filter(n => n.id !== nc.id)); }} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:scale-110 transition-all shadow-sm border border-rose-100 dark:bg-rose-900/10 dark:border-rose-800"><TrashIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL ANÁLISIS RCA Y PLAN CAPA */}
            {
                isActionModalOpen && selectedNC && (
                    <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#0b0b14] rounded-2xl w-[95%] md:w-[90%] lg:w-[85%] xl:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/5 animate-fade-in-up mx-auto my-auto relative">
                            <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-6">
                                    <div className="size-16 bg-rose-600 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-lg shadow-rose-900/30"><BrainIcon /></div>
                                    <div><p className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em]">{selectedNC.id} • ANÁLISIS DE MEJORA</p><h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{selectedNC.title}</h2></div>
                                </div>
                                <button onClick={() => setIsActionModalOpen(false)} className="size-12 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 text-3xl transition-all flex items-center justify-center">&times;</button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-4 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 custom-scrollbar">
                                {/* Columna Izquierda: Análisis de Causa */}
                                <div className="xl:col-span-7 space-y-8">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center rounded-2xl bg-sky-50 dark:bg-white/5 p-2">
                                            <h4 className="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-[0.2em] flex items-center gap-3 pl-4"><RobotIcon /> Análisis Inteligente de Causa Raíz</h4>
                                            <button onClick={handleAISuggestion} disabled={isGeneratingAI} className="px-6 py-3 bg-white dark:bg-sky-600 text-sky-700 dark:text-white border border-sky-200 dark:border-sky-500 rounded-xl text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-sm">
                                                {isGeneratingAI ? <RefreshIcon className="animate-spin" /> : <SparklesIcon className="text-yellow-400" />} Generar Dictamen IA
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {selectedNC.rca?.aiSuggestedRootCause && (
                                    <div className="p-10 bg-sky-50 dark:bg-sky-900/10 rounded-3xl border border-sky-100 dark:border-sky-800/30 animate-fade-in relative overflow-hidden">
                                        <RobotIcon className="absolute -right-5 -bottom-5 text-8xl opacity-5" />
                                        <h4 className="text-[11px] font-black text-sky-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><RobotIcon /> Dictamen Técnico Estratégico</h4>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                                            <ReactMarkdown>{selectedNC.rca.aiSuggestedRootCause}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Columna Derecha: Plan de Acción CAPA */}
                            <div className="xl:col-span-5 space-y-8">
                                <div className="space-y-8">
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3"><ClipboardCheckIcon className="text-emerald-500" /> Plan de Acción (CAPA)</h4>

                                    <div className="bg-slate-50 dark:bg-white/[0.02] p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 space-y-4 shadow-inner">
                                        <textarea
                                            className="w-full p-4 bg-white dark:bg-[#1a1a24] border dark:border-white/5 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                                            rows={2}
                                            placeholder="DESCRIBA ACCIÓN CORRECTIVA..."
                                            value={newActionDesc}
                                            onChange={e => setNewActionDesc(e.target.value)}
                                        />
                                        <div className="flex gap-3">
                                            <input
                                                className="flex-grow p-4 bg-white dark:bg-[#1a1a24] border dark:border-white/5 rounded-2xl text-[10px] font-black uppercase outline-none"
                                                placeholder="RESPONSABLE..."
                                                value={newActionResp}
                                                onChange={e => setNewActionResp(e.target.value)}
                                            />
                                            <button onClick={handleAddCapaAction} className="px-8 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Añadir</button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {selectedNC.actions.length === 0 ? (
                                            <p className="text-[10px] text-center text-slate-400 font-black uppercase py-10 border-2 border-dashed dark:border-white/5 rounded-3xl">Sin acciones correctivas registradas</p>
                                        ) : selectedNC.actions.map(action => (
                                            <div key={action.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${action.completed ? 'bg-emerald-50/50 border-emerald-200 opacity-60' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                                                <div className="flex gap-4 items-start">
                                                    <button onClick={() => handleToggleCapaAction(action.id)} className={`size-6 mt-1 rounded-lg border-2 flex items-center justify-center transition-all ${action.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'}`}>
                                                        {action.completed && <i className="fas fa-check text-[10px]"></i>}
                                                    </button>
                                                    <div>
                                                        <p className={`text-xs font-black uppercase leading-tight ${action.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{action.description}</p>
                                                        <div className="flex gap-3 mt-1">
                                                            <span className="text-[9px] font-bold text-sky-600 uppercase flex items-center gap-1"><UserCircleIcon className="scale-75" /> {action.responsible}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><CalendarIcon className="scale-75" /> VENCE: {action.dueDate}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleUpdateNC({ ...selectedNC, actions: selectedNC.actions.filter(a => a.id !== action.id) })} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><TrashIcon className="scale-75" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6 pt-10 border-t dark:border-white/5">
                                    <label className={labelStyles}>Estado del Hallazgo SGC</label>
                                    <select className={inputStyles} value={selectedNC.status} onChange={e => handleUpdateNC({ ...selectedNC, status: e.target.value as NCStatus })}>
                                        <option>Abierta</option>
                                        <option>Bajo Análisis</option>
                                        <option>CAPA</option>
                                        <option>Cerrada</option>
                                        <option>Eficaz</option>
                                    </select>
                                    <button onClick={() => { setIsActionModalOpen(false); addNotification({ type: 'success', title: 'REGISTRO ACTUALIZADO', message: 'Los cambios técnicos han sido salvados.' }); }} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"><SaveIcon /> Firmar y Guardar Expediente</button>

                                    {/* TRAZABILIDAD / HISTORIAL */}
                                    <div className="pt-10 border-t dark:border-white/5 space-y-6">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3"><i className="fas fa-history text-slate-500" /> Trazabilidad del Hallazgo</h4>
                                        <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar p-2">
                                            {selectedNC.history && selectedNC.history.length > 0 ? (
                                                selectedNC.history.slice().reverse().map(event => (
                                                    <div key={event.id} className="flex gap-4 items-start relative pb-6 border-l-2 border-slate-200 dark:border-white/10 last:border-0 pl-6">
                                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-[#0b0b14]" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">{event.date} • {event.user}</p>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{event.action}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase italic">{event.details}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-slate-400 italic">No hay historial registrado.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL APERTURA HALLAZGO */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 z-[2500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                        <div className="bg-white dark:bg-[#0b0b14] rounded-2xl md:rounded-3xl max-w-3xl w-full p-6 md:p-10 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-white/5 relative overflow-hidden my-auto">
                            <div className="flex justify-between items-start mb-10">
                                <div><h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Abrir Nuevo <span className="text-rose-600">Hallazgo</span></h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Detección de Desviación SGC Alco</p></div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                            </div>
                            <form onSubmit={handleCreateNC} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className={labelStyles}>Título del Hallazgo</label><input required name="title" className={inputStyles} placeholder="EJ: FALLO EN ADHERENCIA LOTE X" /></div>
                                    <div><label className={labelStyles}>Severidad ISO</label><select name="severity" className={inputStyles}><option>Menor</option><option>Mayor</option><option>Crítica</option></select></div>
                                    <div><label className={labelStyles}>Proceso de Origen</label><select name="process" className={inputStyles} required><option value="">SELECCIONE...</option>{AREAS_PROCESO.map(p => <option key={p}>{p}</option>)}</select></div>
                                    <div><label className={labelStyles}>Obra / Proyecto Relacionado</label><input name="project" className={inputStyles} placeholder="EJ: EDIFICIO TORRE A" required /></div>
                                </div>
                                <div><label className={labelStyles}>Descripción Detallada (Hechos Técnicos)</label><textarea required name="description" className={`${inputStyles} h-32 normal-case font-medium`} placeholder="Relate los hechos detectados, citando evidencia física o fotográfica..." /></div>
                                <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 active:scale-95 transition-all"><SaveIcon /> Notificar Apertura de NC</button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default NonConformities;
