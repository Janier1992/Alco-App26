import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
    InstructivoDiseño, InspeccionCriterion, ComponenteDefecto,
    MaterialItem, InstructivoEstado, EvidenciaTipo, FrecuenciaTipo, SeveridadTipo, VersionHistorial
} from '../types';
import {
    DISENO_REFERENCIA_OPTIONS, AREAS_PROCESO, DEFECTO_TYPES,
    ACCION_CORRECTIVA_OPTIONS, REGISTRO_USERS, OBSERVACIONES_SUGERIDAS
} from '../constants';
import { supabase } from '../insforgeClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mapDbToFrontend = (row: any): InstructivoDiseño => ({
    id: row.id,
    codigo: row.codigo,
    version: row.version,
    nombreDiseno: row.nombre_diseno,
    nombrePersonalizado: row.nombre_personalizado,
    areasAplicacion: row.areas_aplicacion || [],
    elaboradoPor: row.elaborado_por,
    revisadoPor: row.revisado_por,
    aprobadoPor: row.aprobado_por,
    fechaCreacion: row.fecha_creacion,
    vigenciaHasta: row.vigencia_hasta,
    estado: row.estado,
    objetivo: row.objetivo,
    imagenReferencia: row.imagen_referencia,
    descripcionSistema: row.descripcion_sistema,
    materiales: row.materiales || [],
    equiposInspeccion: row.equipos_inspeccion || [],
    criterios: row.criterios || [],
    componentesDefectos: row.componentes_defectos || [],
    observacionesGenerales: row.observaciones_generales,
    firmaElaborado: row.firma_elaborado,
    firmaRevisado: row.firma_revisado,
    firmaAprobado: row.firma_aprobado,
    historialVersiones: row.historial_versiones || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapFrontendToDb = (item: Partial<InstructivoDiseño>) => ({
    ...(item.id ? { id: item.id } : {}),
    codigo: item.codigo,
    version: item.version,
    nombre_diseno: item.nombreDiseno,
    nombre_personalizado: item.nombrePersonalizado,
    areas_aplicacion: item.areasAplicacion,
    elaborado_por: item.elaboradoPor,
    revisado_por: item.revisadoPor,
    aprobado_por: item.aprobadoPor,
    fecha_creacion: item.fechaCreacion,
    vigencia_hasta: item.vigenciaHasta,
    estado: item.estado,
    objetivo: item.objetivo,
    imagen_referencia: item.imagenReferencia,
    descripcion_sistema: item.descripcionSistema,
    materiales: item.materiales,
    equipos_inspeccion: item.equiposInspeccion,
    criterios: item.criterios,
    componentes_defectos: item.componentesDefectos,
    observaciones_generales: item.observacionesGenerales,
    firma_elaborado: item.firmaElaborado,
    firma_revisado: item.firmaRevisado,
    firma_aprobado: item.firmaAprobado,
    historial_versiones: item.historialVersiones,
});
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().split('T')[0];
const nextYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; };
const genCodigo = (diseno: string, existentes: InstructivoDiseño[]) => {
    const yr = new Date().getFullYear().toString().slice(2);
    const prefix = diseno ? diseno.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase() : 'GEN';
    const count = existentes.filter(i => i.nombreDiseno === diseno).length + 1;
    return `INS-${prefix}-${yr}-${String(count).padStart(3, '0')}`;
};

const ESTADO_COLORS: Record<InstructivoEstado, string> = {
    'Borrador':     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    'En Revisión':  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    'Aprobado':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    'Obsoleto':     'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
};

const EQUIPOS_INSPECCION = [
    'Flexómetro 5m', 'Flexómetro 8m', 'Calibrador Vernier', 'Galga de láminas',
    'Nivel de burbuja', 'Escuadra', 'Distanciómetro laser', 'Lupa 10x',
    'Goniómetro', 'Medidor de espesores', 'Lámpara de inspección', 'Cámara fotográfica',
];

const COMPONENTES_SISTEMA = [
    'Perfil de aluminio', 'Vidrio', 'Empaque/Felpa', 'Silicona',
    'Accesorios (chapas, bisagras)', 'Tornillería', 'Pintura/Acabado', 'Estructura',
];

const FRECUENCIAS: FrecuenciaTipo[] = ['Cada unidad', 'Por lote', 'Al inicio', 'Aleatorio'];
const SEVERIDADES: SeveridadTipo[] = ['Menor', 'Mayor', 'Crítica'];
const EVIDENCIAS: EvidenciaTipo[] = ['Foto', 'Medición', 'Firma'];
const ESTADOS: InstructivoEstado[] = ['Borrador', 'En Revisión', 'Aprobado', 'Obsoleto'];

const EMPTY_CRITERIO = (): InspeccionCriterion => ({
    id: uid(), numero: 1,
    puntoControl: '', descripcion: '', criterioAceptacion: '', criterioRechazo: '',
    tipoDefecto: 'NINGUNO', accionNC: 'NA', frecuencia: 'Cada unidad',
    evidenciaRequerida: [], observacion: ''
});

const EMPTY_COMPONENTE = (): ComponenteDefecto => ({
    id: uid(), componente: '', defectosPosibles: [], severidad: 'Mayor', observacion: ''
});

const EMPTY_MATERIAL = (): MaterialItem => ({
    id: uid(), nombre: '', especificacion: '', area: ''
});

// ─── SignaturePad ──────────────────────────────────────────────────────────────
const SignaturePad: React.FC<{ label: string; value?: string; onChange: (v: string) => void; locked?: boolean }> = ({ label, value, onChange, locked }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [hasSig, setHasSig] = useState(!!value);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = value; setHasSig(true); }
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (locked) return;
        e.preventDefault();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e, canvas);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
        drawing.current = true;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing.current || locked) return;
        e.preventDefault();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const pos = getPos(e, canvas);
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        setHasSig(true);
    };

    const stopDraw = () => {
        if (!drawing.current) return;
        drawing.current = false;
        const canvas = canvasRef.current!;
        onChange(canvas.toDataURL());
    };

    const clear = () => {
        if (locked) return;
        const canvas = canvasRef.current!;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        setHasSig(false);
        onChange('');
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            <div className={`relative border-2 rounded-xl overflow-hidden transition-colors ${locked ? 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50' : 'border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-crosshair'}`}>
                <canvas
                    ref={canvasRef} width={280} height={100}
                    className="w-full touch-none"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                />
                {!hasSig && !locked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs text-slate-300 dark:text-slate-600 font-medium">Firmar aquí...</p>
                    </div>
                )}
            </div>
            {!locked && (
                <button onClick={clear} className="self-end text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1">
                    <i className="fas fa-eraser text-[9px]" /> Limpiar
                </button>
            )}
        </div>
    );
};

// ─── StepIndicator ────────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number; total: number; labels: string[] }> = ({ current, total, labels }) => (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
        {Array.from({ length: total }, (_, i) => {
            const step = i + 1;
            const done = step < current;
            const active = step === current;
            return (
                <React.Fragment key={step}>
                    <div className="flex flex-col items-center flex-shrink-0 w-20 sm:w-24">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-sm ${
                            done ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900' :
                            active ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-indigo-200 dark:shadow-indigo-900 ring-4 ring-indigo-200 dark:ring-indigo-800' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                        }`}>
                            {done ? <i className="fas fa-check text-xs" /> : step}
                        </div>
                        <span className={`mt-1.5 text-[10px] font-bold text-center leading-tight ${active ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {labels[i]}
                        </span>
                    </div>
                    {step < total && (
                        <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const InstructivosDisenos: React.FC = () => {
    const [instructivos, setInstructivos] = useState<InstructivoDiseño[]>([]);
    const [dbLoading, setDbLoading] = useState(true);

    useEffect(() => {
        const fetchInstructivos = async () => {
            setDbLoading(true);
            const { data, error } = await supabase.from('instructivos_diseno').select('*');
            if (error) {
                console.error("Error fetching instructivos:", error);
            } else if (data) {
                setInstructivos(data.map(mapDbToFrontend));
            }
            setDbLoading(false);
        };
        fetchInstructivos();
    }, []);

    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [editId, setEditId] = useState<string | null>(null);
    const [step, setStep] = useState(1);
    const [filterEstado, setFilterEstado] = useState<string>('all');
    const [filterArea, setFilterArea] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [savedToast, setSavedToast] = useState(false);

    // ─── Form State ──────────────────────────────────────────────────────────
    const emptyForm = (): Omit<InstructivoDiseño, 'id' | 'createdAt' | 'updatedAt'> => ({
        codigo: '', version: 'V1', nombreDiseno: '', nombrePersonalizado: '',
        areasAplicacion: [], elaboradoPor: '', revisadoPor: '', aprobadoPor: '',
        fechaCreacion: today(), vigenciaHasta: nextYear(),
        estado: 'Borrador', objetivo: '', imagenReferencia: undefined,
        descripcionSistema: '', materiales: [EMPTY_MATERIAL()], equiposInspeccion: [],
        criterios: [EMPTY_CRITERIO()], componentesDefectos: COMPONENTES_SISTEMA.map(c => ({
            id: uid(), componente: c, defectosPosibles: [], severidad: 'Mayor' as SeveridadTipo, observacion: ''
        })),
        observacionesGenerales: '', firmaElaborado: '', firmaRevisado: '', firmaAprobado: '',
        historialVersiones: [],
    });

    const [form, setForm] = useState(emptyForm());
    const isLocked = editId ? (instructivos.find(i => i.id === editId)?.estado === 'Aprobado') : false;

    const openNew = () => {
        setForm(emptyForm()); setEditId(null); setStep(1); setView('form');
    };

    const openEdit = (id: string) => {
        const found = instructivos.find(i => i.id === id);
        if (!found) return;
        const { id: _id, createdAt, updatedAt, ...rest } = found;
        setForm(rest); setEditId(id); setStep(1); setView('form');
    };

    const openDetail = (id: string) => { setEditId(id); setView('detail'); };

    const updateForm = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (key === 'nombreDiseno' && typeof value === 'string') {
            setForm(prev => ({ ...prev, codigo: genCodigo(value, instructivos) }));
        }
    };

    const saveForm = async (newEstado?: InstructivoEstado) => {
        const estado = newEstado || form.estado;
        const now = new Date().toISOString();
        let savedItem: InstructivoDiseño;

        if (editId) {
            const updated = instructivos.map(i => i.id === editId ? {
                ...i, ...form, estado,
                historialVersiones: [...(form.historialVersiones || []), {
                    version: form.version, fecha: today(), descripcion: `Actualización ${estado}`, autor: form.elaboradoPor || 'Sistema'
                }],
                updatedAt: now
            } : i);
            setInstructivos(updated);
            savedItem = updated.find(i => i.id === editId)!;
        } else {
            const nuevo: InstructivoDiseño = {
                id: uid(), ...form, estado,
                codigo: form.codigo || genCodigo(form.nombreDiseno, instructivos),
                historialVersiones: [{ version: form.version, fecha: today(), descripcion: 'Creación inicial', autor: form.elaboradoPor || 'Sistema' }],
                createdAt: now,
                updatedAt: now
            };
            setInstructivos([...instructivos, nuevo]);
            savedItem = nuevo;
        }

        // Save to Supabase DB
        const dbPayload = mapFrontendToDb(savedItem);
        const { error } = await supabase.from('instructivos_diseno').upsert(dbPayload);
        
        if (error) {
            console.error("Error saving instructivo to DB:", error);
            alert("Hubo un error al guardar en la base de datos.");
        } else {
            setSavedToast(true);
            setTimeout(() => setSavedToast(false), 3000);
            setView('list');
        }
    };

    const deleteInstructivo = async (id: string) => {
        if (!confirm('¿Eliminar este instructivo? Esta acción no se puede deshacer.')) return;
        const { error } = await supabase.from('instructivos_diseno').delete().eq('id', id);
        if (error) {
            console.error("Error deleting instructivo:", error);
            alert("No se pudo eliminar de la base de datos.");
        } else {
            setInstructivos(prev => prev.filter(i => i.id !== id));
        }
    };

    // ─── AI Suggestion ──────────────────────────────────────────────────────
    const suggestAI = async () => {
        if (!form.nombreDiseno) return;
        setAiLoading(true);
        try {
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (window as any).__GEMINI_KEY || '';
            if (!apiKey || apiKey.includes('Dummy')) throw new Error('No API key');
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Eres experto en control de calidad de sistemas de ventanas y puertas de aluminio y vidrio.
Para el diseño "${form.nombreDiseno}" (${form.nombrePersonalizado || 'sistema de aluminio'}),
genera 5 criterios de inspección en formato JSON array con esta estructura exacta:
[{"puntoControl":"...","descripcion":"...","criterioAceptacion":"...","criterioRechazo":"...","tipoDefecto":"RASGUÑO|MEDIDAS|SILICONA|BRILLO|BURBUJA|FUNCIONALIDAD|DISTORSION ASOCIADA","frecuencia":"Cada unidad|Por lote|Al inicio|Aleatorio","evidenciaRequerida":["Foto","Medición"]}]
Solo responde con el JSON array, sin texto adicional.`;
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().replace(/```json|```/g, '');
            const sugeridos = JSON.parse(text);
            const nuevos: InspeccionCriterion[] = sugeridos.map((s: any, idx: number) => ({
                id: uid(), numero: (form.criterios.length + idx + 1),
                puntoControl: s.puntoControl || '',
                descripcion: s.descripcion || '',
                criterioAceptacion: s.criterioAceptacion || '',
                criterioRechazo: s.criterioRechazo || '',
                tipoDefecto: s.tipoDefecto || 'NINGUNO',
                accionNC: 'NA', frecuencia: s.frecuencia || 'Cada unidad',
                evidenciaRequerida: s.evidenciaRequerida || [],
                observacion: ''
            }));
            setForm(prev => ({ ...prev, criterios: [...prev.criterios, ...nuevos] }));
        } catch (e) {
            // Criterios de demo si no hay API
            const demo: InspeccionCriterion[] = [
                { id: uid(), numero: form.criterios.length + 1, puntoControl: 'Medida ancho de hoja', descripcion: 'Verificar ancho con flexómetro según plano', criterioAceptacion: 'Tolerancia ±2mm', criterioRechazo: 'Desviación >2mm', tipoDefecto: 'MEDIDAS', accionNC: 'INTERNA', frecuencia: 'Cada unidad', evidenciaRequerida: ['Medición'], observacion: '' },
                { id: uid(), numero: form.criterios.length + 2, puntoControl: 'Estado de perfil de aluminio', descripcion: 'Inspección visual de rasguños, fricciones o golpes', criterioAceptacion: 'Superficie libre de defectos visibles a 60cm', criterioRechazo: 'Rasguño >2cm o marca visible', tipoDefecto: 'RASGUÑO', accionNC: 'INTERNA', frecuencia: 'Cada unidad', evidenciaRequerida: ['Foto'], observacion: '' },
                { id: uid(), numero: form.criterios.length + 3, puntoControl: 'Instalación de empaque', descripcion: 'Verificar que el empaque esté correctamente asentado perimetralmente', criterioAceptacion: 'Empaque continuo sin interrupciones', criterioRechazo: 'Empaque suelto o con cortes', tipoDefecto: 'EMP./FELPA', accionNC: 'INTERNA', frecuencia: 'Cada unidad', evidenciaRequerida: ['Foto', 'Firma'], observacion: '' },
            ];
            setForm(prev => ({ ...prev, criterios: [...prev.criterios, ...demo] }));
        }
        setAiLoading(false);
    };

    // ─── PDF Generation ──────────────────────────────────────────────────────
    const generatePDF = async (instructivo: InstructivoDiseño) => {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        let y = 15;

        // Header bar
        doc.setFillColor(30, 64, 175); doc.rect(0, 0, W, 12, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('ALCO — SISTEMA DE GESTIÓN DE CALIDAD', W / 2, 8, { align: 'center' });

        y = 20;
        doc.setTextColor(15, 23, 42); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(`INSTRUCTIVO DE DISEÑO`, W / 2, y, { align: 'center' }); y += 7;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(instructivo.nombrePersonalizado || instructivo.nombreDiseno, W / 2, y, { align: 'center' }); y += 10;

        // Info table
        autoTable(doc, {
            startY: y, theme: 'grid', margin: { left: 14, right: 14 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            head: [['CÓDIGO', 'VERSIÓN', 'ESTADO', 'FECHA', 'VIGENCIA']],
            body: [[instructivo.codigo, instructivo.version, instructivo.estado, instructivo.fechaCreacion, instructivo.vigenciaHasta]],
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        autoTable(doc, {
            startY: y, theme: 'grid', margin: { left: 14, right: 14 },
            bodyStyles: { fontSize: 8 },
            body: [
                ['Elaborado por:', instructivo.elaboradoPor, 'Revisado por:', instructivo.revisadoPor],
                ['Áreas de aplicación:', instructivo.areasAplicacion.join(', '), 'Aprobado por:', instructivo.aprobadoPor],
            ],
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        const printTextSection = (title: string, text: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(title, 14, y); y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const content = text ? text : 'No especificado';
            const lines = doc.splitTextToSize(content, W - 28);
            doc.text(lines, 14, y); y += lines.length * 4 + 4;
        };

        printTextSection('OBJETIVO', instructivo.objetivo);
        printTextSection('DESCRIPCIÓN DEL SISTEMA', instructivo.descripcionSistema);
        printTextSection('OBSERVACIONES GENERALES', instructivo.observacionesGenerales || '');
        printTextSection('EQUIPOS DE INSPECCIÓN', instructivo.equiposInspeccion.length > 0 ? instructivo.equiposInspeccion.join(', ') : '');

        // Materiales
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('MATERIALES DEL SISTEMA', 14, y); y += 3;
        const validMats = instructivo.materiales.filter(m => m.nombre);
        if (validMats.length > 0) {
            autoTable(doc, {
                startY: y, theme: 'grid', margin: { left: 14, right: 14 },
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 7, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7 },
                head: [['MATERIAL', 'ESPECIFICACIÓN', 'ÁREA']],
                body: validMats.map(m => [m.nombre, m.especificacion, m.area])
            });
            y = (doc as any).lastAutoTable.finalY + 5;
        } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text('No especificados', 14, y + 2); y += 8;
        }

        // Defectos
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('DEFECTOS CRÍTICOS POR COMPONENTE', 14, y); y += 3;
        const validDefs = instructivo.componentesDefectos.filter(c => c.defectosPosibles.length > 0);
        if (validDefs.length > 0) {
            autoTable(doc, {
                startY: y, theme: 'grid', margin: { left: 14, right: 14 },
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 7, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7 },
                head: [['COMPONENTE', 'DEFECTOS POSIBLES', 'SEVERIDAD']],
                body: validDefs.map(c => [c.componente, c.defectosPosibles.join(', '), c.severidad])
            });
            y = (doc as any).lastAutoTable.finalY + 5;
        } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text('No especificados', 14, y + 2); y += 8;
        }

        // Criteria table
        if (instructivo.criterios.length > 0) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('CRITERIOS DE INSPECCIÓN', 14, y); y += 3;
            autoTable(doc, {
                startY: y, theme: 'striped', margin: { left: 14, right: 14 },
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 7, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7 },
                head: [['N°', 'PUNTO DE CONTROL', 'CRITERIO ACEPTACIÓN', 'CRITERIO RECHAZO', 'DEFECTO', 'FRECUENCIA']],
                body: instructivo.criterios.map(c => [
                    c.numero, c.puntoControl, c.criterioAceptacion, c.criterioRechazo, c.tipoDefecto, c.frecuencia
                ]),
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 38 }, 2: { cellWidth: 38 }, 3: { cellWidth: 38 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 } }
            });
            y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Signatures
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('FIRMAS Y APROBACIÓN', 14, y); y += 6;
        const sigW = (W - 42) / 3;
        ['firmaElaborado', 'firmaRevisado', 'firmaAprobado'].forEach((key, i) => {
            const sig = instructivo[key as keyof InstructivoDiseño] as string | undefined;
            const x = 14 + i * (sigW + 7);
            doc.setDrawColor(180, 180, 180); doc.rect(x, y, sigW, 22);
            if (sig) { try { doc.addImage(sig, 'PNG', x + 2, y + 1, sigW - 4, 18); } catch {} }
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            const labels = ['Elaborado por', 'Revisado por', 'Aprobado por'];
            const names = [instructivo.elaboradoPor, instructivo.revisadoPor, instructivo.aprobadoPor];
            doc.text(labels[i], x + sigW / 2, y + 25, { align: 'center' });
            doc.setFont('helvetica', 'bold'); doc.text(names[i], x + sigW / 2, y + 28.5, { align: 'center' });
        });

        doc.save(`${instructivo.codigo}_V${instructivo.version}.pdf`);
    };

    // ─── Filtered List ───────────────────────────────────────────────────────
    const filtered = instructivos.filter(i => {
        const matchEstado = filterEstado === 'all' || i.estado === filterEstado;
        const matchArea = filterArea === 'all' || i.areasAplicacion.includes(filterArea);
        const matchSearch = !search || i.nombrePersonalizado.toLowerCase().includes(search.toLowerCase())
            || i.nombreDiseno.toLowerCase().includes(search.toLowerCase())
            || i.codigo.toLowerCase().includes(search.toLowerCase());
        return matchEstado && matchArea && matchSearch;
    });

    // ─── Render ──────────────────────────────────────────────────────────────
    if (view === 'list') return ListView();
    if (view === 'detail') return DetailView();
    return FormView();

    // ─── List View ────────────────────────────────────────────────────────────
    function ListView() {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Toast */}
                {savedToast && (
                    <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl font-bold text-sm animate-scale-in">
                        <i className="fas fa-check-circle" /> Instructivo guardado correctamente
                    </div>
                )}

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm">
                                <i className="fas fa-file-pen text-white text-sm" />
                            </div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Instructivos de Diseños</h1>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 ml-10">
                            Genera y gestiona instructivos de inspección por sistema de diseño
                        </p>
                    </div>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex-shrink-0"
                    >
                        <i className="fas fa-plus text-xs" /> Nuevo Instructivo
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: instructivos.length, icon: 'fa-file-alt', color: 'from-indigo-500 to-violet-500' },
                        { label: 'Aprobados', value: instructivos.filter(i => i.estado === 'Aprobado').length, icon: 'fa-circle-check', color: 'from-emerald-500 to-teal-500' },
                        { label: 'En Revisión', value: instructivos.filter(i => i.estado === 'En Revisión').length, icon: 'fa-clock-rotate-left', color: 'from-amber-500 to-orange-500' },
                        { label: 'Borradores', value: instructivos.filter(i => i.estado === 'Borrador').length, icon: 'fa-pen-ruler', color: 'from-slate-500 to-slate-600' },
                    ].map(card => (
                        <div key={card.label} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                <i className={`fas ${card.icon} text-white text-sm`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{card.value}</p>
                                <p className="text-xs font-semibold text-slate-400">{card.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-sm" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por código, diseño o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                        />
                    </div>
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all">
                        <option value="all">Todos los estados</option>
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all">
                        <option value="all">Todas las áreas</option>
                        {AREAS_PROCESO.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200/60 dark:border-white/[0.06]">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-file-pen text-indigo-400 text-2xl" />
                        </div>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Sin instructivos registrados</p>
                        <p className="text-sm text-slate-400 mt-1 mb-5">Crea el primer instructivo de diseño para comenzar</p>
                        <button onClick={openNew} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-md">
                            <i className="fas fa-plus mr-2" /> Nuevo Instructivo
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                                    {['Código', 'Diseño / Sistema', 'Áreas', 'Criterios', 'Estado', 'Versión', 'Fecha', 'Acciones'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                                {filtered.map(inst => (
                                    <tr key={inst.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg">{inst.codigo}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{inst.nombrePersonalizado || inst.nombreDiseno}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{inst.nombreDiseno}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {inst.areasAplicacion.slice(0, 2).map(a => (
                                                    <span key={a} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded">{a}</span>
                                                ))}
                                                {inst.areasAplicacion.length > 2 && <span className="text-[9px] text-slate-400">+{inst.areasAplicacion.length - 2}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{inst.criterios.length}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${ESTADO_COLORS[inst.estado]}`}>{inst.estado}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{inst.version}</td>
                                        <td className="px-4 py-3 text-xs text-slate-400">{inst.fechaCreacion}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openDetail(inst.id)} title="Ver detalle" className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors">
                                                    <i className="fas fa-eye text-xs" />
                                                </button>
                                                <button onClick={() => openEdit(inst.id)} title="Editar" disabled={inst.estado === 'Aprobado'} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <i className="fas fa-pen text-xs" />
                                                </button>
                                                <button onClick={() => generatePDF(inst)} title="Generar PDF" className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
                                                    <i className="fas fa-file-pdf text-xs" />
                                                </button>
                                                <button onClick={() => deleteInstructivo(inst.id)} title="Eliminar" disabled={inst.estado === 'Aprobado'} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <i className="fas fa-trash text-xs" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    // ─── Detail View ──────────────────────────────────────────────────────────
    function DetailView() {
        const inst = instructivos.find(i => i.id === editId);
        if (!inst) return null;
        return (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg">{inst.codigo}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${ESTADO_COLORS[inst.estado]}`}>{inst.estado}</span>
                            <span className="text-xs text-slate-400 font-mono">{inst.version}</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white mt-1">{inst.nombrePersonalizado || inst.nombreDiseno}</h1>
                    </div>
                    <div className="flex gap-2">
                        {inst.estado !== 'Aprobado' && (
                            <button onClick={() => openEdit(inst.id)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-all">
                                <i className="fas fa-pen text-xs" /> Editar
                            </button>
                        )}
                        <button onClick={() => generatePDF(inst)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold rounded-xl transition-all">
                            <i className="fas fa-file-pdf text-xs" /> PDF
                        </button>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Elaborado por', value: inst.elaboradoPor, icon: 'fa-user-pen' },
                        { label: 'Revisado por', value: inst.revisadoPor, icon: 'fa-user-check' },
                        { label: 'Aprobado por', value: inst.aprobadoPor, icon: 'fa-user-shield' },
                        { label: 'Vigencia hasta', value: inst.vigenciaHasta, icon: 'fa-calendar-check' },
                        { label: 'Criterios definidos', value: `${inst.criterios.length}`, icon: 'fa-list-check' },
                        { label: 'Diseño de referencia', value: inst.nombreDiseno, icon: 'fa-drafting-compass' },
                    ].map(info => (
                        <div key={info.label} className="bg-white dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06] p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <i className={`fas ${info.icon} text-indigo-400`} />{info.label}
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{info.value || '—'}</p>
                        </div>
                    ))}
                </div>

                {/* Objetivo */}
                <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><i className="fas fa-bullseye text-indigo-400" />Objetivo</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{inst.objetivo || '—'}</p>
                </div>

                {/* Criterios */}
                <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2"><i className="fas fa-list-check text-indigo-400" />Criterios de Inspección ({inst.criterios.length})</h3>
                    </div>
                    {inst.criterios.length === 0 ? (
                        <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin criterios definidos</p>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                            {inst.criterios.map((c, idx) => (
                                <div key={c.id} className="px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-start gap-3">
                                        <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black flex-shrink-0">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{c.puntoControl}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.descripcion}</p>
                                            <div className="flex flex-wrap gap-3 mt-2">
                                                <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ {c.criterioAceptacion}</span></div>
                                                <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">✗ {c.criterioRechazo}</span></div>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{c.frecuencia}</span>
                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full">{c.tipoDefecto}</span>
                                                {c.evidenciaRequerida.map(ev => <span key={ev} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">{ev}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Firmas */}
                {(inst.firmaElaborado || inst.firmaRevisado || inst.firmaAprobado) && (
                    <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-5">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i className="fas fa-signature text-indigo-400" />Firmas</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[{ key: 'firmaElaborado', label: 'Elaborado por', name: inst.elaboradoPor }, { key: 'firmaRevisado', label: 'Revisado por', name: inst.revisadoPor }, { key: 'firmaAprobado', label: 'Aprobado por', name: inst.aprobadoPor }].map(f => (
                                <div key={f.key} className="text-center">
                                    <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden h-20 flex items-center justify-center mb-1 bg-slate-50 dark:bg-slate-800/50">
                                        {inst[f.key as keyof InstructivoDiseño] ? (
                                            <img src={inst[f.key as keyof InstructivoDiseño] as string} alt="firma" className="max-h-full max-w-full object-contain" />
                                        ) : <i className="fas fa-pen-nib text-slate-200 dark:text-slate-700 text-2xl" />}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500">{f.label}</p>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{f.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Form View ────────────────────────────────────────────────────────────
    function FormView() {
        const stepLabels = ['Identificación', 'Descripción', 'Criterios', 'Firmas'];
        const locked = isLocked;

        const inputCls = `w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${locked ? 'opacity-70 cursor-not-allowed' : ''}`;
        const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';
        const sectionCls = 'bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-5 space-y-4';

        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white">
                            {editId ? 'Editar Instructivo' : 'Nuevo Instructivo de Diseño'}
                        </h1>
                        {locked && <p className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-0.5"><i className="fas fa-lock text-[10px]" />Instructivo aprobado — solo lectura</p>}
                    </div>
                </div>

                <StepIndicator current={step} total={4} labels={stepLabels} />

                {/* ── STEP 1: Identificación ──────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-tag text-indigo-400" />Identificación del Instructivo</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Diseño de Referencia *</label>
                                    <select value={form.nombreDiseno} onChange={e => updateForm('nombreDiseno', e.target.value)} disabled={locked} className={inputCls}>
                                        <option value="">Seleccionar diseño...</option>
                                        {DISENO_REFERENCIA_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Nombre personalizado del sistema *</label>
                                    <input type="text" value={form.nombrePersonalizado} onChange={e => updateForm('nombrePersonalizado', e.target.value)} disabled={locked} placeholder="Ej: Puerta Corrediza OPT II TT" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Código del instructivo</label>
                                    <input type="text" value={form.codigo || genCodigo(form.nombreDiseno, instructivos)} onChange={e => updateForm('codigo', e.target.value)} disabled={locked} placeholder="Auto-generado" className={inputCls + ' font-mono'} />
                                </div>
                                <div>
                                    <label className={labelCls}>Versión</label>
                                    <input type="text" value={form.version} onChange={e => updateForm('version', e.target.value)} disabled={locked} placeholder="V1" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Fecha de creación</label>
                                    <input type="date" value={form.fechaCreacion} onChange={e => updateForm('fechaCreacion', e.target.value)} disabled={locked} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Vigencia hasta</label>
                                    <input type="date" value={form.vigenciaHasta} onChange={e => updateForm('vigenciaHasta', e.target.value)} disabled={locked} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Estado</label>
                                    <select value={form.estado} onChange={e => updateForm('estado', e.target.value as InstructivoEstado)} disabled={locked} className={inputCls}>
                                        {ESTADOS.filter(e => e !== 'Aprobado' || locked).map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Áreas de aplicación *</label>
                                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl min-h-[44px]">
                                        {AREAS_PROCESO.map(a => (
                                            <button key={a} type="button" disabled={locked}
                                                onClick={() => {
                                                    const curr = form.areasAplicacion;
                                                    updateForm('areasAplicacion', curr.includes(a) ? curr.filter(x => x !== a) : [...curr, a]);
                                                }}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${form.areasAplicacion.includes(a) ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:border-indigo-300'}`}>
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Elaborado por *</label>
                                    <select value={form.elaboradoPor} onChange={e => updateForm('elaboradoPor', e.target.value)} disabled={locked} className={inputCls}>
                                        <option value="">Seleccionar...</option>
                                        {REGISTRO_USERS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Revisado por</label>
                                    <input type="text" value={form.revisadoPor} onChange={e => updateForm('revisadoPor', e.target.value)} disabled={locked} placeholder="Nombre del revisor" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Aprobado por</label>
                                    <input type="text" value={form.aprobadoPor} onChange={e => updateForm('aprobadoPor', e.target.value)} disabled={locked} placeholder="Nombre del aprobador" className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Objetivo del instructivo *</label>
                                <textarea rows={3} value={form.objetivo} onChange={e => updateForm('objetivo', e.target.value)} disabled={locked}
                                    placeholder="Describir el propósito de este instructivo y qué proceso cubre..."
                                    className={inputCls + ' resize-none'} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Descripción del Sistema ────────────────────── */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-drafting-compass text-indigo-400" />Descripción del Sistema / Producto</h2>

                            {/* Image upload */}
                            <div>
                                <label className={labelCls}>Imagen o croquis de referencia</label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${form.imagenReferencia ? 'border-indigo-300 dark:border-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'} ${locked ? 'opacity-70' : 'cursor-pointer'}`}
                                    onClick={() => { if (!locked) document.getElementById('img-inp')?.click(); }}
                                >
                                    {form.imagenReferencia ? (
                                        <div className="relative inline-block">
                                            <img src={form.imagenReferencia} alt="referencia" className="max-h-40 rounded-lg mx-auto object-contain" />
                                            {!locked && <button onClick={e => { e.stopPropagation(); updateForm('imagenReferencia', undefined); }} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 transition-colors"><i className="fas fa-times" /></button>}
                                        </div>
                                    ) : (
                                        <>
                                            <i className="fas fa-image text-slate-200 dark:text-slate-600 text-3xl mb-2" />
                                            <p className="text-sm font-bold text-slate-400">Haz clic o arrastra una imagen</p>
                                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Plano, foto del diseño, croquis...</p>
                                        </>
                                    )}
                                </div>
                                <input id="img-inp" type="file" accept="image/*" className="hidden" onChange={e => {
                                    const f = e.target.files?.[0]; if (!f) return;
                                    const r = new FileReader(); r.onload = ev => updateForm('imagenReferencia', ev.target?.result as string); r.readAsDataURL(f);
                                }} />
                            </div>

                            <div>
                                <label className={labelCls}>Descripción general del sistema</label>
                                <textarea rows={4} value={form.descripcionSistema} onChange={e => updateForm('descripcionSistema', e.target.value)} disabled={locked}
                                    placeholder="Describir qué es el sistema, para qué sirve, características principales, materiales predominantes..."
                                    className={inputCls + ' resize-none'} />
                            </div>
                        </div>

                        {/* Materiales */}
                        <div className={sectionCls}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-layer-group text-indigo-400" />Materiales que componen el sistema</h2>
                                {!locked && <button onClick={() => updateForm('materiales', [...form.materiales, EMPTY_MATERIAL()])} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                                    <i className="fas fa-plus text-[10px]" /> Agregar
                                </button>}
                            </div>
                            <div className="space-y-2">
                                {form.materiales.map((mat, idx) => (
                                    <div key={mat.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-white/[0.02] p-2 rounded-xl">
                                        <div className="col-span-4">
                                            <input type="text" value={mat.nombre} onChange={e => { const m = [...form.materiales]; m[idx] = { ...m[idx], nombre: e.target.value }; updateForm('materiales', m); }} disabled={locked} placeholder="Nombre del material" className={inputCls} />
                                        </div>
                                        <div className="col-span-5">
                                            <input type="text" value={mat.especificacion} onChange={e => { const m = [...form.materiales]; m[idx] = { ...m[idx], especificacion: e.target.value }; updateForm('materiales', m); }} disabled={locked} placeholder="Especificación / medida" className={inputCls} />
                                        </div>
                                        <div className="col-span-2">
                                            <select value={mat.area} onChange={e => { const m = [...form.materiales]; m[idx] = { ...m[idx], area: e.target.value }; updateForm('materiales', m); }} disabled={locked} className={inputCls}>
                                                <option value="">Área</option>
                                                {AREAS_PROCESO.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                        </div>
                                        {!locked && (
                                            <button onClick={() => updateForm('materiales', form.materiales.filter((_, i) => i !== idx))} className="col-span-1 p-2 text-rose-300 hover:text-rose-500 transition-colors flex items-center justify-center">
                                                <i className="fas fa-times text-xs" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Equipos de inspección */}
                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-ruler-combined text-indigo-400" />Equipos y herramientas de inspección</h2>
                            <div className="flex flex-wrap gap-2">
                                {EQUIPOS_INSPECCION.map(eq => (
                                    <button key={eq} type="button" disabled={locked}
                                        onClick={() => {
                                            const curr = form.equiposInspeccion;
                                            updateForm('equiposInspeccion', curr.includes(eq) ? curr.filter(x => x !== eq) : [...curr, eq]);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${form.equiposInspeccion.includes(eq) ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900' : 'bg-white dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:border-indigo-300'}`}>
                                        <i className={`fas ${form.equiposInspeccion.includes(eq) ? 'fa-check mr-1 text-[9px]' : 'fa-plus mr-1 text-[9px]'}`} />{eq}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Criterios de Inspección ────────────────────── */}
                {step === 3 && (
                    <div className="space-y-5">
                        <div className={sectionCls}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-list-check text-indigo-400" />Puntos de Control e Inspección</h2>
                                <div className="flex gap-2">
                                    <button onClick={suggestAI} disabled={locked || aiLoading || !form.nombreDiseno}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                        {aiLoading ? <><i className="fas fa-spinner fa-spin text-[10px]" /> Generando...</> : <><i className="fas fa-wand-magic-sparkles text-[10px]" /> Sugerir con IA</>}
                                    </button>
                                    {!locked && (
                                        <button onClick={() => updateForm('criterios', [...form.criterios, { ...EMPTY_CRITERIO(), numero: form.criterios.length + 1 }])}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                                            <i className="fas fa-plus text-[10px]" /> Agregar punto
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {form.criterios.map((c, idx) => (
                                    <div key={c.id} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-black">{idx + 1}</span>
                                                <span className="text-xs font-bold text-slate-400">Punto de control #{idx + 1}</span>
                                            </div>
                                            {!locked && <button onClick={() => updateForm('criterios', form.criterios.filter((_, i) => i !== idx))} className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"><i className="fas fa-times text-xs" /></button>}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Punto de control *</label>
                                                <input type="text" value={c.puntoControl} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], puntoControl: e.target.value }; updateForm('criterios', cr); }}
                                                    placeholder="Ej: Medida ancho de hoja" className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Descripción</label>
                                                <input type="text" value={c.descripcion} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], descripcion: e.target.value }; updateForm('criterios', cr); }}
                                                    placeholder="Cómo verificar este punto" className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Criterio de Aceptación ✓</label>
                                                <input type="text" value={c.criterioAceptacion} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], criterioAceptacion: e.target.value }; updateForm('criterios', cr); }}
                                                    placeholder="Ej: ±2mm de tolerancia" className={`${inputCls} border-emerald-200 dark:border-emerald-800/50 focus:ring-emerald-500/40`} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Criterio de Rechazo ✗</label>
                                                <input type="text" value={c.criterioRechazo} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], criterioRechazo: e.target.value }; updateForm('criterios', cr); }}
                                                    placeholder="Ej: >2mm fuera de tolerancia" className={`${inputCls} border-rose-200 dark:border-rose-800/50 focus:ring-rose-500/40`} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Tipo de defecto asociado</label>
                                                <select value={c.tipoDefecto} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], tipoDefecto: e.target.value }; updateForm('criterios', cr); }}
                                                    className={inputCls}>
                                                    {DEFECTO_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Acción ante no conformidad</label>
                                                <select value={c.accionNC} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], accionNC: e.target.value }; updateForm('criterios', cr); }}
                                                    className={inputCls}>
                                                    {ACCION_CORRECTIVA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Frecuencia de inspección</label>
                                                <select value={c.frecuencia} disabled={locked}
                                                    onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], frecuencia: e.target.value as FrecuenciaTipo }; updateForm('criterios', cr); }}
                                                    className={inputCls}>
                                                    {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Evidencia requerida</label>
                                                <div className="flex gap-2">
                                                    {EVIDENCIAS.map(ev => (
                                                        <button key={ev} type="button" disabled={locked}
                                                            onClick={() => { const cr = [...form.criterios]; const evs = cr[idx].evidenciaRequerida; cr[idx] = { ...cr[idx], evidenciaRequerida: evs.includes(ev) ? evs.filter(e => e !== ev) : [...evs, ev] }; updateForm('criterios', cr); }}
                                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${c.evidenciaRequerida.includes(ev) ? 'bg-amber-500 text-white' : 'bg-white dark:bg-white/[0.06] text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:border-amber-300'}`}>
                                                            <i className={`fas ${ev === 'Foto' ? 'fa-camera' : ev === 'Medición' ? 'fa-ruler' : 'fa-signature'} mr-1 text-[10px]`} />{ev}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Observación adicional</label>
                                            <select value={c.observacion} disabled={locked}
                                                onChange={e => { const cr = [...form.criterios]; cr[idx] = { ...cr[idx], observacion: e.target.value }; updateForm('criterios', cr); }}
                                                className={inputCls}>
                                                <option value="">Sin observación adicional...</option>
                                                {OBSERVACIONES_SUGERIDAS.filter(o => {
                                                    if (c.tipoDefecto === 'RASGUÑO') return o.includes('RAYO') || o.includes('FRICCION');
                                                    return true;
                                                }).map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Defectos críticos por componente */}
                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-triangle-exclamation text-amber-500" />Defectos Críticos por Componente</h2>
                            <div className="space-y-3">
                                {form.componentesDefectos.map((comp, idx) => (
                                    <div key={comp.id} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] rounded-xl p-3">
                                        <div className="grid grid-cols-12 gap-3 items-start">
                                            <div className="col-span-3">
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{comp.componente}</p>
                                            </div>
                                            <div className="col-span-6">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {DEFECTO_TYPES.filter(d => d !== 'NINGUNO').map(d => (
                                                        <button key={d} type="button" disabled={locked}
                                                            onClick={() => {
                                                                const cd = [...form.componentesDefectos];
                                                                const defs = cd[idx].defectosPosibles;
                                                                cd[idx] = { ...cd[idx], defectosPosibles: defs.includes(d) ? defs.filter(x => x !== d) : [...defs, d] };
                                                                updateForm('componentesDefectos', cd);
                                                            }}
                                                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors ${comp.defectosPosibles.includes(d) ? 'bg-rose-500 text-white' : 'bg-white dark:bg-white/[0.08] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/[0.08] hover:border-rose-300'}`}>
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-span-3">
                                                <select value={comp.severidad} disabled={locked}
                                                    onChange={e => { const cd = [...form.componentesDefectos]; cd[idx] = { ...cd[idx], severidad: e.target.value as SeveridadTipo }; updateForm('componentesDefectos', cd); }}
                                                    className={`${inputCls} ${comp.severidad === 'Crítica' ? 'border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400' : comp.severidad === 'Mayor' ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                                                    {SEVERIDADES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Firmas y Aprobación ─────────────────────────── */}
                {step === 4 && (
                    <div className="space-y-5">
                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-comment-lines text-indigo-400" />Observaciones Generales</h2>
                            <textarea rows={3} value={form.observacionesGenerales} onChange={e => updateForm('observacionesGenerales', e.target.value)} disabled={locked}
                                placeholder="Instrucciones adicionales para el inspector, condiciones especiales, advertencias..."
                                className={inputCls + ' resize-none'} />
                        </div>

                        <div className={sectionCls}>
                            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-signature text-indigo-400" />Firmas Digitales</h2>
                            <p className="text-xs text-slate-400">Firma en el área designada. Puedes usar el dedo (móvil) o el ratón.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                                <SignaturePad label={`Elaborado por — ${form.elaboradoPor || '...'}`} value={form.firmaElaborado} onChange={v => updateForm('firmaElaborado', v)} locked={locked} />
                                <SignaturePad label={`Revisado por — ${form.revisadoPor || '...'}`} value={form.firmaRevisado} onChange={v => updateForm('firmaRevisado', v)} locked={locked} />
                                <SignaturePad label={`Aprobado por — ${form.aprobadoPor || '...'}`} value={form.firmaAprobado} onChange={v => updateForm('firmaAprobado', v)} locked={locked} />
                            </div>
                        </div>

                        {/* Historial */}
                        {form.historialVersiones.length > 0 && (
                            <div className={sectionCls}>
                                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 flex items-center gap-2"><i className="fas fa-clock-rotate-left text-indigo-400" />Historial de Versiones</h2>
                                <div className="space-y-2">
                                    {form.historialVersiones.map((h, i) => (
                                        <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
                                            <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg flex-shrink-0">{h.version}</span>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{h.descripcion}</p>
                                                <p className="text-[10px] text-slate-400">{h.autor} · {h.fecha}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resumen */}
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5">
                            <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2"><i className="fas fa-clipboard-check" />Resumen del Instructivo</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Diseño', value: form.nombreDiseno || '—' },
                                    { label: 'Criterios', value: `${form.criterios.length} puntos` },
                                    { label: 'Materiales', value: `${form.materiales.filter(m => m.nombre).length} ítems` },
                                    { label: 'Áreas', value: `${form.areasAplicacion.length} áreas` },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/80 dark:bg-white/[0.05] rounded-xl p-3 text-center">
                                        <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{s.value}</p>
                                        <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                    <button onClick={() => step > 1 ? setStep(s => s - 1) : setView('list')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all">
                        <i className="fas fa-chevron-left text-xs" /> {step > 1 ? 'Anterior' : 'Cancelar'}
                    </button>

                    <div className="flex gap-2">
                        {step === 4 && !locked && (
                            <>
                                <button onClick={() => saveForm('Borrador')} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-white/[0.10] transition-all">
                                    <i className="fas fa-save text-xs" /> Guardar Borrador
                                </button>
                                <button onClick={() => saveForm('En Revisión')} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                                    <i className="fas fa-paper-plane text-xs" /> Enviar a Revisión
                                </button>
                                <button onClick={() => saveForm('Aprobado')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25">
                                    <i className="fas fa-circle-check text-xs" /> Aprobar y Guardar
                                </button>
                            </>
                        )}
                        {step < 4 && (
                            <button onClick={() => setStep(s => s + 1)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25">
                                Siguiente <i className="fas fa-chevron-right text-xs" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }
};

export default InstructivosDisenos;
