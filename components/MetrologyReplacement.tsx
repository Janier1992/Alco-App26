import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from './NotificationSystem';
import { MetrologyReplacementRecord } from '../types';
import { METROLOGY_SECCIONES, METROLOGY_MARCAS, EditIcon } from '../constants';
import { insforge, supabase } from '../insforgeClient';

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

export default function MetrologyReplacement() {
    const { addNotification } = useNotification();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [records, setRecords] = useState<MetrologyReplacementRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    // Refs para Firmas
    const canvasAreaRef = useRef<HTMLCanvasElement>(null);
    const canvasCalidadRef = useRef<HTMLCanvasElement>(null);
    const [isDrawingArea, setIsDrawingArea] = useState(false);
    const [isDrawingCalidad, setIsDrawingCalidad] = useState(false);

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

            setRecords(mappedRecords);
        } catch (error: any) {
            console.error('Error fetching metrology replacements:', error);
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: 'No se pudieron recuperar los registros de reposición.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // Helper to upload base64 signature to Insforge Storage
    const uploadSignature = async (base64: string, prefix: string) => {
        if (!base64 || base64.length < 100) return '';
        try {
            const fileName = `rep_${prefix}_${Date.now()}.png`;
            const blob = await (await fetch(base64)).blob();
            const { error } = await supabase.storage.from('signatures').upload(fileName, blob, { contentType: 'image/png' });
            if (error) throw error;
            const result = (supabase.storage.from('signatures') as any).getPublicUrl(fileName);
            return result.data?.publicUrl || result;
        } catch (error) {
            console.error('Error uploading signature:', error);
            return '';
        }
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

    const stopDrawing = (setIsDrawing: (v: boolean) => void) => {
        setIsDrawing(false);
    };

    const clearSignature = (ref: React.RefObject<HTMLCanvasElement>) => {
        const ctx = ref.current?.getContext('2d');
        if (ctx && ref.current) {
            ctx.clearRect(0, 0, ref.current.width, ref.current.height);
        }
    };

    const resetForm = () => {
        setFormData(INITIAL_DATA as MetrologyReplacementRecord);
        setEditingId(null);
        setIsFormOpen(false);
        clearSignature(canvasAreaRef);
        clearSignature(canvasCalidadRef);
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

            const firmaAreaUrl = canvasAreaRef.current?.toDataURL() || '';
            const firmaCalidadUrl = canvasCalidadRef.current?.toDataURL() || '';

            let firmaArea = formData.firmaResponsableArea || '';
            let firmaCalidad = formData.firmaResponsableCalidad || '';

            if (firmaAreaUrl.startsWith('data:')) firmaArea = await uploadSignature(firmaAreaUrl, 'area');
            if (firmaCalidadUrl.startsWith('data:')) firmaCalidad = await uploadSignature(firmaCalidadUrl, 'calidad');

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

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    return (
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                            <div>
                                <label className={`${labelStyles} text-center mb-4`}>Firma Responsable Proceso/Área *</label>
                                <div className="border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden bg-white relative h-40">
                                    <canvas
                                        ref={canvasAreaRef}
                                        width={400}
                                        height={160}
                                        className="w-full h-full cursor-crosshair touch-none"
                                        onPointerDown={(e) => startDrawing(e, canvasAreaRef, setIsDrawingArea)}
                                        onPointerMove={(e) => draw(e, canvasAreaRef, isDrawingArea)}
                                        onPointerUp={() => stopDrawing(setIsDrawingArea)}
                                        onPointerLeave={() => stopDrawing(setIsDrawingArea)}
                                    />
                                    <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none opacity-20">
                                        <i className="fas fa-pen-nib text-4xl text-slate-400"></i>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sign Here</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => clearSignature(canvasAreaRef)} className="mt-2 text-[10px] font-bold text-sky-500 hover:text-sky-600 uppercase tracking-widest float-right">Limpiar</button>
                            </div>

                            <div>
                                <label className={`${labelStyles} text-center mb-4`}>Firma Responsable Calidad *</label>
                                <div className="border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden bg-white relative h-40">
                                    <canvas
                                        ref={canvasCalidadRef}
                                        width={400}
                                        height={160}
                                        className="w-full h-full cursor-crosshair touch-none"
                                        onPointerDown={(e) => startDrawing(e, canvasCalidadRef, setIsDrawingCalidad)}
                                        onPointerMove={(e) => draw(e, canvasCalidadRef, isDrawingCalidad)}
                                        onPointerUp={() => stopDrawing(setIsDrawingCalidad)}
                                        onPointerLeave={() => stopDrawing(setIsDrawingCalidad)}
                                    />
                                    <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none opacity-20">
                                        <i className="fas fa-pen-nib text-4xl text-slate-400"></i>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sign Here</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => clearSignature(canvasCalidadRef)} className="mt-2 text-[10px] font-bold text-sky-500 hover:text-sky-600 uppercase tracking-widest float-right">Limpiar</button>
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
                                            <button onClick={() => handleEdit(record)} className="text-sky-400 hover:text-sky-500 transition-colors mr-3">
                                                <EditIcon />
                                            </button>
                                            <button onClick={() => handleDelete(record.id)} className="text-rose-400 hover:text-rose-500 transition-colors">
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
    );
}
