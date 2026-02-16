

import React, { useState, useEffect } from 'react';
import type { NonConformity, NCSeverity, NCStatus, CAPAAction } from '../types';
import Breadcrumbs from './Breadcrumbs';
import {
    ExclamationTriangleIcon, PlusIcon,
    BrainIcon, SaveIcon, RobotIcon, ClipboardCheckIcon,
    TrashIcon, EditIcon, AREAS_PROCESO, RefreshIcon,
    SparklesIcon, CameraIcon, ImageIcon, SearchIcon,
    ChevronLeftIcon, ChevronRightIcon, CalendarIcon, UserCircleIcon
} from '../constants';
import { useNotification } from './NotificationSystem';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../insforgeClient';



const NonConformities: React.FC = () => {
    const { addNotification } = useNotification();
    const [ncs, setNcs] = useState<NonConformity[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // CAPA Action Inputs
    const [newActionDesc, setNewActionDesc] = useState('');

    const [newActionResp, setNewActionResp] = useState('');
    const [newActionType, setNewActionType] = useState<'Correctiva' | 'Preventiva' | 'Mejora'>('Correctiva');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchNcs();
    }, []);

    const fetchNcs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('non_conformities')
                .select(`
                    *,
                    nc_actions (*),
                    nc_history (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedNcs: NonConformity[] = data.map((nc: any) => ({
                id: nc.serial_id || nc.id,
                db_id: nc.id,
                title: nc.title,
                process: nc.process,
                project: nc.project,
                severity: nc.severity,
                status: nc.status,
                description: nc.description,
                rca: nc.rca,
                actions: nc.nc_actions.map((a: any) => ({
                    id: a.id,
                    description: a.description,
                    responsible: a.responsible,
                    dueDate: a.due_date,
                    completed: a.completed
                })),
                createdAt: nc.created_at.split('T')[0],
                closedAt: nc.closed_at,
                history: nc.nc_history.map((h: any) => ({
                    id: h.id,
                    date: new Date(h.created_at).toLocaleString(),
                    user: 'USUARIO', // Simplificado por ahora
                    action: h.action,
                    details: h.details
                }))
            }));

            setNcs(mappedNcs);
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const filteredNcs = React.useMemo(() => {
        if (!searchTerm) return ncs;
        const lowerSearch = searchTerm.toLowerCase();
        return ncs.filter(nc =>
            nc.title.toLowerCase().includes(lowerSearch) ||
            nc.id.toLowerCase().includes(lowerSearch) ||
            nc.process.toLowerCase().includes(lowerSearch) ||
            nc.project.toLowerCase().includes(lowerSearch)
        );
    }, [ncs, searchTerm]);

    const paginatedNcs = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredNcs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredNcs, currentPage]);

    const totalPages = Math.ceil(filteredNcs.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleCreateNC = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const serial_id = `NC-25-${(ncs.length + 1).toString().padStart(3, '0')}`;

        const newNCData = {
            serial_id,
            title: (formData.get('title') as string).toUpperCase(),
            process: formData.get('process') as string,
            project: formData.get('project') as string,
            severity: formData.get('severity') as NCSeverity,
            description: formData.get('description') as string,
            status: 'Abierta',
            rca: { why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '' }
        };

        try {
            const { data, error } = await supabase
                .from('non_conformities')
                .insert([newNCData])
                .select()
                .single();

            if (error) throw error;

            // Log history
            await supabase.from('nc_history').insert([{
                nc_id: data.id,
                action: 'APERTURA',
                details: `Hallazgo detectado en obra ${newNCData.project}.`
            }]);

            fetchNcs();
            setIsCreateModalOpen(false);
            addNotification({ type: 'success', title: 'HALLAZGO ABIERTO', message: `No Conformidad ${serial_id} registrada para seguimiento.` });
        } catch (error: any) {
            console.error("Create NC Error:", error);
            addNotification({
                type: 'error',
                title: 'ERROR AL GUARDAR',
                message: `Detalle técnico: ${error.message || JSON.stringify(error)}`
            });
        }
    };

    const logHistory = async (ncId: string, action: string, details: string) => {
        const { error } = await supabase.from('nc_history').insert([{
            nc_id: ncId,
            action,
            details
        }]);
        if (error) console.error('Error logging history:', error);
    };

    const handleAddCapaAction = async () => {
        if (!selectedNC || !newActionDesc.trim()) return;
        const db_id = (selectedNC as any).db_id || selectedNC.id;

        try {
            const { data, error } = await supabase.from('nc_actions').insert([{
                nc_id: db_id,
                description: newActionDesc.toUpperCase(),
                responsible: newActionResp.toUpperCase(),
                type: newActionType,
                due_date: new Date().toISOString().split('T')[0]
            }]).select().single();

            if (error) throw error;

            await logHistory(db_id, 'NUEVA ACCIÓN', `Se asignó acción ${newActionType} a ${newActionResp.toUpperCase()}: ${newActionDesc.toUpperCase()}`);

            fetchNcs();
            setNewActionDesc('');
            setNewActionResp('');
            addNotification({ type: 'success', title: 'ACCIÓN ASIGNADA', message: 'Se ha registrado la nueva acción correctiva.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL AÑADIR ACCIÓN', message: error.message });
        }
    };

    const handleToggleCapaAction = async (actionId: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('nc_actions')
                .update({ completed: !currentState })
                .eq('id', actionId);

            if (error) throw error;
            fetchNcs();
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL ACTUALIZAR ACCIÓN', message: error.message });
        }
    };

    const handleUpdateNC = async (updated: any) => {
        const db_id = updated.db_id || updated.id;
        try {
            const { error } = await supabase
                .from('non_conformities')
                .update({
                    title: updated.title,
                    process: updated.process,
                    project: updated.project,
                    severity: updated.severity,
                    status: updated.status,
                    description: updated.description,
                    rca: updated.rca,
                    closed_at: updated.status === 'Cerrada' || updated.status === 'Eficaz' ? new Date().toISOString() : null
                })
                .eq('id', db_id);

            if (error) throw error;
            fetchNcs();
            setSelectedNC(updated);
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL ACTUALIZAR NC', message: error.message });
        }
    };

    const handleDeleteNC = async (db_id: string, serial_id: string) => {
        if (!confirm(`¿Está seguro de eliminar permanentemente el hallazgo ${serial_id}?`)) return;
        try {
            const { error } = await supabase
                .from('non_conformities')
                .delete()
                .eq('id', db_id);

            if (error) throw error;
            fetchNcs();
            addNotification({ type: 'success', title: 'HALLAZGO ELIMINADO', message: `El registro ${serial_id} fue borrado.` });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL ELIMINAR', message: error.message });
        }
    };

    const handleAISuggestion = async () => {
        if (!selectedNC) return;
        setIsGeneratingAI(true);
        try {
            const { analyzeRootCause } = await import('../utils/aiService');

            const analysis = await analyzeRootCause(
                selectedNC.description || '',
                `Título: ${selectedNC.title}. Proceso: ${selectedNC.process}. Obra: ${selectedNC.project}`
            );

            if (!analysis) throw new Error('No se pudo generar el análisis. Verifique la API Key.');

            const updatedRCA = {
                ...selectedNC.rca,
                why1: analysis.why1 || '',
                why2: analysis.why2 || '',
                why3: analysis.why3 || '',
                why4: analysis.why4 || '',
                why5: analysis.why5 || '',
                rootCause: analysis.rootCause || '',
                aiSuggestedRootCause: analysis.rootCause // Keep legacy field for compatibility if needed
            };

            await handleUpdateNC({
                ...selectedNC,
                rca: updatedRCA,
                // Optional: You could also auto-populate a suggested action if you wanted
                // actions: [...selectedNC.actions, { description: analysis.recommendedAction ... }] 
            });

            addNotification({ type: 'success', title: 'ANÁLISIS IA COMPLETADO', message: 'Metodología 5 Porqués aplicada exitosamente.' });
        } catch (e: any) {
            console.error('AI Error:', e);
            addNotification({ type: 'error', title: 'ERROR IA', message: e.message || 'Fallo en la conexión con el motor RCA.' });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedNC || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64String = reader.result as string;

            // Add to evidence list in RCA
            const currentEvidence = selectedNC.rca?.evidence_urls || [];
            const updatedRCA = {
                ...selectedNC.rca,
                evidence_urls: [...currentEvidence, base64String]
            };

            await handleUpdateNC({
                ...selectedNC,
                rca: updatedRCA
            });

            addNotification({ type: 'success', title: 'EVIDENCIA ADJUNTA', message: 'Imagen guardada en el expediente.' });
        };

        reader.readAsDataURL(file);
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none uppercase transition-all placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    return (
        <>
            <div className="animate-fade-in space-y-10 pb-20">
                <Breadcrumbs crumbs={[{ label: 'Sección II: Mejora', path: '/dashboard' }, { label: 'GESTIÓN DE MEJORA' }]} />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Gestión de <span className="text-rose-600">Mejora</span></h1>
                        <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 italic">
                            <ExclamationTriangleIcon className="text-rose-600" /> Panel de No Conformidades y Análisis RCA Asistido por IA
                        </p>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto px-10 py-5 bg-[#5d5fef] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#5d5fef]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <PlusIcon /> Abrir Nuevo Hallazgo
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-grow md:flex-initial flex items-center gap-3 px-6 py-4 bg-white dark:bg-alco-surface rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm focus-within:ring-2 focus-within:ring-rose-500 transition-all">
                        <SearchIcon className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR HALLAZGO, OBRA O PROCESO..."
                            className="bg-transparent border-none outline-none text-xs font-black uppercase w-full md:w-80 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* VISTA MÓVIL: TARJETAS */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                            <RefreshIcon className="animate-spin text-[#5d5fef] size-10" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center">Sincronizando con el cerebro de InsForge...</p>
                        </div>
                    ) : paginatedNcs.length === 0 ? (
                        <div className="text-center p-12 premium-card">
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sin hallazgos activos</p>
                        </div>
                    ) : paginatedNcs.map(nc => (
                        <div key={nc.id} className="premium-card p-6 space-y-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] text-[#5d5fef] font-black uppercase tracking-widest bg-[#5d5fef]/10 px-3 py-1 rounded-full">{nc.id}</span>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${nc.status === 'Cerrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#5d5fef]/10 text-[#5d5fef] border-[#5d5fef]/20'}`}>{nc.status}</span>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase text-sm leading-tight tracking-tight">{nc.title}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-wider flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-[#5d5fef]"></span> {nc.process}
                                </p>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Severidad</span>
                                    <span className={`text-[10px] font-bold uppercase ${nc.severity === 'Crítica' ? 'text-rose-500' : nc.severity === 'Mayor' ? 'text-amber-500' : 'text-sky-500'}`}>{nc.severity}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedNC(nc); setIsActionModalOpen(true); }} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl hover:text-[#5d5fef] transition-all"><BrainIcon /></button>
                                    <button onClick={() => handleDeleteNC((nc as any).db_id || nc.id, nc.id)} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl hover:text-rose-500 transition-all"><TrashIcon /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* VISTA DESKTOP: TABLA */}
                <div className="hidden md:block premium-card overflow-hidden animate-fade-in shadow-xl">
                    <div className="responsive-table-container">
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
                                {loading ? (
                                    <tr><td colSpan={4} className="px-10 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshIcon className="animate-spin text-rose-600" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando registros...</span>
                                        </div>
                                    </td></tr>
                                ) : paginatedNcs.length === 0 ? (
                                    <tr><td colSpan={4} className="px-10 py-24 text-center opacity-30 text-xs font-black uppercase tracking-[0.3em]">Sin hallazgos activos en el ciclo de mejora</td></tr>
                                ) : paginatedNcs.map(nc => (
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
                                                <button onClick={() => { setSelectedNC(nc); setIsActionModalOpen(true); }} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl hover:text-[#5d5fef] transition-all shadow-sm border border-slate-200 dark:border-white/5" title="Analizar Hallazgo"><BrainIcon /></button>
                                                <button onClick={() => handleDeleteNC((nc as any).db_id || nc.id, nc.id)} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl hover:text-rose-500 transition-all shadow-sm border border-slate-200 dark:border-white/5"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN NC */}
                    {totalPages > 1 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-8 px-10 bg-slate-50/50 dark:bg-white/[0.02] border-t dark:border-white/5">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando {Math.min(filteredNcs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredNcs.length, currentPage * itemsPerPage)} de {filteredNcs.length} hallazgos
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-3 rounded-xl transition-all ${currentPage === 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-90'}`}
                                >
                                    <ChevronLeftIcon className="scale-75" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`size-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                            return <span key={page} className="text-slate-300 dark:text-slate-700 font-black">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-3 rounded-xl transition-all ${currentPage === totalPages ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-90'}`}
                                >
                                    <ChevronRightIcon className="scale-75" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>


            {/* MODAL ANÁLISIS RCA Y PLAN CAPA MOVIDO FUERA DEL CONTENEDOR ANIMADO PARA CORREGIR Z-INDEX */}
            {
                isActionModalOpen && selectedNC && (
                    <div className="fixed inset-0 z-[99999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
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

                                    {selectedNC.rca?.aiSuggestedRootCause && (
                                        <div className="p-10 bg-sky-50 dark:bg-sky-900/10 rounded-3xl border border-sky-100 dark:border-sky-800/30 animate-fade-in relative overflow-hidden">
                                            <RobotIcon className="absolute -right-5 -bottom-5 text-8xl opacity-5" />
                                            <h4 className="text-[11px] font-black text-sky-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3"><RobotIcon /> Dictamen Técnico Estratégico</h4>
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                                                <ReactMarkdown>{selectedNC.rca.aiSuggestedRootCause}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* EVIDENCIA FOTOGRÁFICA */}
                                    <div className="pt-6 border-t dark:border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3"><CameraIcon className="text-slate-500" /> Evidencia y Soportes</h4>
                                            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase hover:bg-slate-200 transition-colors flex items-center gap-2">
                                                <PlusIcon /> Adjuntar Foto
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleImageUpload}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {selectedNC.rca?.evidence_urls?.map((url, idx) => (
                                                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group">
                                                    <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            onClick={() => {
                                                                const newUrls = selectedNC.rca?.evidence_urls?.filter((_, i) => i !== idx);
                                                                handleUpdateNC({ ...selectedNC, rca: { ...selectedNC.rca, evidence_urls: newUrls } });
                                                            }}
                                                            className="p-2 bg-white rounded-full text-rose-600 hover:scale-110 transition-transform"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedNC.rca?.evidence_urls || selectedNC.rca.evidence_urls.length === 0) && (
                                                <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                                                    <div className="mx-auto size-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                                        <ImageIcon />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sin evidencia adjunta</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                                <div className="flex flex-col flex-grow gap-2">
                                                    <input
                                                        className="w-full p-4 bg-white dark:bg-[#1a1a24] border dark:border-white/5 rounded-2xl text-[10px] font-black uppercase outline-none"
                                                        placeholder="RESPONSABLE..."
                                                        value={newActionResp}
                                                        onChange={e => setNewActionResp(e.target.value)}
                                                    />
                                                    <select
                                                        className="w-full p-4 bg-white dark:bg-[#1a1a24] border dark:border-white/5 rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer"
                                                        value={newActionType}
                                                        onChange={e => setNewActionType(e.target.value as any)}
                                                    >
                                                        <option value="Correctiva">ACCIÓN CORRECTIVA</option>
                                                        <option value="Preventiva">ACCIÓN PREVENTIVA</option>
                                                        <option value="Mejora">ACCIÓN DE MEJORA</option>
                                                    </select>
                                                    <button onClick={handleAddCapaAction} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Añadir Acción</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedNC.actions.length === 0 ? (
                                                <p className="text-[10px] text-center text-slate-400 font-black uppercase py-10 border-2 border-dashed dark:border-white/5 rounded-3xl">Sin acciones correctivas registradas</p>
                                            ) : selectedNC.actions.map(action => (
                                                <div key={action.id} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${action.completed ? 'bg-emerald-50/50 border-emerald-200 opacity-60' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                                                    <div className="flex gap-4 items-start">
                                                        <button onClick={() => handleToggleCapaAction(action.id, action.completed)} className={`size-6 mt-1 rounded-lg border-2 flex items-center justify-center transition-all ${action.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'}`}>
                                                            {action.completed && <i className="fas fa-check text-[10px]"></i>}
                                                        </button>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${action.type === 'Correctiva' ? 'bg-rose-100 text-rose-700' :
                                                                    action.type === 'Preventiva' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                    }`}>{action.type || 'Correctiva'}</span>
                                                            </div>
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
        </>
    );
};

export default NonConformities;
