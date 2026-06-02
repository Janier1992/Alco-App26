import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from './NotificationSystem';
import { MetrologyReplacementRecord } from '../types';
import { METROLOGY_SECCIONES, METROLOGY_MARCAS, EditIcon } from '../constants';
import { insforge, supabase } from '../insforgeClient';
import { exportReplacementToPDF } from '../utils/pdfExport';

const Breadcrumbs: React.FC<{ crumbs: { label: string, path?: string }[] }> = ({ crumbs }) => (
    <nav className="flex mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center">
                {i > 0 && <span className="mx-2 text-slate-600">/</span>}
                {crumb.path ? <a href={`#${crumb.path}`} className="hover:text-sky-500 transition-colors">{crumb.label}</a> : <span>{crumb.label}</span>}
            </span>
        ))}
    </nav>
);

const MOCK_REPLACEMENTS: MetrologyReplacementRecord[] = [
    {
        id: 'MET-REP-001',
        fechaRegistro: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        nombreEquipo: 'Flexómetro 8 metros',
        marca: 'STANLEY',
        codigo: 'FLEX-08-05',
        areaUso: 'CORTE DE PERFILERIA',
        nombreResponsable: 'DURANGO PUERTA DIEGO',
        motivoReposicion: 'Cinta métrica fisurada a los 1.5 metros, impidiendo lecturas precisas.',
        devuelveEquipoAnterior: 'SI',
        descripcionBaja: 'Destrucción física de cinta para evitar uso erróneo y desecho en reciclaje de metales.',
        seCobraEquipo: 'NO',
        nombreResponsableCalidad: 'YEFERSON PALACIOS',
        firmaResponsableArea: 'mock',
        firmaResponsableCalidad: 'mock'
    }
];

export default function MetrologyReplacement() {
    const { addNotification } = useNotification();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [records, setRecords] = useState<MetrologyReplacementRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRecord, setViewingRecord] = useState<MetrologyReplacementRecord | null>(null);

    const INITIAL_DATA: MetrologyReplacementRecord = {
        id: '',
        fechaRegistro: new Date().toISOString().split('T')[0],
        nombreEquipo: '',
        marca: '',
        codigo: '',
        areaUso: '',
        nombreResponsable: '',
        motivoReposicion: '',
        devuelveEquipoAnterior: 'NO',
        descripcionBaja: '',
        seCobraEquipo: 'NO',
        nombreResponsableCalidad: '',
        firmaResponsableArea: '',
        firmaResponsableCalidad: ''
    };

    const [formData, setFormData] = useState<MetrologyReplacementRecord>(INITIAL_DATA as MetrologyReplacementRecord);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Refs para Firmas y Suavizado
    const canvasAreaRef = useRef<HTMLCanvasElement>(null);
    const canvasCalidadRef = useRef<HTMLCanvasElement>(null);
    const [isDrawingArea, setIsDrawingArea] = useState(false);
    const [isDrawingCalidad, setIsDrawingCalidad] = useState(false);
    const lastPointArea = useRef<{ x: number; y: number } | null>(null);
    const lastPointCalidad = useRef<{ x: number; y: number } | null>(null);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('metrology_replacements').select('*').order('created_at', { ascending: false });
            if (error) throw error;

            const mappedRecords: MetrologyReplacementRecord[] = (data || []).map((r: any) => ({
                id: r.id,
                fechaRegistro: r.fecha_registro,
                nombreEquipo: r.nombre_equipo,
                marca: r.marca,
                codigo: r.codigo,
                areaUso: r.area_uso,
                nombreResponsable: r.nombre_responsable,
                motivoReposicion: r.motivo_reposicion,
                devuelveEquipoAnterior: r.devuelve_equipo_anterior || '',
                descripcionBaja: r.descripcion_baja,
                seCobraEquipo: r.se_cobra_equipo || '',
                nombreResponsableCalidad: r.nombre_responsable_calidad,
                firmaResponsableArea: r.firma_responsable_area_url || '',
                firmaResponsableCalidad: r.firma_responsable_calidad_url || ''
            }));

            // Guardar en caché local
            localStorage.setItem('alco_cached_metrology_replacements', JSON.stringify(mappedRecords));

            setRecords(mappedRecords);
        } catch (error: any) {
            console.error('Error fetching metrology replacements, loading fallback:', error);
            
            // Fallback 1: Intentar cargar del caché local
            const cached = localStorage.getItem('alco_cached_metrology_replacements');
            let baseRecords: MetrologyReplacementRecord[] = [];
            if (cached) {
                try {
                    baseRecords = JSON.parse(cached);
                } catch (e) {
                    console.error("Error parsing cached metrology replacements:", e);
                }
            }

            // Fallback 2: Si el caché está vacío, usar mock
            if (baseRecords.length === 0) {
                baseRecords = MOCK_REPLACEMENTS;
            }

            setRecords(baseRecords);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // Detectar si un canvas está en blanco (sin dibujo)
    const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return true;
        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] > 0) return false;
        }
        return true;
    };

    // Extraer base64 de firma (devuelve '' si está vacío)
    const getSignatureData = (ref: React.RefObject<HTMLCanvasElement>): string => {
        const canvas = ref.current;
        if (!canvas || isCanvasBlank(canvas)) return '';
        return canvas.toDataURL('image/png');
    };

    // Lógica de Firma (Reutilizable - Suavizado y Alta Definición)
    const getCoordinates = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (
        e: React.PointerEvent,
        ref: React.RefObject<HTMLCanvasElement>,
        setIsDrawing: (v: boolean) => void,
        lastPointRef: React.MutableRefObject<{ x: number; y: number } | null>
    ) => {
        setIsDrawing(true);
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            const { x, y } = getCoordinates(e, canvas);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#020617';
            ctx.shadowColor = 'rgba(2, 6, 23, 0.15)';
            ctx.shadowBlur = 1.5;
            lastPointRef.current = { x, y };
        }
    };

    const draw = (
        e: React.PointerEvent,
        ref: React.RefObject<HTMLCanvasElement>,
        isDrawing: boolean,
        lastPointRef: React.MutableRefObject<{ x: number; y: number } | null>
    ) => {
        if (!isDrawing || !lastPointRef.current) return;
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            const { x, y } = getCoordinates(e, canvas);
            const last = lastPointRef.current;
            const midX = (last.x + x) / 2;
            const midY = (last.y + y) / 2;

            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.quadraticCurveTo(last.x, last.y, midX, midY);

            const baseWidth = 3.5;
            ctx.lineWidth = e.pressure > 0 ? baseWidth + (e.pressure * 2.5) : baseWidth;

            ctx.stroke();
            lastPointRef.current = { x, y };
        }
    };

    const clearSignature = (
        ref: React.RefObject<HTMLCanvasElement>,
        lastPointRef?: React.MutableRefObject<{ x: number; y: number } | null>
    ) => {
        const ctx = ref.current?.getContext('2d');
        if (ctx && ref.current) {
            ctx.clearRect(0, 0, ref.current.width, ref.current.height);
            if (lastPointRef) lastPointRef.current = null;
        }
    };

    const resetForm = () => {
        setFormData(INITIAL_DATA as MetrologyReplacementRecord);
        setEditingId(null);
        setIsFormOpen(false);
        clearSignature(canvasAreaRef, lastPointArea);
        clearSignature(canvasCalidadRef, lastPointCalidad);
    };

    const handleEdit = (record: MetrologyReplacementRecord) => {
        const { id, firmaResponsableArea, firmaResponsableCalidad, ...data } = record;
        setFormData(record);
        setEditingId(id);
        setIsFormOpen(true);

        setTimeout(() => {
            const loadSig = (url: string, ref: React.RefObject<HTMLCanvasElement>) => {
                if (!url) return;
                const ctx = ref.current?.getContext('2d');
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => ctx?.drawImage(img, 0, 0);
                img.src = url;
            };
            if (firmaResponsableArea) loadSig(firmaResponsableArea, canvasAreaRef);
            if (firmaResponsableCalidad) loadSig(firmaResponsableCalidad, canvasCalidadRef);
        }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            addNotification({ type: 'info', title: 'PROCESANDO...', message: 'Guardando registro y firmas...' });

            // Obtener base64 de las firmas (vacío si no se dibujó nada)
            const firmaAreaData = getSignatureData(canvasAreaRef);
            const firmaCalidadData = getSignatureData(canvasCalidadRef);

            // Usar la firma del canvas si se dibujó una nueva, si no conservar la existente
            const firmaArea = firmaAreaData || formData.firmaResponsableArea || '';
            const firmaCalidad = firmaCalidadData || formData.firmaResponsableCalidad || '';

            const dbPayload = {
                fecha_registro: formData.fechaRegistro,
                nombre_equipo: formData.nombreEquipo,
                marca: formData.marca,
                codigo: formData.codigo,
                area_uso: formData.areaUso,
                nombre_responsable: formData.nombreResponsable,
                motivo_reposicion: formData.motivoReposicion,
                devuelve_equipo_anterior: formData.devuelveEquipoAnterior,
                descripcion_baja: formData.descripcionBaja,
                se_cobra_equipo: formData.seCobraEquipo,
                nombre_responsable_calidad: formData.nombreResponsableCalidad,
                firma_responsable_area_url: firmaArea,
                firma_responsable_calidad_url: firmaCalidad
            };

            let result;
            if (editingId) {
                result = await supabase.from('metrology_replacements').update(dbPayload).eq('id', editingId);
            } else {
                result = await supabase.from('metrology_replacements').insert([dbPayload]);
            }

            if (result.error) throw result.error;

            addNotification({ type: 'success', title: editingId ? 'REGISTRO ACTUALIZADO' : 'REGISTRO GUARDADO', message: `Reposición de ${formData.nombreEquipo} procesada.` });
            fetchRecords();
            resetForm();
        } catch (error: any) {
            console.error('Error saving replacement:', error);
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este registro?')) {
            try {
                const { error } = await supabase.from('metrology_replacements').delete().eq('id', id);
                if (error) throw error;
                setRecords(prev => prev.filter(r => r.id !== id));
                addNotification({ type: 'error', title: 'REGISTRO ELIMINADO', message: 'Registro eliminado de la base de datos.' });
            } catch (error) {
                addNotification({ type: 'error', title: 'ERROR', message: 'No se pudo eliminar el registro.' });
            }
        }
    };

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <>
        <div className="space-y-8 animate-fade-in pb-20">
            <Breadcrumbs crumbs={[{ label: 'Metrología', path: '/metrology' }, { label: 'Reposición y Baja' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Reposición y <span className="text-sky-600">Baja</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic">Gestión de Ciclo de Vida de Equipos</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${isFormOpen ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-sky-600 text-white shadow-sky-500/20 hover:scale-105'}`}
                >
                    {isFormOpen ? 'Cancelar' : 'Nueva Solicitud'}
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white dark:bg-[#0b0b14] border border-slate-200 dark:border-white/5 p-4 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up">
                    <div className="flex justify-center mb-8">
                        <h2 className="text-lg font-black text-slate-700 dark:text-white uppercase tracking-widest border-b-2 border-slate-100 dark:border-white/10 pb-2">Reposición y Baja de Equipos de Medición</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Fecha Registro *</label>
                                <input type="date" required value={formData.fechaRegistro} onChange={e => setFormData({ ...formData, fechaRegistro: e.target.value })} className={inputStyles} />
                            </div>
                            <div>
                                <label className={labelStyles}>Nombre Equipo *</label>
                                <input required value={formData.nombreEquipo} onChange={e => setFormData({ ...formData, nombreEquipo: e.target.value })} className={inputStyles} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Marca *</label>
                                <input list="marcas-list" required value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })} className={inputStyles} />
                                <datalist id="marcas-list">
                                    {METROLOGY_MARCAS.map(m => <option key={m} value={m} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className={labelStyles}>Código *</label>
                                <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className={inputStyles} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Proceso/Área de Uso *</label>
                                <select required value={formData.areaUso} onChange={e => setFormData({ ...formData, areaUso: e.target.value })} className={inputStyles}>
                                    <option value="">SELECCIONE...</option>
                                    {METROLOGY_SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelStyles}>Nombre del Responsable *</label>
                                <input required value={formData.nombreResponsable} onChange={e => setFormData({ ...formData, nombreResponsable: e.target.value })} className={inputStyles} />
                            </div>
                        </div>

                        <div>
                            <label className={labelStyles}>Descripción Motivo de Reposición *</label>
                            <textarea required value={formData.motivoReposicion} onChange={e => setFormData({ ...formData, motivoReposicion: e.target.value })} className={`${inputStyles} h-24 resize-none`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>¿Devuelve Equipo Anterior?</label>
                                <select value={formData.devuelveEquipoAnterior} onChange={e => setFormData({ ...formData, devuelveEquipoAnterior: e.target.value as any })} className={inputStyles}>
                                    <option value="">Seleccione</option>
                                    <option value="SI">SI</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelStyles}>Descripción Baja del Equipo y Disposición Final</label>
                            <textarea value={formData.descripcionBaja} onChange={e => setFormData({ ...formData, descripcionBaja: e.target.value })} className={`${inputStyles} h-24 resize-none`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>¿Se Cobra Equipo?</label>
                                <select value={formData.seCobraEquipo} onChange={e => setFormData({ ...formData, seCobraEquipo: e.target.value as any })} className={inputStyles}>
                                    <option value="">Seleccione</option>
                                    <option value="SI">SI</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelStyles}>Nombre Responsable Calidad *</label>
                                <input required value={formData.nombreResponsableCalidad} onChange={e => setFormData({ ...formData, nombreResponsableCalidad: e.target.value })} className={inputStyles} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
                            {/* Firma Responsable Área */}
                            <div className="space-y-3">
                                <label className={`${labelStyles} text-center mb-1 block`}>✍️ Firma Responsable Proceso/Área *</label>
                                <div className="relative rounded-2xl overflow-hidden shadow-inner border-2 border-sky-200 dark:border-sky-700/50 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900" style={{ height: '200px' }}>
                                    <div className="absolute bottom-10 left-6 right-6 border-b-2 border-dashed border-slate-200/80 dark:border-slate-600/60 z-10 pointer-events-none" />
                                    <p className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] pointer-events-none z-10">FIRME AQUÍ</p>
                                    <canvas
                                        ref={canvasAreaRef}
                                        width={800}
                                        height={400}
                                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none"
                                        style={{ touchAction: 'none' }}
                                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startDrawing(e, canvasAreaRef, setIsDrawingArea, lastPointArea); }}
                                        onPointerMove={(e) => draw(e, canvasAreaRef, isDrawingArea, lastPointArea)}
                                        onPointerUp={() => setIsDrawingArea(false)}
                                        onPointerLeave={() => setIsDrawingArea(false)}
                                        onPointerCancel={() => setIsDrawingArea(false)}
                                    />
                                    <button type="button" onClick={() => clearSignature(canvasAreaRef, lastPointArea)} className="absolute top-2 right-2 z-20 p-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-xl hover:text-rose-500 text-slate-400 shadow-sm transition-all hover:scale-105" title="Limpiar firma"><i className="fas fa-redo-alt text-xs"></i></button>
                                </div>
                            </div>

                            {/* Firma Responsable Calidad */}
                            <div className="space-y-3">
                                <label className={`${labelStyles} text-center mb-1 block`}>✍️ Firma Responsable Calidad *</label>
                                <div className="relative rounded-2xl overflow-hidden shadow-inner border-2 border-emerald-200 dark:border-emerald-700/50 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900" style={{ height: '200px' }}>
                                    <div className="absolute bottom-10 left-6 right-6 border-b-2 border-dashed border-slate-200/80 dark:border-slate-600/60 z-10 pointer-events-none" />
                                    <p className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] pointer-events-none z-10">FIRME AQUÍ</p>
                                    <canvas
                                        ref={canvasCalidadRef}
                                        width={800}
                                        height={400}
                                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none"
                                        style={{ touchAction: 'none' }}
                                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startDrawing(e, canvasCalidadRef, setIsDrawingCalidad, lastPointCalidad); }}
                                        onPointerMove={(e) => draw(e, canvasCalidadRef, isDrawingCalidad, lastPointCalidad)}
                                        onPointerUp={() => setIsDrawingCalidad(false)}
                                        onPointerLeave={() => setIsDrawingCalidad(false)}
                                        onPointerCancel={() => setIsDrawingCalidad(false)}
                                    />
                                    <button type="button" onClick={() => clearSignature(canvasCalidadRef, lastPointCalidad)} className="absolute top-2 right-2 z-20 p-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-xl hover:text-rose-500 text-slate-400 shadow-sm transition-all hover:scale-105" title="Limpiar firma"><i className="fas fa-redo-alt text-xs"></i></button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-center">
                            <button type="submit" className="w-full md:w-auto px-12 py-4 bg-[#00c853] text-white font-black uppercase text-sm tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3">
                                <i className="fas fa-paper-plane"></i>
                                Enviar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Historial de Registros */}
            <div className="mt-12">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <i className="fas fa-history text-slate-400"></i>
                    Historial de Bajas y Reposiciones
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Equipo</th>
                                <th className="p-4">Responsable</th>
                                <th className="p-4">Motivo</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#0b0b14] divide-y divide-slate-100 dark:divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400 uppercase animate-pulse">Cargando historial...</td></tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No hay registros</td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">{record.fechaRegistro}</td>
                                        <td className="p-4">
                                            <div className="text-xs font-black text-slate-800 dark:text-white uppercase">{record.nombreEquipo}</div>
                                            <div className="text-[10px] font-bold text-slate-400">{record.marca} - {record.codigo}</div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">{record.nombreResponsable}</td>
                                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-xs">{record.motivoReposicion}</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => setViewingRecord(record)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-500 hover:text-white transition-all shadow-sm mr-2" title="Ver detalle">
                                                <i className="fas fa-eye text-xs"></i>
                                            </button>
                                            <button onClick={async () => await exportReplacementToPDF(record)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm mr-2" title="Exportar PDF">
                                                <i className="fas fa-file-pdf text-xs"></i>
                                            </button>
                                            <button onClick={() => handleEdit(record)} className="text-sky-400 hover:text-sky-500 transition-colors mr-3">
                                                <EditIcon />
                                            </button>
                                            <button onClick={() => handleDelete(record.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                <i className="fas fa-trash-can"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* ===== MODAL VER REGISTRO BAJA/REPOSICIÓN ===== */}
        {viewingRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewingRecord(null)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative bg-white dark:bg-[#0d0d1a] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-[#0d0d1a] px-8 py-6 border-b dark:border-white/5 flex items-center justify-between rounded-t-3xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                <i className="fas fa-exchange-alt text-amber-500"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acta de Baja / Reposición</p>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{viewingRecord.id}</h2>
                            </div>
                        </div>
                        <button onClick={() => setViewingRecord(null)} className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-all">
                            <i className="fas fa-times text-sm"></i>
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Info general */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Fecha Registro', value: viewingRecord.fechaRegistro },
                                { label: 'Área de Uso', value: viewingRecord.areaUso },
                                { label: 'Se cobra equipo', value: viewingRecord.seCobraEquipo },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-4 border dark:border-white/5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{value || '—'}</p>
                                </div>
                            ))}
                        </div>

                        {/* Equipo */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-6 border border-amber-100 dark:border-amber-700/20">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4">🔧 Datos del Equipo</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Nombre</p><p className="text-xs font-black text-slate-800 dark:text-white uppercase">{viewingRecord.nombreEquipo}</p></div>
                                <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Marca</p><p className="text-xs font-black text-slate-800 dark:text-white uppercase">{viewingRecord.marca}</p></div>
                                <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Código</p><p className="text-xs font-mono font-black text-sky-600">{viewingRecord.codigo}</p></div>
                            </div>
                        </div>

                        {/* Motivo y baja */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-5 border dark:border-white/5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Motivo de Reposición</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300">{viewingRecord.motivoReposicion || '—'}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-5 border dark:border-white/5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Descripción de Baja</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300">{viewingRecord.descripcionBaja || '—'}</p>
                            </div>
                        </div>

                        {/* Responsables */}
                        <div className="bg-sky-50 dark:bg-sky-900/10 rounded-2xl p-6 border border-sky-100 dark:border-sky-700/20">
                            <p className="text-[9px] font-black text-sky-500 uppercase tracking-[0.2em] mb-4">👤 Responsables</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Resp. Proceso/Área</p><p className="text-xs font-black text-slate-800 dark:text-white uppercase">{viewingRecord.nombreResponsable}</p></div>
                                <div><p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Resp. Calidad</p><p className="text-xs font-black text-slate-800 dark:text-white uppercase">{viewingRecord.nombreResponsableCalidad || '—'}</p></div>
                            </div>
                        </div>

                        {/* Firmas */}
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">✍️ Firmas del Acta</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma Responsable Área</p>
                                    <div className="h-36 rounded-2xl border-2 border-sky-100 dark:border-sky-700/20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 overflow-hidden flex items-center justify-center">
                                        {viewingRecord.firmaResponsableArea && viewingRecord.firmaResponsableArea !== 'mock' ? (
                                            <img src={viewingRecord.firmaResponsableArea} alt="Firma área" className="max-h-full max-w-full object-contain p-2" />
                                        ) : viewingRecord.firmaResponsableArea === 'mock' ? (
                                            <span className="text-emerald-500 font-black text-xs uppercase flex items-center gap-2"><i className="fas fa-check-circle"></i> Firmado</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs font-bold uppercase">Sin firma</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma Responsable Calidad</p>
                                    <div className="h-36 rounded-2xl border-2 border-emerald-100 dark:border-emerald-700/20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 overflow-hidden flex items-center justify-center">
                                        {viewingRecord.firmaResponsableCalidad && viewingRecord.firmaResponsableCalidad !== 'mock' ? (
                                            <img src={viewingRecord.firmaResponsableCalidad} alt="Firma calidad" className="max-h-full max-w-full object-contain p-2" />
                                        ) : viewingRecord.firmaResponsableCalidad === 'mock' ? (
                                            <span className="text-emerald-500 font-black text-xs uppercase flex items-center gap-2"><i className="fas fa-check-circle"></i> Firmado</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs font-bold uppercase">Sin firma</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { setViewingRecord(null); handleEdit(viewingRecord); }} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                <EditIcon /> Editar Registro
                            </button>
                            <button onClick={() => setViewingRecord(null)} className="px-8 py-4 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] transition-all">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
