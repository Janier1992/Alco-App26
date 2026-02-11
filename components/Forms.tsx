
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { InspectionData, AdverseEventData, ExternalForm } from '../types';
import Breadcrumbs from './Breadcrumbs';
import TranscriptionButton from './TranscriptionButton';
import {
    AREAS_PROCESO, ESTADO_OPTIONS, DEFECTO_TYPES, REGISTRO_USERS,
    ACCION_CORRECTIVA_OPTIONS, DISENO_REFERENCIA_OPTIONS, OPERARIO_RESPONSABLES,
    OBSERVACIONES_SUGERIDAS,
    EditIcon, DeleteIcon, CameraIcon, FileExcelIcon, PlusIcon, LinkIcon, RefreshIcon,
    RobotIcon, ClipboardListIcon, TrashIcon, ChevronRightIcon, SearchIcon, MicrophoneIcon, SparklesIcon,
    SaveIcon, GlobeIcon, XCircleIcon
} from '../constants';
import { useNotification } from './NotificationSystem';

const SearchableSelect: React.FC<{
    label: string;
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ label, options, value, onChange, placeholder, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!isOpen) setSearchTerm(value); }, [value, isOpen]);

    const filteredOptions = useMemo(() => options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase())), [options, searchTerm]);
    const showAddOption = searchTerm.trim() !== '' && !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-[#0b0b14] border border-slate-200 dark:border-white/5 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <label className={labelStyles}>{label}</label>
            <div className="relative">
                <input type="text" className={inputStyles} placeholder={placeholder || "Buscar o agregar..."} value={searchTerm} onFocus={() => setIsOpen(true)} onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></div>
            </div>
            {isOpen && (
                <div className="absolute z-[2100] w-full mt-2 bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up">
                    <div className="p-1">
                        {filteredOptions.map((opt, idx) => (
                            <button key={idx} type="button" onClick={() => { onChange(opt); setSearchTerm(opt); setIsOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-between group ${value === opt ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{opt}{value === opt && <i className="fas fa-check text-[10px]"></i>}</button>
                        ))}
                        {showAddOption && <button type="button" onClick={() => { onChange(searchTerm); setIsOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase border border-dashed border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 transition-all flex items-center gap-2"><PlusIcon className="scale-75" /> Agregar: {searchTerm}</button>}
                    </div>
                </div>
            )}
        </div>
    );
};

const INITIAL_FORM_DATA: Omit<InspectionData, 'id'> = {
    fecha: new Date().toISOString().split('T')[0],
    areaProceso: '',
    op: '',
    planoOpc: '',
    disenoReferencia: '',
    cantTotal: 0,
    cantRetenida: 0,
    estado: 'Aprobado',
    defecto: 'NINGUNO',
    reviso: REGISTRO_USERS[0],
    responsable: '',
    accionCorrectiva: '',
    observacionSugerida: '',
    observacion: 'NA',
    photo: ''
};

const Forms: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeFormType, setActiveFormType] = useState<'none' | 'general'>('none');
    const [isLinksViewOpen, setIsLinksViewOpen] = useState(false);
    const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
    const [embeddedForm, setEmbeddedForm] = useState<ExternalForm | null>(null);
    const [externalLinks, setExternalLinks] = useState<ExternalForm[]>(() => {
        const saved = localStorage.getItem('alco_external_links');
        return saved ? JSON.parse(saved) : [
            { id: '1', title: 'Seguimiento Ventas Alco', url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAANAAV-tB0VUMzdHVEo5SzhLTVpZSDZJRklFUVZCVjBJVy4u', description: 'Registro de requerimientos comerciales', color: 'blue' }
        ];
    });

    const [formData, setFormData] = useState<Omit<InspectionData, 'id'>>(INITIAL_FORM_DATA);
    const [submissions, setSubmissions] = useState<InspectionData[]>(() => {
        const saved = localStorage.getItem('alco_inspections_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => { localStorage.setItem('alco_external_links', JSON.stringify(externalLinks)); }, [externalLinks]);
    useEffect(() => { localStorage.setItem('alco_inspections_history', JSON.stringify(submissions)); }, [submissions]);

    // Modals & Links
    const handleAddExternalLink = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const newLink: ExternalForm = {
            id: Date.now().toString(),
            title: data.get('title') as string,
            url: data.get('url') as string,
            description: data.get('description') as string,
            color: 'blue'
        };
        setExternalLinks([...externalLinks, newLink]);
        setIsAddLinkModalOpen(false);
        addNotification({ type: 'success', title: 'ENLACE AGREGADO', message: 'Formulario centralizado con éxito.' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const parsePlanNumbers = (input: string): string[] => {
        const plans: Set<string> = new Set();
        const parts = input.split(',').map(p => p.trim());

        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n, 10));
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        plans.add(i.toString());
                    }
                }
            } else if (part) {
                plans.add(part);
            }
        });
        return Array.from(plans).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
        });
    };

    const simulateVision = () => {
        if (!formData.photo) {
            setFormData(prev => ({ ...prev, photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }));
            addNotification({ type: 'info', title: 'MODO DEMO', message: 'Se ha cargado una imagen de prueba automáticamente.' });
        }
        addNotification({ type: 'info', title: 'ANALIZANDO...', message: 'Ejecutando modelo YOLO v8 (Conteo y Defectos)...' });

        setTimeout(() => {
            const detectedCount = Math.floor(Math.random() * 50) + 1;
            const defects = ['NINGUNO', 'RAYAS', 'GOLPES', 'DECOLORACION', 'REVENTON'];
            const detectedDefect = Math.random() > 0.5 ? defects[Math.floor(Math.random() * defects.length)] : 'NINGUNO';
            let status = 'Aprobado';
            let alertLevel: 'None' | 'Warning' | 'Critical' = 'None';
            let isLocked = false;

            if (detectedDefect !== 'NINGUNO') {
                if (['REVENTON', 'DECOLORACION'].includes(detectedDefect)) {
                    status = 'Rechazado';
                    alertLevel = 'Critical';
                    isLocked = true;
                } else {
                    status = 'Aprobado (Condicionado)';
                    alertLevel = 'Warning';
                }
            }

            setFormData(prev => ({
                ...prev,
                cantTotal: detectedCount,
                defecto: detectedDefect,
                estado: status,
                alertLevel: alertLevel,
                isLocked: isLocked,
                observacion: prev.observacion === 'NA' ? `Análisis IA: Se detectaron ${detectedCount} unidades. Defecto identificado: ${detectedDefect}.` : `${prev.observacion} [IA: ${detectedCount} u, ${detectedDefect}]`
            }));

            if (alertLevel === 'Critical') {
                addNotification({ type: 'error', title: 'BLOQUEO DE CALIDAD', message: `Defecto CRÍTICO detectado (${detectedDefect}). Se requiere aprobación de supervisor.` });
            } else {
                addNotification({ type: 'success', title: 'ANÁLISIS COMPLETADO', message: `Conteo: ${detectedCount} | Defecto: ${detectedDefect}` });
            }
        }, 2500);
    };

    const handleVoiceData = (jsonString: string) => {
        try {
            const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);
            setFormData(prev => ({
                ...prev,
                ...data,
                observacion: data.observacion ? (prev.observacion === 'NA' ? data.observacion : `${prev.observacion} ${data.observacion}`) : prev.observacion
            }));
            addNotification({ type: 'success', title: 'AUTO-COMISIÓN IA', message: 'Campos diligenciados por voz.' });
        } catch (e) {
            console.error("Error parsing voice JSON", e);
            setFormData(prev => ({ ...prev, observacion: prev.observacion === 'NA' ? jsonString : `${prev.observacion} ${jsonString}` }));
        }
    };

    const handleEdit = (submission: InspectionData) => {
        const { id, ...data } = submission;
        setFormData(data);
        setEditingId(id);
        setActiveFormType('general');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar este registro de inspección permanentemente?')) {
            setSubmissions(prev => prev.filter(s => s.id !== id));
            addNotification({ type: 'error', title: 'REGISTRO ELIMINADO', message: 'La inspección ha sido eliminada del historial.' });
        }
    };

    const handleSubmitGeneral = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            // Update Mode
            const updatedSubmission: InspectionData = {
                id: editingId,
                ...formData
            };
            setSubmissions(prev => prev.map(s => s.id === editingId ? updatedSubmission : s));
            addNotification({ type: 'success', title: 'REGISTRO ACTUALIZADO', message: `Inspección para OP #${formData.op} actualizada correctamente.` });
            setEditingId(null);
        } else {
            // Create Mode (Existing Logic)
            const planNumbers = formData.planoOpc ? parsePlanNumbers(formData.planoOpc) : [formData.planoOpc];
            const plansToSubmit = planNumbers.length > 0 ? planNumbers : [formData.planoOpc];

            const newSubmissions: InspectionData[] = plansToSubmit.map((plan, index) => ({
                ...formData,
                id: (Date.now() + index).toString(),
                planoOpc: plan
            }));

            setSubmissions(prev => [...newSubmissions.reverse(), ...prev]);
            addNotification({ type: 'success', title: 'REGISTROS GUARDADOS', message: `${newSubmissions.length} inspecciones generadas para OP #${formData.op}.` });
        }

        setFormData(INITIAL_FORM_DATA);
        setActiveFormType('none');
    };

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-[#0b0b14] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    // Si hay un formulario embebido activo, mostramos el visor de pantalla completa
    if (embeddedForm) {
        return (
            <div className="fixed inset-0 z-[3000] bg-slate-900 flex flex-col animate-fade-in">
                {/* Barra de Herramientas del Navegador Interno */}
                <div className="bg-white dark:bg-alco-surface p-4 flex items-center justify-between border-b dark:border-white/10 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="size-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <LinkIcon />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{embeddedForm.title}</h2>
                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Conexión Segura Suite Alco</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { const url = embeddedForm.url; setEmbeddedForm(null); setTimeout(() => setEmbeddedForm({ ...embeddedForm, url }), 10); }}
                            className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-sky-600 rounded-xl transition-all"
                            title="Recargar Formulario"
                        >
                            <RefreshIcon />
                        </button>
                        <button
                            onClick={() => setEmbeddedForm(null)}
                            className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <i className="fas fa-times"></i> Finalizar y Salir
                        </button>
                    </div>
                </div>
                {/* Frame del Formulario */}
                <div className="flex-grow bg-slate-100 dark:bg-black/20 overflow-hidden">
                    <iframe
                        src={embeddedForm.url}
                        className="w-full h-full border-none"
                        title={embeddedForm.title}
                        allow="camera; microphone; geolocation"
                    />
                </div>
                <div className="bg-white dark:bg-alco-surface p-2 text-center border-t dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Sandbox Form Alco Suite &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><Breadcrumbs crumbs={[{ label: 'Calidad', path: '/dashboard' }, { label: 'Formularios' }]} /><h1 className="text-3xl font-black text-slate-800 dark:text-white mt-2 tracking-tight">Gestión de Inspecciones</h1></div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsLinksViewOpen(!isLinksViewOpen)} className={`flex items-center gap-2 px-4 py-2.5 ${isLinksViewOpen ? 'bg-slate-300 dark:bg-slate-600' : 'bg-[#4b5563] hover:bg-[#374151]'} text-white rounded-lg font-bold text-xs shadow-md transition-all`}><LinkIcon /> Enlaces Externos</button>
                    <button onClick={() => setActiveFormType('general')} className="flex items-center gap-2 px-4 py-2.5 bg-[#005c97] hover:bg-[#004a7a] text-white rounded-lg font-bold text-xs shadow-md transition-all"><PlusIcon /> Nueva Inspección</button>
                </div>
            </div>

            {isLinksViewOpen && (
                <div className="bg-white dark:bg-alco-surface rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 p-8 animate-fade-in-down mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div><h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Formularios Externos Embebidos</h2></div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsAddLinkModalOpen(true)} className="px-4 py-2 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-900/20 active:scale-95 transition-all">+ Agregar Enlace</button>
                            <button onClick={() => setIsLinksViewOpen(false)} className="text-slate-400 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-colors">Cerrar</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {externalLinks.map(link => (
                            <div key={link.id} className="bg-white dark:bg-[#0b0b14] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-sky-500/50 transition-all relative overflow-hidden">
                                <div className="flex items-start gap-4">
                                    <div className="size-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 text-xl"><LinkIcon /></div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase truncate tracking-tight mb-1">{link.title}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate opacity-60 mb-4">{link.description}</p>
                                        <button
                                            onClick={() => setEmbeddedForm(link)}
                                            className="inline-flex items-center gap-2 text-sky-600 font-black text-[9px] uppercase hover:underline"
                                        >
                                            Abrir en Suite <ChevronRightIcon className="scale-75" />
                                        </button>
                                    </div>
                                    <button onClick={() => setExternalLinks(externalLinks.filter(l => l.id !== link.id))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-rose-500 transition-opacity"><TrashIcon className="scale-75" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeFormType === 'general' && (
                <div className="bg-white dark:bg-alco-surface p-4 md:p-10 rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-8 border-b dark:border-white/5 pb-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                <RobotIcon className="text-sky-600" /> Inspección Multimodal Alco
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-9 opacity-60">IA + Captura Semántica por Voz</p>
                        </div>
                        <button onClick={() => setActiveFormType('none')} className="text-slate-300 hover:text-rose-500 transition-colors text-3xl font-light">&times;</button>
                    </div>
                    <form onSubmit={handleSubmitGeneral} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Panel Izquierdo: Captura Visual */}
                            <div className="lg:col-span-3 space-y-6">
                                <label className={labelStyles}>Evidencia Visual</label>
                                <div className="aspect-square bg-slate-50 dark:bg-black/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                                    {formData.photo ? (
                                        <img src={formData.photo} alt="Evidencia" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-6 opacity-30">
                                            <CameraIcon className="text-4xl mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Sin captura</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button type="button" onClick={() => addNotification({ type: 'info', title: 'Cámara', message: 'Iniciando hardware de captura...' })} className="p-4 bg-sky-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><CameraIcon /></button>
                                        {formData.photo && <button type="button" onClick={() => setFormData({ ...formData, photo: '' })} className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><TrashIcon /></button>}
                                    </div>
                                </div>
                                <div className="p-5 bg-sky-50 dark:bg-sky-900/10 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2 mb-2"><SparklesIcon className="scale-75" /> Recomendación IA</p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">"Capture los bordes de la perfilería a 45° para detectar rebabas de corte automáticamente."</p>
                                </div>
                            </div>

                            {/* Panel Derecho: Datos Técnicos */}
                            <div className="lg:col-span-9 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className={labelStyles}>1. FECHA:</label><input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} className={inputStyles} /></div>
                                    <SearchableSelect label="2. ÁREA DE PROCESO:" options={AREAS_PROCESO} value={formData.areaProceso} onChange={(val) => setFormData({ ...formData, areaProceso: val })} />
                                    <div><label className={labelStyles}>3. ORDEN DE PRODUCCIÓN (OP):</label><input type="text" name="op" value={formData.op} onChange={handleInputChange} placeholder="EJ: OP-24-100" className={inputStyles} /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={labelStyles}>4. PLANO / ÍTEMS # (Rango: 1-10 o 1,3,5):</label><input type="text" name="planoOpc" value={formData.planoOpc} onChange={handleInputChange} placeholder="EJ: 1-5, 8, 10" className={inputStyles} /></div>
                                    <SearchableSelect label="5. DISEÑO / SERIE:" options={DISENO_REFERENCIA_OPTIONS} value={formData.disenoReferencia} onChange={(val) => setFormData({ ...formData, disenoReferencia: val })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div><label className={labelStyles}>6. CANT. TOTAL:</label><input type="number" name="cantTotal" value={formData.cantTotal} onChange={handleInputChange} className={inputStyles} /></div>
                                    <div><label className={labelStyles}>7. CANT. RETENIDA:</label><input type="number" name="cantRetenida" value={formData.cantRetenida} onChange={handleInputChange} className={inputStyles} /></div>
                                    <div><label className={labelStyles}>8. ESTADO SGC:</label><select name="estado" value={formData.estado} onChange={handleInputChange} required className={inputStyles}>{ESTADO_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
                                    <div><label className={labelStyles}>9. DEFECTO TÉCNICO:</label><select name="defecto" value={formData.defecto} onChange={handleInputChange} className={inputStyles}>{DEFECTO_TYPES.map(d => <option key={d}>{d}</option>)}</select></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SearchableSelect label="10. REVISÓ (INSPECTOR):" options={REGISTRO_USERS} value={formData.reviso} onChange={(val) => setFormData({ ...formData, reviso: val })} />
                                    <SearchableSelect label="11. RESPONSABLE (OPERARIO):" options={OPERARIO_RESPONSABLES} value={formData.responsable} onChange={(val) => setFormData({ ...formData, responsable: val })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={labelStyles}>12. ACCIÓN CORRECTIVA:</label><select name="accionCorrectiva" value={formData.accionCorrectiva} onChange={handleInputChange} className={inputStyles}><option value="">NINGUNA (VACÍO)</option>{ACCION_CORRECTIVA_OPTIONS.map(a => <option key={a}>{a}</option>)}</select></div>
                                    <SearchableSelect label="OBSERVACIÓN SUGERIDA:" options={OBSERVACIONES_SUGERIDAS} value={formData.observacionSugerida} onChange={(val) => setFormData({ ...formData, observacionSugerida: val })} />
                                </div>

                                <div className="relative">
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <label className={labelStyles}>13. OBSERVACIÓN (DICTAMEN FINAL)</label>
                                        <TranscriptionButton onTranscription={(text) => setFormData(prev => ({ ...prev, observacion: prev.observacion ? `${prev.observacion} ${text}` : text }))} className="scale-75 origin-right" />
                                    </div>
                                    <textarea
                                        name="observacion"
                                        value={formData.observacion}
                                        onChange={handleInputChange}
                                        className={`${inputStyles} min-h-[120px] normal-case font-medium`}
                                        placeholder="Relato técnico detallado del hallazgo detectado..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setActiveFormType('none')} className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={formData.isLocked}
                                        className={`px-12 py-4 ${formData.isLocked ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-[#005c97] text-white hover:scale-105 active:scale-95 shadow-xl shadow-sky-900/20'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3`}
                                    >
                                        {formData.isLocked ? <i className="fas fa-lock"></i> : <SaveIcon />}
                                        {formData.isLocked ? 'Bloqueado por Calidad' : 'Firmar y Guardar Registro'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {activeFormType === 'none' && (
                <div className="bg-white dark:bg-alco-surface rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-500 animate-fade-in">
                    <div className="p-8 bg-slate-50 dark:bg-white/5 border-b dark:border-white/5 flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Historial Maestro de Inspecciones</h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-inner border dark:border-white/5">
                            <SearchIcon />
                            <input className="bg-transparent border-none outline-none text-xs font-bold uppercase w-48" placeholder="BUSCAR OP..." />
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[1800px]">
                            <thead className="bg-[#4a69bd] text-white text-[9px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-5 border-r border-white/10">FECHA</th>
                                    <th className="px-6 py-5 border-r border-white/10">ÁREA DE PROCESO</th>
                                    <th className="px-6 py-5 border-r border-white/10">OP</th>
                                    <th className="px-6 py-5 border-r border-white/10">PLANO (OPC)</th>
                                    <th className="px-6 py-5 border-r border-white/10">DISEÑO/REFERENCIA</th>
                                    <th className="px-6 py-5 border-r border-white/10 text-center">CANT TOTAL</th>
                                    <th className="px-6 py-5 border-r border-white/10 text-center">CANT RETENIDA</th>
                                    <th className="px-6 py-5 border-r border-white/10">ESTADO</th>
                                    <th className="px-6 py-5 border-r border-white/10">DEFECTO</th>
                                    <th className="px-6 py-5 border-r border-white/10">REVISÓ</th>
                                    <th className="px-6 py-5 border-r border-white/10">RESPONSABLE</th>
                                    <th className="px-6 py-5 border-r border-white/10">ACCION CORRECTIVA</th>
                                    <th className="px-6 py-5">OBSERVACION</th>
                                    <th className="px-6 py-5 text-right">GESTIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {submissions.length === 0 ? (
                                    <tr><td colSpan={14} className="px-8 py-24 text-center opacity-20"><p className="font-bold text-sm tracking-tight uppercase">Base de datos operativa vacía</p></td></tr>
                                ) : submissions.map(sub => (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[10px] font-bold">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap border-r dark:border-white/5">{sub.fecha}</td>
                                        <td className="px-6 py-4 uppercase text-slate-800 dark:text-slate-100 border-r dark:border-white/5">{sub.areaProceso}</td>
                                        <td className="px-6 py-4 font-mono text-sky-700 border-r dark:border-white/5">{sub.op}</td>
                                        <td className="px-6 py-4 border-r dark:border-white/5">{sub.planoOpc || '-'}</td>
                                        <td className="px-6 py-4 uppercase text-slate-600 dark:text-slate-400 border-r dark:border-white/5">{sub.disenoReferencia}</td>
                                        <td className="px-6 py-4 text-center border-r dark:border-white/5">{sub.cantTotal}</td>
                                        <td className="px-6 py-4 text-center text-rose-600 border-r dark:border-white/5">{sub.cantRetenida}</td>
                                        <td className="px-6 py-4 border-r dark:border-white/5">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${sub.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : sub.estado === 'Rechazado' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {sub.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-rose-600 border-r dark:border-white/5">{sub.defecto}</td>
                                        <td className="px-6 py-4 uppercase text-slate-600 dark:text-slate-400 border-r dark:border-white/5">{sub.reviso}</td>
                                        <td className="px-6 py-4 uppercase text-slate-600 dark:text-slate-400 border-r dark:border-white/5">{sub.responsable}</td>
                                        <td className="px-6 py-4 text-sky-600 italic border-r dark:border-white/5">{sub.accionCorrectiva}</td>
                                        <td className="px-6 py-4 max-w-xs truncate">{sub.observacion}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                                            <button onClick={() => handleEdit(sub)} className="p-2 text-slate-300 hover:text-sky-600"><EditIcon /></button>
                                            <button onClick={() => handleDelete(sub.id)} className="p-2 text-slate-300 hover:text-rose-600"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isAddLinkModalOpen && (
                <div className="fixed inset-0 z-[2500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white dark:bg-[#0b0b14] rounded-3xl max-w-lg w-full p-12 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-white/5 relative overflow-hidden my-auto">
                        <div className="flex justify-between items-start mb-10">
                            <div><h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Vincular <span className="text-sky-600">Formulario</span></h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Centralización de Datos Externos</p></div>
                            <button onClick={() => setIsAddLinkModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleAddExternalLink} className="space-y-6">
                            <div><label className={labelStyles}>Título del Enlace</label><input required name="title" className={inputStyles} placeholder="EJ: ENCUESTA SATISFACCIÓN" /></div>
                            <div><label className={labelStyles}>URL del Formulario (Microsoft/Google Forms)</label><input required name="url" type="url" className={inputStyles} placeholder="HTTPS://FORMS.OFFICE.COM/..." /></div>
                            <div><label className={labelStyles}>Breve Descripción</label><input required name="description" className={inputStyles} placeholder="PARA QUÉ SIRVE ESTE ENLACE..." /></div>
                            <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"><SaveIcon /> Vincular Repositorio</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Forms;
