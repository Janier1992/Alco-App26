
import React, { useState, useMemo, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { 
    RulerIcon, CheckCircleIcon, ExclamationTriangleIcon, SearchIcon, 
    RefreshIcon, PlusIcon, SaveIcon, EditIcon, DeleteIcon, DownloadIcon 
} from '../constants';
import { useNotification } from './NotificationSystem';

interface CalibrationRecord {
    id: string;
    tool: string;
    code: string;
    lastDate: string;
    dueDate: string;
    status: 'Vigente' | 'Vencido' | 'Próximo' | 'Mantenimiento';
    certificateNumber: string;
}

const Calibration: React.FC = () => {
    const { addNotification } = useNotification();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [records, setRecords] = useState<CalibrationRecord[]>(() => {
        const saved = localStorage.getItem('alco_calibration_v2');
        return saved ? JSON.parse(saved) : [
            { id: '1', tool: 'Calibrador Digital Mitutoyo 150mm', code: 'MET-042', lastDate: '2023-08-15', dueDate: '2024-08-15', status: 'Vigente', certificateNumber: '88219' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('alco_calibration_v2', JSON.stringify(records));
    }, [records]);

    const [formData, setFormData] = useState<Omit<CalibrationRecord, 'id'>>({
        tool: '', code: '', lastDate: '', dueDate: '', status: 'Vigente', certificateNumber: ''
    });

    const handleEdit = (record: CalibrationRecord) => {
        setEditingId(record.id);
        setFormData({ ...record });
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar permanentemente este registro de calibración?')) {
            setRecords(prev => prev.filter(r => r.id !== id));
            addNotification({ type: 'error', title: 'EQUIPO ELIMINADO', message: 'El instrumento ha sido removido del cronograma oficial.' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            setRecords(prev => prev.map(r => r.id === editingId ? { ...formData, id: editingId } : r));
            addNotification({ type: 'success', title: 'REGISTRO ACTUALIZADO', message: 'Información técnica corregida.' });
        } else {
            const newRecord: CalibrationRecord = { ...formData, id: Date.now().toString() };
            setRecords(prev => [newRecord, ...prev]);
            addNotification({ type: 'success', title: 'EQUIPO REGISTRADO', message: 'Nuevo instrumento incorporado al control SGC.' });
        }
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({ tool: '', code: '', lastDate: '', dueDate: '', status: 'Vigente', certificateNumber: '' });
    };

    const filteredRecords = records.filter(r => 
        r.tool.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none uppercase transition-all";

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'METROLOGÍA', path: '/metrology' }, { label: 'CALIBRACIÓN' }]} />
            
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Control de <span className="text-sky-600">Calibración</span></h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">Aseguramiento de la validez de los resultados (ISO 9001 7.1.5)</p>
                </div>
                <button onClick={() => setIsFormOpen(!isFormOpen)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all ${isFormOpen ? 'bg-rose-500 text-white' : 'bg-sky-600 text-white hover:scale-105 shadow-sky-600/20'}`}>
                    {isFormOpen ? 'Cerrar Panel' : <><PlusIcon /> Vincular Instrumento</>}
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl animate-fade-in-up border border-sky-500/20">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Nombre Técnico del Instrumento</label><input required value={formData.tool} onChange={e => setFormData({...formData, tool: e.target.value})} className={inputStyles} placeholder="Ej: Calibrador Digital Mitutoyo" /></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Código Interno</label><input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className={inputStyles} placeholder="Ej: MET-088" /></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Última Intervención</label><input type="date" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} className={inputStyles} /></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Vencimiento del Certificado</label><input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={inputStyles} /></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Estado de Vigencia</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className={inputStyles}><option>Vigente</option><option>Vencido</option><option>Próximo</option><option>Mantenimiento</option></select></div>
                        </div>
                        <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-600/20 active:scale-95 transition-all"><SaveIcon /> {editingId ? 'Actualizar Ficha Técnica' : 'Incorporar al Cronograma Maestro'}</button>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border shadow-xl overflow-hidden border-slate-100 dark:border-slate-700">
                <div className="p-8 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3"><CheckCircleIcon className="text-sky-600" /> Cronograma de Calibración Planta Alco</h3>
                    <div className="relative"><input className="px-10 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-sky-500" placeholder="BUSCAR INSTRUMENTO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                            <tr><th className="px-8 py-6">Instrumento / Modelo</th><th className="px-4 py-6">Código Alco</th><th className="px-4 py-6">Vencimiento</th><th className="px-4 py-6 text-center">Estatus ISO</th><th className="px-8 py-6 text-right">Gestión</th></tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {filteredRecords.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center opacity-30 text-xs font-black uppercase">Sin equipos registrados en el sistema de metrología</td></tr>
                            ) : filteredRecords.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                    <td className="px-8 py-6 font-black text-xs uppercase text-slate-700 dark:text-slate-100">{item.tool}</td>
                                    <td className="px-4 py-6 font-mono text-xs text-sky-600 font-bold bg-sky-50 dark:bg-sky-900/20">{item.code}</td>
                                    <td className="px-4 py-6 text-xs font-bold text-slate-500">{item.dueDate}</td>
                                    <td className="px-4 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'Vigente' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm"><EditIcon /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><DeleteIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Calibration;
