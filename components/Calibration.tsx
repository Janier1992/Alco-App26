
import React, { useState, useMemo, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import EmptyState from './EmptyState';
import {
    RulerIcon, CheckCircleIcon, ExclamationTriangleIcon, SearchIcon,
    RefreshIcon, PlusIcon, SaveIcon, EditIcon, DeleteIcon, DownloadIcon
} from '../constants';
import { useNotification } from './NotificationSystem';
import { useConfirmDialog } from './ConfirmDialog';

interface CalibrationRecord {
    id: string;
    tool: string;
    code: string;
    lastDate: string;
    dueDate: string;
    status: 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';
    certificateNumber: string;
}

import { insforge, supabase } from '../insforgeClient';
import { EmailService } from '../services/NotificationCoreService';

const getDaysUntilDue = (dueDate: string): number => {
    if (!dueDate) return 999;
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusConfig = (status: string, daysLeft: number) => {
    if (status === 'Vencido' || daysLeft < 0) return { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', label: 'VENCIDO', dot: 'bg-rose-500' };
    if (status === 'Mantenimiento') return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'MTTO', dot: 'bg-amber-500' };
    if (status === 'Próximo' || daysLeft <= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'PRÓXIMO', dot: 'bg-amber-500' };
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', label: 'VIGENTE', dot: 'bg-emerald-500' };
};

const Calibration: React.FC = () => {
    const { addNotification } = useNotification();
    const { confirm } = useConfirmDialog();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [records, setRecords] = useState<CalibrationRecord[]>([]);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('metrology_calibration').select('*').order('due_date', { ascending: true });
            if (error) throw error;
            const mappedRecords: CalibrationRecord[] = (data || []).map((r: any) => ({
                id: r.id, tool: r.tool_name, code: r.tool_code, lastDate: r.last_date,
                dueDate: r.due_date, status: r.status, certificateNumber: r.certificate_number
            }));
            setRecords(mappedRecords);
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: 'No se pudo recuperar la programación de calibración.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const [formData, setFormData] = useState<Omit<CalibrationRecord, 'id'>>({
        tool: '', code: '', lastDate: '', dueDate: '', status: 'Vigente', certificateNumber: ''
    });

    const handleEdit = (record: CalibrationRecord) => {
        setEditingId(record.id);
        const { id, ...data } = record;
        setFormData(data);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar instrumento',
            message: '¿Eliminar permanentemente este registro de calibración? Esta acción no se puede deshacer.',
            variant: 'danger',
            confirmLabel: 'Eliminar',
            icon: 'fa-trash-alt'
        });
        if (!confirmed) return;
        try {
            const { error } = await supabase.from('metrology_calibration').delete().eq('id', id);
            if (error) throw error;
            setRecords(prev => prev.filter(r => r.id !== id));
            addNotification({ type: 'error', title: 'EQUIPO ELIMINADO', message: 'El instrumento ha sido removido del cronograma oficial.' });
        } catch (error) {
            addNotification({ type: 'error', title: 'ERROR', message: 'No se pudo eliminar el equipo.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dbPayload = {
                tool_name: formData.tool, tool_code: formData.code, last_date: formData.lastDate,
                due_date: formData.dueDate, status: formData.status, certificate_number: formData.certificateNumber
            };
            let result;
            if (editingId) {
                result = await supabase.from('metrology_calibration').update(dbPayload).eq('id', editingId);
            } else {
                result = await supabase.from('metrology_calibration').insert([dbPayload]);
            }
            if (result.error) throw result.error;

            if (editingId) {
                await EmailService.send({
                    to: 'calidad@alco.com',
                    subject: `Estado de Calibración Modificado: ${formData.tool}`,
                    body: `El estado de calibración del equipo ${formData.tool} (Código: ${formData.code}) ha cambiado a: ${formData.status}.`,
                    moduleName: 'calibration',
                    referenceId: editingId,
                    triggeredBy: 'system'
                });
            } else {
                await EmailService.send({
                    to: 'calidad@alco.com',
                    subject: `Nuevo Equipo para Calibración: ${formData.tool}`,
                    body: `Se ha registrado el equipo ${formData.tool} (Código: ${formData.code}) en el control de calibración.\nFecha de Vencimiento: ${formData.dueDate}`,
                    moduleName: 'calibration',
                    referenceId: formData.code || 'Nuevo Equipo',
                    triggeredBy: 'system'
                });
            }

            addNotification({ type: 'success', title: editingId ? 'REGISTRO ACTUALIZADO' : 'EQUIPO REGISTRADO', message: editingId ? 'Información técnica corregida.' : 'Nuevo instrumento incorporado al control SGC.' });
            fetchRecords();
            setIsFormOpen(false);
            setEditingId(null);
            setFormData({ tool: '', code: '', lastDate: '', dueDate: '', status: 'Vigente', certificateNumber: '' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
    };

    const filteredRecords = records.filter(r =>
        r.tool.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Summary stats
    const stats = useMemo(() => {
        const vigente = records.filter(r => r.status === 'Vigente').length;
        const proximo = records.filter(r => r.status === 'Próximo' || (r.status === 'Vigente' && getDaysUntilDue(r.dueDate) <= 30 && getDaysUntilDue(r.dueDate) > 0)).length;
        const vencido = records.filter(r => r.status === 'Vencido' || getDaysUntilDue(r.dueDate) < 0).length;
        const mtto = records.filter(r => r.status === 'Mantenimiento').length;
        return { vigente, proximo, vencido, mtto, total: records.length };
    }, [records]);

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/40 outline-none uppercase transition-all";
    const labelStyles = "text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1";

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'METROLOGÍA', path: '/metrology' }, { label: 'CALIBRACIÓN' }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Control de <span className="text-indigo-500">Calibración</span></h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">Aseguramiento de la validez de los resultados (ISO 9001 7.1.5)</p>
                </div>
                <button onClick={() => setIsFormOpen(!isFormOpen)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95 ${isFormOpen ? 'bg-slate-700 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 shadow-indigo-500/20'}`}>
                    {isFormOpen ? 'Cerrar Panel' : <><PlusIcon /> Vincular Instrumento</>}
                </button>
            </div>

            {/* Summary KPI Cards */}
            {!isLoading && records.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                    {[
                        { label: 'Vigentes', value: stats.vigente, color: 'emerald', icon: '✅' },
                        { label: 'Próximos', value: stats.proximo, color: 'amber', icon: '⚠️' },
                        { label: 'Vencidos', value: stats.vencido, color: 'rose', icon: '🔴' },
                        { label: 'Total', value: stats.total, color: 'indigo', icon: '📊' },
                    ].map((s, i) => (
                        <div key={i} className="premium-card p-6 hover:scale-[1.02] transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl">{s.icon}</span>
                                <span className={`text-3xl font-black tracking-tighter text-${s.color}-500`}>{s.value}</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Panel */}
            {isFormOpen && (
                <div className="premium-card p-10 animate-fade-in-up border-l-4 border-indigo-500">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                        <RulerIcon className="text-indigo-500" /> {editingId ? 'Editar Ficha Técnica' : 'Nuevo Instrumento'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2"><label className={labelStyles}>Nombre Técnico del Instrumento</label><input required value={formData.tool} onChange={e => setFormData({ ...formData, tool: e.target.value })} className={inputStyles} placeholder="Ej: Calibrador Digital Mitutoyo" /></div>
                            <div><label className={labelStyles}>Código Interno</label><input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className={inputStyles} placeholder="Ej: MET-088" /></div>
                            <div><label className={labelStyles}>Última Intervención</label><input type="date" value={formData.lastDate} onChange={e => setFormData({ ...formData, lastDate: e.target.value })} className={inputStyles} /></div>
                            <div><label className={labelStyles}>Vencimiento del Certificado</label><input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className={inputStyles} /></div>
                            <div><label className={labelStyles}>Número de Certificado</label><input required value={formData.certificateNumber} onChange={e => setFormData({ ...formData, certificateNumber: e.target.value })} className={inputStyles} placeholder="Ej: 88219" /></div>
                            <div><label className={labelStyles}>Estado de Vigencia</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className={inputStyles}><option>Vigente</option><option>Vencido</option><option>Próximo</option><option>Mantenimiento</option></select></div>
                        </div>
                        <button type="submit" className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                            <SaveIcon /> {editingId ? 'Actualizar Ficha Técnica' : 'Incorporar al Cronograma Maestro'}
                        </button>
                    </form>
                </div>
            )}

            {/* Main Table */}
            <div className="premium-card overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-white/[0.06] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3"><CheckCircleIcon className="text-indigo-500" /> Cronograma Maestro</h3>
                    <div className="relative w-full md:w-80">
                        <input className="w-full px-10 py-3 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/40 uppercase" placeholder="BUSCAR INSTRUMENTO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 gap-3">
                            <RefreshIcon className="animate-spin text-indigo-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando...</p>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <EmptyState icon={RulerIcon} title="Sin instrumentos" subtitle="No hay equipos registrados en el sistema de metrología." actionLabel="Registrar instrumento" onAction={() => setIsFormOpen(true)} />
                    ) : filteredRecords.map(item => {
                        const daysLeft = getDaysUntilDue(item.dueDate);
                        const cfg = getStatusConfig(item.status, daysLeft);
                        return (
                            <div key={item.id} className="premium-card p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-700 dark:text-white">{item.tool}</p>
                                        <p className="text-[10px] font-mono text-indigo-500 font-bold">{item.code}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{cfg.label}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                    <span>Cert. #{item.certificateNumber}</span>
                                    <span>{daysLeft > 0 ? `${daysLeft}d restantes` : daysLeft === 0 ? 'Vence hoy' : `Vencido hace ${Math.abs(daysLeft)}d`}</span>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                                    <button onClick={() => handleEdit(item)} className="flex-1 p-2.5 bg-slate-50 dark:bg-white/[0.04] text-slate-500 rounded-xl hover:text-indigo-500 transition-all text-xs font-black"><EditIcon /></button>
                                    <button onClick={() => handleDelete(item.id)} className="flex-1 p-2.5 bg-slate-50 dark:bg-white/[0.04] text-slate-500 rounded-xl hover:text-rose-500 transition-all text-xs font-black"><DeleteIcon /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] tracking-widest">
                            <tr><th className="px-8 py-5">Instrumento / Modelo</th><th className="px-4 py-5">Código Alco</th><th className="px-4 py-5">Certificado</th><th className="px-4 py-5 text-center">Estatus</th><th className="px-4 py-5 text-center">Vencimiento</th><th className="px-8 py-5 text-right">Gestión</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-8 py-20 text-center"><div className="flex items-center justify-center gap-3"><RefreshIcon className="animate-spin text-indigo-500" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando base de datos oficial...</span></div></td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={6}><EmptyState icon={RulerIcon} title="Sin instrumentos" subtitle="No hay equipos registrados en el sistema de metrología." actionLabel="Registrar instrumento" onAction={() => setIsFormOpen(true)} /></td></tr>
                            ) : filteredRecords.map(item => {
                                const daysLeft = getDaysUntilDue(item.dueDate);
                                const cfg = getStatusConfig(item.status, daysLeft);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group">
                                        <td className="px-8 py-5 font-black text-xs uppercase text-slate-700 dark:text-slate-100">{item.tool}</td>
                                        <td className="px-4 py-5"><span className="font-mono text-xs text-indigo-500 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-lg">{item.code}</span></td>
                                        <td className="px-4 py-5 text-xs font-bold text-slate-400">#{item.certificateNumber}</td>
                                        <td className="px-4 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className={`text-[10px] font-black ${daysLeft <= 0 ? 'text-rose-500' : daysLeft <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {daysLeft > 0 ? `${daysLeft} días` : daysLeft === 0 ? 'HOY' : `${Math.abs(daysLeft)}d vencido`}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"><EditIcon /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><DeleteIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Calibration;
