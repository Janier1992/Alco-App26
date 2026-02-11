import React, { useState, useRef, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import {
    METROLOGY_MARCAS, METROLOGY_MEDIDAS, METROLOGY_SECCIONES,
    METROLOGY_ASIGNADOS, METROLOGY_OBSERVACIONES_OPTIONS,
    SaveIcon, RefreshIcon, RulerIcon, TrashIcon, SearchIcon, EditIcon
} from '../constants';
import { useNotification } from './NotificationSystem';
import type { MetrologyRecord, MetrologyItem } from '../types';

const Metrology: React.FC = () => {
    const { addNotification } = useNotification();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [records, setRecords] = useState<MetrologyRecord[]>(() => {
        const saved = localStorage.getItem('alco_metrology_v3');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado inicial del formulario

    // Estado inicial del formulario
    const INITIAL_ITEM: MetrologyItem = {
        equipoNombre: '',
        marca: '',
        cantidad: 1,
        observaciones: ''
    };

    const INITIAL_DATA = {
        fecha: new Date().toISOString().split('T')[0],
        area: 'CALIDAD',
        sede: '',
        receptorNombre: '',
        receptorCedula: '',
        receptorCargo: '',
        items: [INITIAL_ITEM]
    };

    const [formData, setFormData] = useState<Omit<MetrologyRecord, 'id' | 'firmaEntrega' | 'firmaRecibe'>>(INITIAL_DATA);

    // Refs para Firmas
    const canvasEntregaRef = useRef<HTMLCanvasElement>(null);
    const canvasRecibeRef = useRef<HTMLCanvasElement>(null);
    const [isDrawingEntrega, setIsDrawingEntrega] = useState(false);
    const [isDrawingRecibe, setIsDrawingRecibe] = useState(false);

    useEffect(() => {
        localStorage.setItem('alco_metrology_v3', JSON.stringify(records));
    }, [records]);

    // Gestión de Items
    const handleAddItem = () => {
        setFormData(prev => ({ ...prev, items: [...prev.items, INITIAL_ITEM] }));
    };

    const handleRemoveItem = (index: number) => {
        if (formData.items.length === 1) return;
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleItemChange = (index: number, field: keyof MetrologyItem, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    // Lógica de Firma (Reutilizable)
    const getCoordinates = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.PointerEvent, ref: React.RefObject<HTMLCanvasElement>, setIsDrawing: (v: boolean) => void) => {
        setIsDrawing(true);
        const ctx = ref.current?.getContext('2d');
        if (ctx && ref.current) {
            const { x, y } = getCoordinates(e, ref.current);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#0f172a';
        }
    };

    const draw = (e: React.PointerEvent, ref: React.RefObject<HTMLCanvasElement>, isDrawing: boolean) => {
        if (!isDrawing) return;
        const ctx = ref.current?.getContext('2d');
        if (ctx && ref.current) {
            const { x, y } = getCoordinates(e, ref.current);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const clearSignature = (ref: React.RefObject<HTMLCanvasElement>) => {
        const ctx = ref.current?.getContext('2d');
        if (ctx && ref.current) {
            ctx.clearRect(0, 0, ref.current.width, ref.current.height);
        }
    };

    const resetForm = () => {
        setFormData(INITIAL_DATA);
        setEditingId(null);
        setIsFormOpen(false);
        clearSignature(canvasEntregaRef);
        clearSignature(canvasRecibeRef);
    };

    const handleEdit = (record: MetrologyRecord) => {
        const { id, firmaEntrega, firmaRecibe, ...data } = record;
        setFormData(data);
        setEditingId(id);
        setIsFormOpen(true);

        // Cargar firmas existentes
        setTimeout(() => {
            const loadSig = (url: string, ref: React.RefObject<HTMLCanvasElement>) => {
                const ctx = ref.current?.getContext('2d');
                const img = new Image();
                img.onload = () => ctx?.drawImage(img, 0, 0);
                img.src = url;
            };
            if (firmaEntrega) loadSig(firmaEntrega, canvasEntregaRef);
            if (firmaRecibe) loadSig(firmaRecibe, canvasRecibeRef);
        }, 100);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta acta de entrega?')) {
            setRecords(prev => prev.filter(r => r.id !== id));
            addNotification({ type: 'error', title: 'ACTA ELIMINADA', message: 'Registro eliminado del libro maestro.' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const firmaEntrega = canvasEntregaRef.current?.toDataURL() || '';
        const firmaRecibe = canvasRecibeRef.current?.toDataURL() || '';

        const recordHeader = editingId ? { id: editingId } : { id: `ACTA-${Date.now()}` };

        const newRecord: MetrologyRecord = {
            ...recordHeader,
            firmaEntrega,
            firmaRecibe,
            ...formData
        } as MetrologyRecord;

        if (editingId) {
            setRecords(prev => prev.map(r => r.id === editingId ? newRecord : r));
            addNotification({ type: 'success', title: 'REGISTRO ACTUALIZADO', message: `Acta de ${formData.receptorNombre} actualizada.` });
        } else {
            setRecords([newRecord, ...records]);
            addNotification({ type: 'success', title: 'ACTA GENERADA', message: `Asignación a ${formData.receptorNombre} registrada correctamente.` });
        }

        resetForm();
    };

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <Breadcrumbs crumbs={[{ label: 'Metrología', path: '/dashboard' }, { label: 'Asignación de Activos' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Acta de <span className="text-sky-600">Entrega</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic">Gestión de Herramientas y Equipos - Transversal SGC</p>
                </div>
                <button onClick={() => isFormOpen ? resetForm() : setIsFormOpen(true)} className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${isFormOpen ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-sky-600 text-white shadow-sky-500/20 hover:scale-105'}`}>
                    {isFormOpen ? 'Cancelar' : 'Nueva Asignación'}
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-[#0b0b14] border border-slate-200 dark:border-white/5 p-4 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* SECCIÓN 1: ENCABEZADO */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] border-b dark:border-white/5 pb-2">1. Datos Generales y del Receptor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label className={labelStyles}>Fecha</label><input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} className={inputStyles} /></div>
                                <div><label className={labelStyles}>Área</label><select value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} className={inputStyles}><option value="">SELECCIONE...</option>{METROLOGY_SECCIONES.map(s => <option key={s}>{s}</option>)}</select></div>
                                <div><label className={labelStyles}>Sede</label><select value={formData.sede} onChange={e => setFormData({ ...formData, sede: e.target.value })} className={inputStyles}><option value="">SELECCIONE...</option><option>PLANTA SABANETA</option><option>PLANTA FUNZA</option></select></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className={labelStyles}>Nombre y Apellidos</label><input value={formData.receptorNombre} onChange={e => setFormData({ ...formData, receptorNombre: e.target.value })} className={inputStyles} /></div>
                                <div><label className={labelStyles}>Cédula</label><input value={formData.receptorCedula} onChange={e => setFormData({ ...formData, receptorCedula: e.target.value })} className={inputStyles} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className={labelStyles}>Cargo</label><input value={formData.receptorCargo} onChange={e => setFormData({ ...formData, receptorCargo: e.target.value })} className={inputStyles} /></div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DETALLE DEL EQUIPO */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b dark:border-white/5 pb-2">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">2. Detalle del Equipo / Herramienta</h3>
                                <button type="button" onClick={handleAddItem} className="px-4 py-2 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition-colors">+ Agregar Ítem</button>
                            </div>

                            <div className="space-y-4">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 relative group animate-fade-in">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-3 -right-3 size-8 bg-rose-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-10" title="Eliminar ítem">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                            <div className="md:col-span-1 flex items-center justify-center"><span className="size-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black">{index + 1}</span></div>
                                            <div className="md:col-span-5"><label className={labelStyles}>Nombre Herramienta / Equipo</label><input value={item.equipoNombre} onChange={e => handleItemChange(index, 'equipoNombre', e.target.value)} className={inputStyles} /></div>
                                            <div className="md:col-span-4"><label className={labelStyles}>Marca</label><select value={item.marca} onChange={e => handleItemChange(index, 'marca', e.target.value)} className={inputStyles}><option value="">SELECCIONE...</option>{METROLOGY_MARCAS.map(m => <option key={m}>{m}</option>)}</select></div>
                                            <div className="md:col-span-2"><label className={labelStyles}>Cant</label><input type="number" min="1" value={item.cantidad} onChange={e => handleItemChange(index, 'cantidad', parseInt(e.target.value))} className={inputStyles} /></div>
                                            <div className="md:col-span-12 pl-0 md:pl-[4.5rem]">
                                                <label className={labelStyles}>Observaciones</label>
                                                <input list={`obs-list-${index}`} value={item.observaciones} onChange={e => handleItemChange(index, 'observaciones', e.target.value)} placeholder="Estado del equipo..." className={inputStyles} />
                                                <datalist id={`obs-list-${index}`}>
                                                    {METROLOGY_OBSERVACIONES_OPTIONS.map((opt, i) => <option key={i} value={opt} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SECCIÓN 3: FIRMAS */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] border-b dark:border-white/5 pb-2">3. Conformidad y Entrega</h3>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl mb-6">
                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase leading-relaxed">
                                    "La persona quien recibe las herramientas y/o equipos es responsable del correcto uso y cuidado de las mismas. En cumplimiento al reglamento interno, se compromete a custodiar y almacenar adecuadamente los ítems. En caso de incumplimiento, debe asumir los costos pertinentes."
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Firma Entrega */}
                                <div className="space-y-2">
                                    <label className={labelStyles}>Firma Quien Entrega (Gestor SGC)</label>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 relative overflow-hidden h-40">
                                        <canvas
                                            ref={canvasEntregaRef}
                                            width={400}
                                            height={160}
                                            className="w-full h-full cursor-crosshair touch-none"
                                            onPointerDown={(e) => startDrawing(e, canvasEntregaRef, setIsDrawingEntrega)}
                                            onPointerMove={(e) => draw(e, canvasEntregaRef, isDrawingEntrega)}
                                            onPointerUp={() => setIsDrawingEntrega(false)}
                                            onPointerLeave={() => setIsDrawingEntrega(false)}
                                        />
                                        <button type="button" onClick={() => clearSignature(canvasEntregaRef)} className="absolute top-2 right-2 p-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:text-rose-500 text-slate-400"><RefreshIcon className="scale-75" /></button>
                                    </div>
                                </div>

                                {/* Firma Recibe */}
                                <div className="space-y-2">
                                    <label className={labelStyles}>Firma Quien Recibe (Colaborador)</label>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 relative overflow-hidden h-40">
                                        <canvas
                                            ref={canvasRecibeRef}
                                            width={400}
                                            height={160}
                                            className="w-full h-full cursor-crosshair touch-none"
                                            onPointerDown={(e) => startDrawing(e, canvasRecibeRef, setIsDrawingRecibe)}
                                            onPointerMove={(e) => draw(e, canvasRecibeRef, isDrawingRecibe)}
                                            onPointerUp={() => setIsDrawingRecibe(false)}
                                            onPointerLeave={() => setIsDrawingRecibe(false)}
                                        />
                                        <button type="button" onClick={() => clearSignature(canvasRecibeRef)} className="absolute top-2 right-2 p-2 bg-slate-100 dark:bg-white/10 rounded-lg hover:text-rose-500 text-slate-400"><RefreshIcon className="scale-75" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/20 active:scale-95 transition-all hover:scale-[1.01]"><SaveIcon /> Registrar Acta de Entrega</button>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-[#0b0b14] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl">
                <div className="p-8 border-b dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3"><RulerIcon className="text-sky-600" /> Archivo de Actas</h3>
                    <div className="relative"><input className="px-10 py-2.5 bg-white dark:bg-[#1a1a24] border dark:border-white/10 rounded-xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-sky-500 uppercase" placeholder="BUSCAR POR RECEPTOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-white/5">
                            <tr><th className="px-8 py-6">Fecha / ID</th><th className="px-6 py-6">Receptor</th><th className="px-6 py-6">Items Asignados</th><th className="px-6 py-6 text-center">Firmas</th><th className="px-8 py-6 text-right">Gestión</th></tr>
                        </thead>
                        <tbody className="divide-y dark:divide-white/5">
                            {records.filter(r => r.receptorNombre.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-6 font-mono text-xs font-bold"><p className="text-slate-400 mb-1">{r.fecha}</p><span className="text-sky-600 uppercase bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded">{r.id}</span></td>
                                    <td className="px-6 py-6">
                                        <p className="font-black text-xs uppercase text-slate-800 dark:text-white">{r.receptorNombre}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{r.receptorCargo}</p>
                                    </td>
                                    <td className="px-6 py-6">
                                        {r.items.map((item, idx) => (
                                            <div key={idx} className="mb-2 last:mb-0">
                                                <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">• {item.cantidad}x {item.equipoNombre}</p>
                                                <p className="text-[9px] uppercase text-slate-500 pl-2">{item.marca} - {item.observaciones.substring(0, 25)}...</p>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex justify-center gap-2">
                                            {r.firmaRecibe ? <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100" title="Firmado"><i className="fas fa-file-signature text-xs"></i></div> : <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button onClick={() => handleEdit(r)} className="p-3 bg-sky-50 text-sky-500 rounded-xl hover:bg-sky-500 hover:text-white transition-all shadow-sm mr-2"><EditIcon /></button>
                                        <button onClick={() => handleDelete(r.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 text-xs font-bold uppercase opacity-50">No hay actas registradas</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Metrology;
