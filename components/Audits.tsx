import { useState, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import {
    RobotIcon, SearchIcon, CalendarIcon, BookIcon, CheckCircleIcon,
    ExclamationTriangleIcon, PlusIcon, ClipboardCheckIcon, SaveIcon,
    DownloadIcon, ViewIcon, RefreshIcon, ChevronRightIcon, FileAltIcon,
    ShieldCheckIcon, TrashIcon, BrainIcon, EditIcon, AREAS_PROCESO, REGISTRO_USERS
} from '../constants';
import ReactMarkdown from 'react-markdown';
import { useNotification } from './NotificationSystem';
import { supabase } from '../insforgeClient';
import BulkUploadButton from './BulkUploadButton';

interface AuditFinding {
    id: string;
    clause: string;
    description: string;
    evidence: string;
    type: 'Fortaleza' | 'Observación' | 'No Conformidad Menor' | 'No Conformidad Mayor';
    audit_id?: string;
}

interface AlcoAudit {
    id: string;
    reportNumber: string;
    version: string;
    auditDate: string;
    process: string;
    auditor: string;
    objective: string;
    scope: string;
    status: 'Planificada' | 'En Ejecución' | 'Finalizada';
    findings: AuditFinding[];
    executiveSummary?: string;
}

const ISO_CLAUSES = [
    { code: '4.4', name: 'Sistema de gestión de la calidad y sus procesos' },
    { code: '6.1', name: 'Acciones para abordar riesgos y oportunidades' },
    { code: '7.1.5', name: 'Recursos de seguimiento y medición' },
    { code: '7.2', name: 'Competencia del personal' },
    { code: '8.5.1', name: 'Control de la producción y prestación del servicio' },
    { code: '9.1', name: 'Seguimiento, medición, análisis y evaluación' }
];

const Audits: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'execution' | 'report'>('dashboard');
    const [selectedAudit, setSelectedAudit] = useState<AlcoAudit | null>(null);
    const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
    const [audits, setAudits] = useState<AlcoAudit[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audits')
                .select(`
                    *,
                    findings:audit_findings(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedAudits: AlcoAudit[] = (data || []).map(a => ({
                id: a.id,
                reportNumber: a.report_number,
                version: a.version || '1',
                auditDate: a.audit_date,
                process: a.process,
                auditor: a.auditor,
                objective: a.objective || '',
                scope: a.scope || '',
                status: a.status as any,
                executiveSummary: a.executive_summary || '',
                findings: (a.findings || []).map((f: any) => ({
                    id: f.id,
                    clause: f.clause,
                    description: f.description,
                    evidence: f.evidence,
                    type: f.type,
                    audit_id: f.audit_id
                }))
            }));

            setAudits(mappedAudits);
        } catch (error) {
            console.error('Error fetching audits:', error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar las auditorías.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAudit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const newAuditData = {
                report_number: `N°${audits.length + 1}_${new Date().getFullYear()}`,
                version: '1',
                audit_date: formData.get('date') as string,
                process: formData.get('process') as string,
                auditor: formData.get('auditor') as string,
                objective: formData.get('objective') as string,
                scope: formData.get('scope') as string,
                status: 'Planificada'
            };

            const { data, error } = await supabase
                .from('audits')
                .insert(newAuditData)
                .select()
                .single();

            if (error) throw error;

            const newAudit: AlcoAudit = {
                id: data.id,
                reportNumber: data.report_number,
                version: data.version,
                auditDate: data.audit_date,
                process: data.process,
                auditor: data.auditor,
                objective: data.objective,
                scope: data.scope,
                status: data.status as any,
                findings: []
            };

            setAudits([newAudit, ...audits]);
            setIsPlanningModalOpen(false);
            addNotification({ type: 'success', title: 'AUDITORÍA PROGRAMADA', message: `El proceso ${newAudit.process} ha sido agendado.` });

        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo programar la auditoría.' });
        }
    };

    const handleStartExecution = async (audit: AlcoAudit) => {
        try {
            const { error } = await supabase
                .from('audits')
                .update({ status: 'En Ejecución' })
                .eq('id', audit.id);

            if (error) throw error;

            const updated = { ...audit, status: 'En Ejecución' as const };
            setSelectedAudit(updated);
            // The user's instruction was to remove parentheses from response.text()
            // However, response.text() is not present in this function.
            // The provided Code Edit block included a line that is not in the original code.
            // I will assume the user intended to modify the line where response.text() is actually used,
            // which is in handleGenerateExecutiveSummary.
            // If the user intended to add the line from the Code Edit block,
            // they should provide a clear instruction for adding it.
            // For now, I will only apply the instruction to remove parentheses from response.text()
            // where it exists in the original code.
            setAudits(prev => prev.map(a => a.id === audit.id ? updated : a));
            setActiveTab('execution');
        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo iniciar la ejecución.' });
        }
    };

    const handleAddFinding = async (finding: Omit<AuditFinding, 'id'>) => {
        if (!selectedAudit) return;

        try {
            const { data, error } = await supabase
                .from('audit_findings')
                .insert({
                    audit_id: selectedAudit.id,
                    clause: finding.clause,
                    description: finding.description,
                    evidence: finding.evidence,
                    type: finding.type
                })
                .select()
                .single();

            if (error) throw error;

            const newFinding: AuditFinding = {
                id: data.id,
                clause: data.clause,
                description: data.description,
                evidence: data.evidence,
                type: data.type,
                audit_id: data.audit_id
            };

            const updated = { ...selectedAudit, findings: [...selectedAudit.findings, newFinding] };
            setSelectedAudit(updated);
            setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));
            addNotification({ type: 'success', title: 'Hallazgo Registrado', message: 'Se ha guardado el hallazgo.' });

        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo guardar el hallazgo.' });
        }
    };

    const handleUpdateAuditStatus = async (status: 'Planificada' | 'En Ejecución' | 'Finalizada') => {
        if (!selectedAudit) return;
        try {
            const { error } = await supabase
                .from('audits')
                .update({ status })
                .eq('id', selectedAudit.id);

            if (error) throw error;

            const updated = { ...selectedAudit, status };
            setSelectedAudit(updated);
            setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));
            if (status === 'Finalizada') setActiveTab('dashboard');
            addNotification({ type: 'success', title: 'Estado Actualizado', message: `Auditoría marcada como ${status}.` });

        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo actualizar el estado.' });
        }
    }

    const handleDeleteAudit = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar esta auditoría? Esta acción no se puede deshacer.')) return;
        try {
            const { error } = await supabase.from('audits').delete().eq('id', id);
            if (error) throw error;
            setAudits(prev => prev.filter(a => a.id !== id));
            addNotification({ type: 'info', title: 'Auditoría Eliminada', message: 'El registro ha sido eliminado.' });
        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar la auditoría.' });
        }
    }


    const handleGenerateExecutiveSummary = async () => {
        if (!selectedAudit || selectedAudit.findings.length === 0) return;
        setIsAnalyzingIA(true);
        try {
            const { generateContent } = await import('../utils/aiService');

            const prompt = `Actúa como Auditor Líder ISO 9001. Genera un "Resumen Ejecutivo de Auditoría" profesional para el proceso "${selectedAudit.process}". Hallazgos detectados: ${JSON.stringify(selectedAudit.findings)}. El tono debe ser formal, destacando la madurez del sistema y áreas de mejora. Máximo 150 palabras en formato Markdown. Responde SIEMPRE en Español.`;

            try {
                const summary = await generateContent("gemini-1.5-flash-001", prompt);

                if (!summary) throw new Error("No se pudo generar el resumen (Respuesta vacía)");

                const { error: updateError } = await supabase
                    .from('audits')
                    .update({ executive_summary: summary })
                    .eq('id', selectedAudit.id);

                if (updateError) throw updateError;

                // Refresh local state
                const updated = { ...selectedAudit, executiveSummary: summary };
                setSelectedAudit(updated as any);
                setAudits(prev => prev.map(a => a.id === updated.id ? updated : a) as any);

                addNotification({ type: 'success', title: 'Generado', message: 'Resumen Ejecutivo creado con éxito.' });
            } catch (error: any) {
                console.error("Audit AI Error:", error);
                addNotification({
                    type: 'error',
                    title: 'Error IA',
                    message: `No se pudo crear el resumen: ${error.message}`
                });
            } finally {
                setIsAnalyzingIA(false); // Assuming setIsAnalyzingIA is the correct state setter
            }
        } catch (e) {
            console.error(e);
            addNotification({ type: 'error', title: 'ERROR IA', message: 'No se pudo generar el análisis automático.' });
        } finally {
            setIsAnalyzingIA(false);
        }
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none uppercase transition-all";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <Breadcrumbs crumbs={[{ label: 'Sección II: Legal', path: '/dashboard' }, { label: 'GESTIÓN DE AUDITORÍAS' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Control de <span className="text-sky-600">Cumplimiento</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest italic flex items-center gap-2">
                        <ShieldCheckIcon className="text-sky-600" /> Requerimientos Legales y Normativos ISO 19011
                    </p>
                </div>
                {activeTab === 'dashboard' && (
                    <div className="flex gap-4">
                        <BulkUploadButton
                            tableName="audits"
                            onUploadComplete={fetchAudits}
                            label="Importar Auditorías"
                        />
                        <button onClick={() => setIsPlanningModalOpen(true)} className="px-10 py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all">
                            Programar Auditoría
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'dashboard' && (
                <div className="bg-white dark:bg-alco-surface rounded-[4rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-xl animate-fade-in">
                    <div className="p-10 border-b dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col md:flex-row justify-between items-center gap-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Libro Maestro de Auditorías</h3>
                        <div className="relative w-full md:w-80">
                            <input
                                className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#0b0b14] border-none rounded-2xl shadow-sm text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                                placeholder="Filtrar por Informe o Proceso..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-10 text-center text-slate-400">Cargando auditorías...</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b dark:border-white/5">
                                    <tr>
                                        <th className="px-10 py-6">Referencia</th>
                                        <th className="px-10 py-6">Proceso / Auditor</th>
                                        <th className="px-10 py-6 text-center">Estado ISO</th>
                                        <th className="px-10 py-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-white/5">
                                    {audits.filter(a => a.process.toLowerCase().includes(searchTerm.toLowerCase()) || a.reportNumber.toLowerCase().includes(searchTerm.toLowerCase())).map(audit => (
                                        <tr key={audit.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <td className="px-10 py-8">
                                                <p className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-sm">{audit.reportNumber}</p>
                                                <p className="text-[9px] text-sky-600 font-black mt-1">FECHA: {audit.auditDate}</p>
                                            </td>
                                            <td className="px-10 py-8">
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase leading-tight">{audit.process}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic">{audit.auditor}</p>
                                            </td>
                                            <td className="px-10 py-8 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${audit.status === 'Finalizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    audit.status === 'En Ejecución' ? 'bg-sky-50 text-sky-700 border-sky-100 animate-pulse' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>{audit.status}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex justify-end gap-3">
                                                    {audit.status === 'Planificada' && (
                                                        <button onClick={() => handleStartExecution(audit)} className="p-3 bg-sky-50 text-sky-600 rounded-2xl hover:scale-110 transition-all shadow-sm" title="Ejecutar Auditoría"><ClipboardCheckIcon /></button>
                                                    )}
                                                    <button onClick={() => { setSelectedAudit(audit); setActiveTab('report'); }} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:scale-110 transition-all shadow-sm"><ViewIcon /></button>
                                                    <button onClick={() => handleDeleteAudit(audit.id)} className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:scale-110 transition-all shadow-sm"><TrashIcon /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {audits.length === 0 && (
                                        <tr><td colSpan={4} className="p-10 text-center text-slate-400">No hay auditorías registradas</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'execution' && selectedAudit && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in-up">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white dark:bg-alco-surface p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Puntos de Control ISO 9001</h3>
                            <div className="space-y-4">
                                {ISO_CLAUSES.map(clause => (
                                    <div key={clause.code} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-sky-500/50 transition-all">
                                        <p className="text-[10px] font-black text-sky-600 uppercase mb-1">CAPÍTULO {clause.code}</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight mb-4">{clause.name}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAddFinding({ clause: clause.code, description: 'Cumplimiento verificado satisfactoriamente.', evidence: 'REVISIÓN DOCUMENTAL OK', type: 'Fortaleza' })} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase">Favorable</button>
                                            <button onClick={() => handleAddFinding({ clause: clause.code, description: 'Se detecta ausencia de registros en el periodo actual.', evidence: 'N/A', type: 'No Conformidad Menor' })} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-black uppercase">Hallazgo</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-alco-surface p-12 rounded-[4rem] shadow-xl border border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-10">
                                <div><h3 className="text-2xl font-black uppercase tracking-tighter">Evidencias Recopiladas</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Auditando: {selectedAudit.process}</p></div>
                                <button onClick={() => { handleUpdateAuditStatus('Finalizada'); }} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all">Finalizar Trabajo de Campo</button>
                            </div>
                            <div className="space-y-6">
                                {selectedAudit.findings.length === 0 ? (
                                    <div className="p-20 border-4 border-dashed dark:border-white/5 rounded-[3rem] text-center opacity-30">
                                        <ClipboardCheckIcon className="text-6xl mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">Inicie la verificación de cláusulas normativas</p>
                                    </div>
                                ) : (
                                    selectedAudit.findings.map(finding => (
                                        <div key={finding.id} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5 animate-fade-in group relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${finding.type.includes('NC') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{finding.type}</span>
                                                    <h4 className="text-lg font-black uppercase tracking-tighter mt-3">ISO 9001:2015 - CLÁUSULA {finding.clause}</h4>
                                                </div>
                                                {/* Deletion of findings could be added here if needed, linking to a delete handler */}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-6 italic">"{finding.description}"</p>
                                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-black/20 rounded-xl border dark:border-white/5">
                                                <div className="size-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600"><FileAltIcon className="scale-75" /></div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EVIDENCIA TÉCNICA: {finding.evidence}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                            <RobotIcon className="absolute -right-10 -bottom-10 text-[15rem] opacity-5 group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg"><BrainIcon /></div>
                                    <div><h4 className="text-xl font-black uppercase tracking-tighter">Asistente de Auditoría IA</h4><p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Motor Estratégico Alco v2.5</p></div>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">"Puedo analizar todos los hallazgos registrados para detectar patrones de incumplimiento sistémico y redactar el resumen gerencial del informe final."</p>
                                <button onClick={handleGenerateExecutiveSummary} disabled={isAnalyzingIA || selectedAudit.findings.length === 0} className="px-10 py-5 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-900/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed">
                                    {isAnalyzingIA ? <RefreshIcon className="animate-spin" /> : <RobotIcon />} Iniciar Análisis Inteligente
                                </button>
                                {selectedAudit.executiveSummary && (
                                    <div className="mt-8 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 animate-fade-in">
                                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 italic font-medium"><ReactMarkdown>{selectedAudit.executiveSummary}</ReactMarkdown></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'report' && selectedAudit && (
                <div className="animate-fade-in max-w-5xl mx-auto py-10">
                    <div className="bg-white dark:bg-alco-surface shadow-2xl p-16 md:p-24 border dark:border-white/5 relative overflow-hidden rounded-[2rem]">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none text-slate-900 dark:text-white">
                            <p className="text-[12rem] font-black uppercase tracking-[0.5em]">ALCO CONTROL</p>
                        </div>

                        <div className="border-[6px] border-slate-900 dark:border-white grid grid-cols-4 items-center">
                            <div className="p-10 border-r-[6px] border-slate-900 dark:border-white text-left">
                                <p className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">ALCO</p>
                                <p className="text-[10px] font-black uppercase opacity-60 text-slate-900 dark:text-white">Architectural Suite</p>
                            </div>
                            <div className="col-span-2 p-10 border-r-[6px] border-slate-900 dark:border-white text-center uppercase font-black text-slate-900 dark:text-white">
                                <p className="text-3xl tracking-tighter leading-none">INFORME DE AUDITORÍA INTERNA</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 tracking-widest">SISTEMA DE GESTIÓN DE CALIDAD ISO 9001</p>
                            </div>
                            <div className="p-8 text-[11px] font-black uppercase leading-loose text-slate-900 dark:text-white">
                                <p>CÓDIGO: {selectedAudit.reportNumber}</p>
                                <p>FECHA: {selectedAudit.auditDate}</p>
                                <p>VERSIÓN: {selectedAudit.version}</p>
                            </div>
                        </div>

                        <div className="mt-20 space-y-16 relative z-10">
                            <div className="grid grid-cols-2 gap-20 border-b-2 border-slate-100 dark:border-white/10 pb-12">
                                <div><p className={labelStyles}>Proceso Auditado</p><p className="text-xl font-black uppercase text-slate-900 dark:text-white">{selectedAudit.process}</p></div>
                                <div><p className={labelStyles}>Auditor Responsable</p><p className="text-xl font-black uppercase text-slate-900 dark:text-white">{selectedAudit.auditor}</p></div>
                            </div>

                            <section>
                                <h4 className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 text-xs font-black uppercase tracking-[0.3em] mb-10">1. RESUMEN EJECUTIVO Y CONCLUSIÓN</h4>
                                <div className="text-lg leading-relaxed font-medium italic border-l-8 border-sky-600 pl-10 text-slate-600 dark:text-slate-300">
                                    {selectedAudit.executiveSummary || "Auditoría finalizada satisfactoriamente. Se recomienda mantener la trazabilidad digital actual."}
                                </div>
                            </section>

                            <section>
                                <h4 className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 text-xs font-black uppercase tracking-[0.3em] mb-10">2. DETALLE DE HALLAZGOS POR CLÁUSULA</h4>
                                <div className="border-[4px] border-slate-900 dark:border-white overflow-hidden rounded-xl">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 dark:bg-white/[0.05] border-b-[4px] border-slate-900 dark:border-white font-black uppercase text-slate-900 dark:text-white">
                                            <tr>
                                                <th className="p-6 border-r-[4px] border-slate-900 dark:border-white text-center w-24">ISO</th>
                                                <th className="p-6 border-r-[4px] border-slate-900 dark:border-white">Hallazgo y Evidencia</th>
                                                <th className="p-6 text-center w-40">Clasificación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-[4px] divide-slate-900 dark:divide-white text-slate-900 dark:text-white">
                                            {selectedAudit.findings.map(f => (
                                                <tr key={f.id}>
                                                    <td className="p-8 border-r-[4px] border-slate-900 dark:border-white font-black text-center text-base">{f.clause}</td>
                                                    <td className="p-8 border-r-[4px] border-slate-900 dark:border-white"><p className="text-sm font-bold mb-4">"{f.description}"</p><div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-lg text-[9px] font-black uppercase border border-sky-100 dark:border-sky-800">EVIDENCIA: {f.evidence}</div></td>
                                                    <td className="p-8 text-center font-black uppercase text-[10px]"><span className={f.type.includes('NC') ? 'text-rose-600' : 'text-emerald-600'}>{f.type}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <div className="flex justify-end pt-10 no-print">
                                <button onClick={() => window.print()} className="px-12 py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-900/20 active:scale-95 transition-all flex items-center gap-3"><DownloadIcon /> Exportar Copia Controlada</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPlanningModalOpen && (
                <div className="fixed inset-0 z-[2500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white dark:bg-[#0b0b14] rounded-[4rem] max-w-2xl w-full p-12 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-white/5 relative overflow-hidden my-auto">
                        <div className="flex justify-between items-start mb-10">
                            <div><h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Programar <span className="text-sky-600">Auditoría</span></h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Plan Anual de Auditorías ISO 9001</p></div>
                            <button onClick={() => setIsPlanningModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleCreateAudit} className="space-y-6">
                            <div><label className={labelStyles}>Proceso a Auditar</label><select name="process" className={inputStyles} required><option value="">SELECCIONE...</option>{AREAS_PROCESO.map(a => <option key={a}>{a}</option>)}</select></div>
                            <div><label className={labelStyles}>Auditor Líder</label><select name="auditor" className={inputStyles} required><option value="">SELECCIONE...</option>{REGISTRO_USERS.map(u => <option key={u}>{u}</option>)}</select></div>
                            <div><label className={labelStyles}>Fecha de Auditoría</label><input name="date" type="date" className={inputStyles} required /></div>
                            <div><label className={labelStyles}>Objetivo Estratégico</label><input name="objective" className={inputStyles} placeholder="EJ: EVALUAR MADUREZ DEL SGC" required /></div>
                            <div><label className={labelStyles}>Alcance Técnico</label><input name="scope" className={inputStyles} placeholder="EJ: LÍNEAS DE CORTE Y PINTURA" required /></div>
                            <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"><SaveIcon /> Notificar y Programar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Audits;
