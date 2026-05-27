
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

const MOCK_CALIBRATIONS: CalibrationRecord[] = [
    {
        id: 'mock-cal-1',
        tool: 'Flexómetro 8 metros Stanley',
        code: 'FLEX-08-05',
        lastDate: new Date(Date.now() - 86400000 * 90).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 86400000 * 275).toISOString().split('T')[0],
        status: 'Vigente',
        certificateNumber: '88219'
    },
    {
        id: 'mock-cal-2',
        tool: 'Calibrador Pie de Rey Digital Wurth',
        code: 'CAL-DIG-02',
        lastDate: new Date(Date.now() - 86400000 * 180).toISOString().split('T')[0],
        dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        status: 'Vencido',
        certificateNumber: '91032'
    },
    {
        id: 'mock-cal-3',
        tool: 'Goniómetro Universal de Precisión',
        code: 'GON-PRE-01',
        lastDate: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 86400000 * 335).toISOString().split('T')[0],
        status: 'Vigente',
        certificateNumber: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='
    }
];

const Calibration: React.FC = () => {
    const { addNotification } = useNotification();
    const { confirm } = useConfirmDialog();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [records, setRecords] = useState<CalibrationRecord[]>([]);
    const [viewingCertificate, setViewingCertificate] = useState<{ certData: string; toolName: string } | null>(null);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('metrology_calibration').select('*').order('due_date', { ascending: true });
            if (error) throw error;
            const mappedRecords: CalibrationRecord[] = (data || []).map((r: any) => ({
                id: r.id, tool: r.tool, code: r.code, lastDate: r.last_date,
                dueDate: r.due_date, status: r.status, certificateNumber: r.certificate_number
            }));

            // Guardar en caché local
            localStorage.setItem('alco_cached_metrology_calibration', JSON.stringify(mappedRecords));

            setRecords(mappedRecords);
        } catch (error: any) {
            console.error('Error fetching calibration, loading fallback:', error);
            
            // Fallback 1: Intentar cargar del caché local
            const cached = localStorage.getItem('alco_cached_metrology_calibration');
            let baseRecords: CalibrationRecord[] = [];
            if (cached) {
                try {
                    baseRecords = JSON.parse(cached);
                } catch (e) {
                    console.error("Error parsing cached metrology calibration:", e);
                }
            }

            // Fallback 2: Si el caché está vacío, usar mock
            if (baseRecords.length === 0) {
                baseRecords = MOCK_CALIBRATIONS;
            }

            setRecords(baseRecords);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            addNotification({ type: 'error', title: 'Archivo muy grande', message: 'El certificado no debe superar los 5MB.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setFormData(prev => ({ ...prev, certificateNumber: reader.result as string }));
                addNotification({ type: 'success', title: 'CERTIFICADO CARGADO', message: `Se ha adjuntado: ${file.name}` });
            }
        };
        reader.onerror = () => {
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo leer el archivo.' });
        };
        reader.readAsDataURL(file);
    };

    const viewCertificate = (certData: string, toolName: string) => {
        if (!certData) return;
        setViewingCertificate({ certData, toolName });
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
                tool: formData.tool, code: formData.code, last_date: formData.lastDate,
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
                            <div className="lg:col-span-3">
                                <label className={labelStyles}>Certificado de Calibración *</label>
                                <div className="relative border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-6 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-indigo-50/20 dark:hover:bg-indigo-500/[0.02] transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
                                    <input 
                                        type="file" 
                                        required={!editingId && !formData.certificateNumber} 
                                        accept="image/*,application/pdf" 
                                        onChange={handleFileChange} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    />
                                    {formData.certificateNumber ? (
                                        <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                                            {formData.certificateNumber.startsWith('data:') ? (
                                                <>
                                                    <span className="text-3xl text-emerald-500">📎</span>
                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">¡CERTIFICADO ADJUNTADO CON ÉXITO!</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">HAZ CLIC O ARRASTRA PARA REEMPLAZAR EL ARCHIVO</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-3xl text-indigo-500">📝</span>
                                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">NÚMERO DE CERTIFICADO: {formData.certificateNumber}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">HAZ CLIC O ARRASTRA PARA ADJUNTAR UN ARCHIVO (PDF / IMAGEN)</span>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                                            <span className="text-3xl text-slate-400 group-hover:scale-110 transition-transform">📤</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">SELECCIONAR ARCHIVO</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">SOPORTA PDF E IMÁGENES HASTA 5MB</span>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                    <div>
                                        {item.certificateNumber ? (
                                            item.certificateNumber.startsWith('data:') ? (
                                                <button onClick={() => viewCertificate(item.certificateNumber, item.tool)} className="inline-flex items-center gap-1 text-indigo-500 font-black hover:underline">
                                                    📎 VER CERTIFICADO
                                                </button>
                                            ) : (
                                                <span onClick={() => viewCertificate(item.certificateNumber, item.tool)} className="cursor-pointer hover:underline text-indigo-500 font-bold">Cert. #{item.certificateNumber}</span>
                                            )
                                        ) : (
                                            <span className="text-slate-300">SIN CERTIFICADO</span>
                                        )}
                                    </div>
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
                                        <td className="px-4 py-5 text-xs font-bold">
                                            {item.certificateNumber ? (
                                                item.certificateNumber.startsWith('data:') ? (
                                                    <button onClick={() => viewCertificate(item.certificateNumber, item.tool)} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-xl text-[10px] font-black border border-indigo-150 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Ver Certificado">
                                                        <i className="fas fa-file-pdf"></i> VER CERTIFICADO
                                                    </button>
                                                ) : (
                                                    <button onClick={() => viewCertificate(item.certificateNumber, item.tool)} className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-200 dark:border-white/10 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Ver Número">
                                                        #{item.certificateNumber}
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-slate-300 uppercase">—</span>
                                            )}
                                        </td>
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

            {/* ===== VISOR DE CERTIFICADO INTEGRADO ===== */}
            {viewingCertificate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingCertificate(null)}>
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
                    <div className="relative bg-white dark:bg-[#0d0d1a] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="bg-slate-50 dark:bg-[#0d0d1a] px-8 py-6 border-b dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <RulerIcon className="text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visor de Certificado</p>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{viewingCertificate.toolName}</h2>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {viewingCertificate.certData.startsWith('data:') && (
                                    <a 
                                        href={viewingCertificate.certData} 
                                        download={`Certificado_${viewingCertificate.toolName.replace(/\s+/g, '_')}`}
                                        className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center hover:bg-indigo-600 hover:text-white text-indigo-500 dark:text-indigo-400 transition-all"
                                        title="Descargar Certificado"
                                    >
                                        <DownloadIcon className="scale-75" />
                                    </a>
                                )}
                                <button onClick={() => setViewingCertificate(null)} className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-all">
                                    <i className="fas fa-times text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Content Preview */}
                        <div className="flex-1 p-6 bg-slate-100 dark:bg-[#06060c] flex items-center justify-center min-h-[400px] max-h-[65vh] overflow-y-auto">
                            {viewingCertificate.certData.startsWith('data:') ? (
                                viewingCertificate.certData.startsWith('data:application/pdf') ? (
                                    <iframe 
                                        src={viewingCertificate.certData} 
                                        className="w-full h-[60vh] rounded-2xl border-0 bg-white"
                                        title="Certificado PDF"
                                    />
                                ) : (
                                    <img 
                                        src={viewingCertificate.certData} 
                                        alt="Certificado de Calibración" 
                                        className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-lg border dark:border-white/10"
                                    />
                                )
                            ) : (
                                <div className="text-center p-8 space-y-4">
                                    <div className="text-4xl">📝</div>
                                    <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">Certificado Histórico</h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                        Este registro proviene de un sistema anterior y tiene asignado únicamente el número de certificado: 
                                        <span className="block mt-2 font-mono text-sm font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-lg max-w-xs mx-auto">
                                            #{viewingCertificate.certData}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t dark:border-white/5 bg-slate-50 dark:bg-[#0d0d1a] flex justify-end">
                            <button onClick={() => setViewingCertificate(null)} className="px-8 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/20 transition-all">
                                Cerrar Visor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calibration;
