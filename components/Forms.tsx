
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { InspectionData, AdverseEventData, ExternalForm } from '../types';
import Breadcrumbs from './Breadcrumbs';
import TranscriptionButton from './TranscriptionButton';
import {
    AREAS_PROCESO, ESTADO_OPTIONS, DEFECTO_TYPES, REGISTRO_USERS,
    ACCION_CORRECTIVA_OPTIONS, DISENO_REFERENCIA_OPTIONS, OPERARIO_RESPONSABLES,
    OBSERVACIONES_SUGERIDAS,
    EditIcon, DeleteIcon, CameraIcon, FileExcelIcon, PlusIcon, LinkIcon, RefreshIcon,
    RobotIcon, ClipboardListIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, MicrophoneIcon, SparklesIcon,
    SaveIcon, GlobeIcon, XCircleIcon
} from '../constants';
import { useNotification } from './NotificationSystem';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../insforgeClient';
import BulkUploadButton from './BulkUploadButton';

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

    useEffect(() => { if (!isOpen) setSearchTerm(value || ''); }, [value, isOpen]);

    const filteredOptions = useMemo(() => options.filter(opt => opt.toLowerCase().includes((searchTerm || '').toLowerCase())), [options, searchTerm]);
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
    const [externalLinks, setExternalLinks] = useState<ExternalForm[]>([]);

    useEffect(() => {
        fetchExternalLinks();
    }, []);

    const fetchExternalLinks = async () => {
        try {
            const { data, error } = await supabase.from('external_links').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setExternalLinks(data || []);
        } catch (error) {
            console.error('Error fetching links:', error);
        }
    };

    const [formData, setFormData] = useState<Omit<InspectionData, 'id'>>(INITIAL_FORM_DATA);
    const [submissions, setSubmissions] = useState<InspectionData[]>([]);
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [globalSearch, setGlobalSearch] = useState('');
    const [filterId, setFilterId] = useState<string | null>(null); // New state for deep link filtering
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;
    const [columnFilters, setColumnFilters] = useState({
        fecha: '', op: '', areaProceso: '', planoOpc: '', disenoReferencia: '',
        cantTotal: '', cantRetenida: '', estado: '', defecto: '', reviso: '',
        responsable: '', accionCorrectiva: '', observacion: ''
    });

    // --- Column Resizing Logic ---
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
        checkbox: 50,
        fecha: 120, areaProceso: 150, op: 100, planoOpc: 100, disenoReferencia: 150,
        cantTotal: 100, cantRetenida: 100, estado: 120, defecto: 120, reviso: 150,
        responsable: 150, accionCorrectiva: 150, observacion: 250, actions: 100
    });
    const resizingRef = useRef<{ column: string, startX: number, startWidth: number } | null>(null);

    const handleResizeStart = (column: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startWidth = columnWidths[column] || 100;
        resizingRef.current = { column, startX: e.clientX, startWidth };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { column, startX, startWidth } = resizingRef.current;
        const diff = e.clientX - startX;
        setColumnWidths(prev => ({ ...prev, [column]: Math.max(50, startWidth + diff) }));
    };

    const handleResizeEnd = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const filteredSubmissions = useMemo(() => {
        // 0. Strict Filter by ID (Deep Link)
        if (filterId) {
            return submissions.filter(s => s.id === filterId);
        }

        let result = submissions.filter(sub => {
            // 1. Filtro por columnas específicas
            const matchesColumns = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const fieldVal = String((sub as any)[key] || '').toLowerCase();
                return fieldVal.includes(value.toLowerCase());
            });

            // 2. Búsqueda Global
            if (!globalSearch) return matchesColumns;

            const matchesGlobal = Object.values(sub).some(val =>
                String(val || '').toLowerCase().includes(globalSearch.toLowerCase())
            );

            return matchesColumns && matchesGlobal;
        });

        // 3. Ordenamiento
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aValue = (a as any)[sortConfig.key!] || '';
                const bValue = (b as any)[sortConfig.key!] || '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [submissions, columnFilters, globalSearch, sortConfig, filterId]);

    const paginatedSubmissions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredSubmissions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [globalSearch, columnFilters, filterId]);

    const location = useLocation();

    useEffect(() => {
        fetchInspections();
    }, []);

    useEffect(() => {
        if (location.state) {
            if (location.state.filterId) {
                setFilterId(location.state.filterId);
                // Optional: Automatically open edit mode
                setEditingId(location.state.filterId);
            }
            if (location.state.editingId && !location.state.filterId) {
                // Fallback for old calls if any
                setEditingId(location.state.editingId);
            }
        }
    }, [location.state, submissions]);

    const fetchInspections = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('field_inspections')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: InspectionData[] = (data || []).map(item => ({
                id: item.id,
                fecha: item.fecha || new Date().toISOString().split('T')[0],
                areaProceso: item.area_proceso || '',
                op: item.op || '',
                planoOpc: item.plano_opc || '',
                disenoReferencia: item.diseno_referencia || '',
                cantTotal: item.cant_total || 0,
                cantRetenida: item.cant_retenida || 0,
                estado: item.estado || 'Aprobado',
                defecto: item.defecto || 'NINGUNO',
                reviso: item.reviso || '',
                responsable: item.responsable || '',
                accionCorrectiva: item.accion_correctiva || '',
                observacionSugerida: item.observacion_sugerida || '',
                observacion: item.observacion || '',
                photo: item.photo_url || ''
            }));

            setSubmissions(mappedData);
        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar las inspecciones.' });
        } finally {
            setLoading(false);
        }
    };

    // Modals & Links
    const handleAddExternalLink = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        try {
            const { error } = await supabase.from('external_links').insert([{
                title: (formData.get('title') as string).toUpperCase(),
                url: formData.get('url') as string,
                description: formData.get('description') as string,
                color: formData.get('color') as string
            }]);

            if (error) throw error;

            fetchExternalLinks();
            setIsAddLinkModalOpen(false);
            addNotification({ type: 'success', title: 'ENLACE AGREGADO', message: 'Configuración sincronizada en la nube.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
    };

    const handleDeleteLink = async (id: string, title: string) => {
        if (!confirm(`¿Eliminar enlace "${title}"?`)) return;
        try {
            const { error } = await supabase.from('external_links').delete().eq('id', id);
            if (error) throw error;
            fetchExternalLinks();
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
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

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeImage = async () => {
        if (!API_KEY || API_KEY.includes('YOUR_GEMINI_API_KEY')) {
            addNotification({ type: 'error', title: 'CONFIGURACIÓN FALTANTE', message: 'Configure VITE_GEMINI_API_KEY en .env.local con una llave válida.' });
            return;
        }

        let base64Image = formData.photo;
        let mimeType = "image/png"; // Default, will try to infer or assume

        if (!base64Image) {
            // Load a demo image if none exists (for testing purposes)
            const demoImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAiSURBVHgB7c6xCQAgDAVRR9A6g4u4/2QW4QPct8p1CR8zM3O3750A8iJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiyx9I8sF/w49i0kAAAAASUVORK5CYII=';
            setFormData(prev => ({ ...prev, photo: demoImage }));
            addNotification({ type: 'info', title: 'MODO DEMO', message: 'Se ha cargado una imagen de prueba. Procesando...' });
            base64Image = demoImage;
        }

        // Extract base64 data and mime type
        const parts = base64Image.split(',');
        if (parts.length > 1) {
            mimeType = parts[0].match(/:(.*?);/)?.[1] || mimeType;
            base64Image = parts[1];
        } else {
            // If it's just base64 without data URI prefix, assume png
            mimeType = "image/png";
        }

        setIsAnalyzing(true);
        addNotification({ type: 'info', title: 'ANALIZANDO...', message: 'Gemini 1.5 Flash está inspeccionando la imagen...' });

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

            const prompt = `
                Analiza esta imagen de una parte industrial / perfil de aluminio. Actúa como un experto inspector de calidad.
                Responde EXCLUSIVAMENTE con un objeto JSON (sin markdown) con la siguiente estructura:
                {
                    "cantTotal": number (conteo de unidades visibles, estimado si es difícil),
                    "defecto": string (uno de: "NINGUNO", "RAYAS", "GOLPES", "DECOLORACION", "REVENTON"),
                    "observacion": string (descripción técnica breve y profesional del hallazgo en ESPAÑOL)
                }
                Si no se detecta defecto, el defecto es "NINGUNO".
                Asegúrate de que el campo "observacion" esté SIEMPRE en ESPAÑOL. Responde SIEMPRE en Español.
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            // Parse JSON with cleanup (remove Markdown ```json ... ``` if present)
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJson);

            // Determine status based on defect
            let status = 'Aprobado';
            let alertLevel: 'None' | 'Warning' | 'Critical' = 'None';
            let isLocked = false;

            if (analysis.defecto !== 'NINGUNO') {
                if (['REVENTON', 'DECOLORACION'].includes(analysis.defecto)) {
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
                cantTotal: analysis.cantTotal || 0,
                defecto: analysis.defecto || 'NINGUNO',
                estado: status,
                alertLevel: alertLevel,
                isLocked: isLocked,
                observacion: prev.observacion === 'NA'
                    ? `IA: ${analysis.observacion}`
                    : `${prev.observacion} \n[IA]: ${analysis.observacion}`
            }));

            if (alertLevel === 'Critical') {
                addNotification({ type: 'error', title: 'BLOQUEO DE CALIDAD', message: `Defecto CRÍTICO detectado (${analysis.defecto}).` });
            } else {
                addNotification({ type: 'success', title: 'ANÁLISIS COMPLETADO', message: `Conteo: ${analysis.cantTotal} | Defecto: ${analysis.defecto}` });
            }

        } catch (error: any) {
            console.error("AI Error:", error);
            addNotification({ type: 'error', title: 'FALLO DE ANÁLISIS', message: 'No se pudo procesar la imagen con IA.' });
        } finally {
            setIsAnalyzing(false);
        }
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

    const handleDelete = async (id: string | string[]) => {
        const isBulk = Array.isArray(id);
        const idsToDelete = isBulk ? id : [id];
        const message = isBulk
            ? `¿Confirmas la eliminación permanente de ${idsToDelete.length} registros seleccionados?`
            : '¿Eliminar este registro de inspección permanentemente?';

        if (confirm(message)) {
            setLoading(true);
            try {
                // Chunk the deletion to avoid URL length limits (Supabase/PostgREST)
                const chunkSize = 100;
                for (let i = 0; i < idsToDelete.length; i += chunkSize) {
                    const chunk = idsToDelete.slice(i, i + chunkSize);
                    const { error } = await supabase.from('field_inspections').delete().in('id', chunk);
                    if (error) throw error;

                    // Update local state incrementally to provide feedback
                    setSubmissions(prev => prev.filter(s => !chunk.includes(s.id)));
                }

                if (isBulk) setSelectedIds(new Set());
                addNotification({
                    type: 'error',
                    title: isBulk ? 'REGISTROS ELIMINADOS' : 'REGISTRO ELIMINADO',
                    message: isBulk ? `${idsToDelete.length} registros han sido removidos.` : 'La inspección ha sido eliminada del historial.'
                });
            } catch (error) {
                console.error(error);
                addNotification({ type: 'error', title: 'Error', message: 'No se pudo completar la eliminación acelerada. Algunos registros podrían persistir.' });
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredSubmissions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const triggerNC = async (inspection: any) => {
        const serial_id = `NC-AUTO-${Date.now().toString().slice(-4)}`;
        const newNCData = {
            serial_id,
            title: `NC AUTOMÁTICA: RECHAZO EN ${inspection.area_proceso}`.toUpperCase(),
            process: inspection.area_proceso,
            project: inspection.op,
            severity: 'Mayor', // Default for rejections
            description: `Hallazgo generado automáticamente por inspección rechazada. Defecto: ${inspection.defecto}. Observación: ${inspection.observacion}`,
            status: 'Abierta',
            rca: { why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '' }
        };

        const { error } = await supabase.from('non_conformities').insert([newNCData]);
        if (error) console.error('Error triggering NC:', error);
    };

    const handleSubmitGeneral = async (e: React.FormEvent) => {
        e.preventDefault();

        const getDBPayload = (data: InspectionData | Omit<InspectionData, 'id'>) => ({
            fecha: data.fecha || new Date().toISOString().split('T')[0],
            area_proceso: (data.areaProceso || '').toUpperCase(),
            op: (data.op || '').toUpperCase(),
            plano_opc: (data.planoOpc || '').toString().toUpperCase(),
            diseno_referencia: (data.disenoReferencia || '').toUpperCase(),
            cant_total: parseInt(data.cantTotal.toString()) || 0,
            cant_retenida: parseInt(data.cantRetenida.toString()) || 0,
            estado: data.estado || 'Aprobado',
            defecto: (data.defecto || 'NINGUNO').toUpperCase(),
            reviso: data.reviso || '',
            responsable: (data.responsable || '').toUpperCase(),
            accion_correctiva: (data.accionCorrectiva || '').toUpperCase(),
            observacion_sugerida: (data.observacionSugerida || '').toUpperCase(),
            observacion: data.observacion || 'NA',
            photo_url: data.photo
        });

        try {
            if (editingId) {
                // Update Mode
                const payload = getDBPayload(formData);
                const { error } = await supabase
                    .from('field_inspections')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                addNotification({ type: 'success', title: 'REGISTRO ACTUALIZADO', message: `Inspección para OP #${formData.op} actualizada correctamente.` });
                setEditingId(null);
            } else {
                // Create Mode
                const planNumbers = formData.planoOpc ? parsePlanNumbers(formData.planoOpc) : [formData.planoOpc];
                const plansToSubmit = planNumbers.length > 0 ? planNumbers : [formData.planoOpc];

                const inserts = plansToSubmit.map(plan => getDBPayload({ ...formData, planoOpc: plan }));

                const { error } = await supabase
                    .from('field_inspections')
                    .insert(inserts);

                if (error) throw error;
                addNotification({ type: 'success', title: 'REGISTROS GUARDADOS', message: `${inserts.length} inspecciones generadas para OP #${formData.op}.` });

                // Automatic NC Trigger
                if (formData.estado === 'Rechazado') {
                    await triggerNC(inserts[0]); // Trigger for the first one if multiple
                    addNotification({ type: 'warning', title: 'NC GENERADA', message: 'Se ha abierto un borrador de No Conformidad automáticamente.' });
                }
            }

            fetchInspections();
            setFormData(INITIAL_FORM_DATA);
            setActiveFormType('none');

        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error', message: 'No se pudo guardar la inspección.' });
        }
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

    // Helper functions for Bulk Upload
    const fuzzyFind = (row: any, candidates: string[]) => {
        const normalize = (s: string) => s.toLowerCase().replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').trim();
        const rowKeys = Object.keys(row);

        // 1. Exact match (normalized)
        for (const candidate of candidates) {
            const match = rowKeys.find(key => normalize(key) === normalize(candidate));
            if (match) return row[match];
        }

        // 2. Partial match (if strict fails)
        for (const candidate of candidates) {
            const match = rowKeys.find(key => normalize(key).includes(normalize(candidate)));
            if (match) return row[match];
        }
        return undefined;
    };

    const parseExcelDate = (value: any): string => {
        if (!value) return new Date().toISOString().split('T')[0];
        // Excel serial date (number of days since 1900-01-01)
        if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            // Adjust for timezone offset to prevent date shifting
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            return date.toISOString().split('T')[0];
        }
        // String date
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><Breadcrumbs crumbs={[{ label: 'Calidad', path: '/dashboard' }, { label: 'Formularios' }]} /><h1 className="text-3xl font-black text-slate-800 dark:text-white mt-2 tracking-tight">Gestión de Inspecciones</h1></div>
                <div className="flex flex-wrap gap-2">
                    <BulkUploadButton
                        tableName="field_inspections"
                        onUploadComplete={fetchInspections}
                        label="Carga Masiva (Excel)"
                        mapping={(row: any) => ({
                            // Campos requeridos por la base de datos (snake_case)
                            fecha: parseExcelDate(fuzzyFind(row, ['FECHA', 'DATE'])),
                            area_proceso: String(fuzzyFind(row, ['ÁREA DE PROCESO', 'AREA DE PROCESO', 'AREA']) || '').toUpperCase(),
                            op: String(fuzzyFind(row, ['OP', 'ORDEN']) || '').toUpperCase(),
                            plano_opc: String(fuzzyFind(row, ['PLANO (OPC)', 'PLANO', 'ITEM']) || '').toUpperCase(),
                            diseno_referencia: String(fuzzyFind(row, ['DISEÑO/REFERENCIA', 'DISEÑO', 'REFERENCIA']) || '').toUpperCase(),
                            cant_total: parseInt(fuzzyFind(row, ['CANT TOTAL', 'CANTIDAD', 'TOTAL']) || '0') || 0,
                            cant_retenida: parseInt(fuzzyFind(row, ['CANT RETENIDA', 'RETENIDA', 'RECHAZADA']) || '0') || 0,
                            estado: fuzzyFind(row, ['ESTADO', 'STATUS']) || 'Aprobado',
                            defecto: String(fuzzyFind(row, ['DEFECTO', 'FALLA']) || 'NINGUNO').toUpperCase(),
                            reviso: String(fuzzyFind(row, ['REVISÓ', 'REVISO', 'INSPECTOR']) || '').toUpperCase(),
                            responsable: String(fuzzyFind(row, ['RESPONSABLE', 'OPERARIO']) || '').toUpperCase(),
                            accion_correctiva: String(fuzzyFind(row, ['ACCION CORRECTIVA', 'ACCION']) || '').toUpperCase(),
                            observacion: String(fuzzyFind(row, ['OBSERVACION', 'HALLAZGO', 'OBSERVACIONES']) || 'NA')
                        })}
                        columns={[
                            // Definición de columnas para la VISTA PREVIA (debe coincidir con Excel y Tabla Principal)
                            { key: 'fecha', label: 'FECHA' },
                            { key: 'area_proceso', label: 'ÁREA DE PROCESO' },
                            { key: 'op', label: 'OP' },
                            { key: 'plano_opc', label: 'PLANO (OPC)' },
                            { key: 'diseno_referencia', label: 'DISEÑO/REFERENCIA' },
                            { key: 'cant_total', label: 'CANT TOTAL' },
                            { key: 'cant_retenida', label: 'CANT RETENIDA' },
                            { key: 'estado', label: 'ESTADO' },
                            { key: 'defecto', label: 'DEFECTO' },
                            { key: 'reviso', label: 'REVISÓ' },
                            { key: 'responsable', label: 'RESPONSABLE' },
                            { key: 'accion_correctiva', label: 'ACCIÓN CORRECTIVA' },
                            { key: 'observacion', label: 'OBSERVACIÓN' }
                        ]}
                    />
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
                                    <button onClick={() => handleDeleteLink(link.id, link.title)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-rose-500 transition-opacity"><TrashIcon className="scale-75" /></button>
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

                                    <button
                                        type="button"
                                        onClick={analyzeImage}
                                        disabled={isAnalyzing}
                                        className={`w-full mt-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02]'}`}
                                    >
                                        {isAnalyzing ? <RefreshIcon className="animate-spin" /> : <SparklesIcon />}
                                        {isAnalyzing ? 'Procesando...' : 'Analizar con IA'}
                                    </button>
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
                <div className="premium-card overflow-hidden animate-fade-in">
                    <div className="p-8 bg-slate-50 dark:bg-white/5 border-b dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Historial Maestro de Inspecciones</h3>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* Mobile-only Select All Toggle */}
                            <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg border dark:border-white/10">
                                <input
                                    type="checkbox"
                                    checked={filteredSubmissions.length > 0 && selectedIds.size === filteredSubmissions.length}
                                    onChange={toggleSelectAll}
                                    className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Todo</span>
                            </div>

                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => handleDelete(Array.from(selectedIds))}
                                    disabled={loading}
                                    className={`px-4 py-2 ${loading ? 'bg-slate-400' : 'bg-rose-600 shadow-lg shadow-rose-900/20'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2`}
                                >
                                    {loading ? <RefreshIcon className="animate-spin scale-75" /> : <TrashIcon className="scale-75" />}
                                    {loading ? 'Borrando...' : `Eliminar (${selectedIds.size})`}
                                </button>
                            )}
                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-inner border dark:border-white/5 flex-grow md:flex-initial">
                                <input
                                    className="bg-transparent border-none outline-none text-xs font-bold uppercase w-full md:w-48 placeholder:text-slate-400"
                                    placeholder="BUSCAR..."
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                />
                                <SearchIcon className="text-slate-400 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => { }} />
                            </div>
                        </div>
                    </div>

                    {/* VISTA MÓVIL: TARJETAS */}
                    <div className="md:hidden p-4 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <RefreshIcon className="animate-spin text-[#5d5fef]" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando registros...</p>
                            </div>
                        ) : paginatedSubmissions.length === 0 ? (
                            <div className="text-center py-12 opacity-30 text-xs font-black uppercase tracking-[0.3em]">No se encontraron resultados</div>
                        ) : paginatedSubmissions.map(sub => (
                            <div key={sub.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border dark:border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(sub.id)}
                                            onChange={() => toggleSelectRow(sub.id)}
                                            className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sub.fecha}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${(sub.estado || '').toUpperCase() === 'APROBADO' ? 'bg-emerald-400 text-black border-emerald-500' :
                                        (sub.estado || '').toUpperCase() === 'REPROCESAR' ? 'bg-red-600 text-white border-red-700' :
                                            (sub.estado || '').toUpperCase() === 'RECHAZADO' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                        {sub.estado}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{sub.areaProceso}</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        <p className="text-[10px] text-sky-600 font-bold uppercase font-mono">OP: {sub.op}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">PLANO: {sub.planoOpc || '-'}</p>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-black uppercase mt-1 tracking-wider">{sub.disenoReferencia}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 py-2 border-y dark:border-white/5">
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total</span>
                                        <span className="text-xs font-bold">{sub.cantTotal}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Retenida</span>
                                        <span className="text-xs font-bold text-rose-600">{sub.cantRetenida}</span>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsable</span>
                                        <span className="text-[10px] font-bold uppercase">{sub.responsable || sub.reviso}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(sub)} className="p-3 bg-white dark:bg-white/5 text-slate-400 rounded-xl hover:text-sky-600 transition-all"><EditIcon /></button>
                                        <button onClick={() => handleDelete(sub.id)} className="p-3 bg-white dark:bg-white/5 text-slate-400 rounded-xl hover:text-rose-600 transition-all"><TrashIcon /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* VISTA ESCRITORIO: TABLA */}
                    <div className="hidden md:block overflow-x-auto pb-4">
                        <table className="w-full min-w-[2000px] text-left border-collapse text-[10px] table-fixed">
                            <thead>
                                <tr className="bg-[#3b82f6] text-white font-black tracking-wider border-b border-white/10">
                                    <th style={{ width: columnWidths.checkbox, minWidth: columnWidths.checkbox }} className="px-4 py-5 border-r border-white/10 text-center group cursor-pointer hover:bg-white/10 transition-colors relative" onClick={() => handleSort('fecha')}>
                                        <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size > 0 && selectedIds.size === filteredSubmissions.length}
                                                onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                                className="size-4 rounded border-white/20 bg-transparent text-sky-600 focus:ring-sky-500 mb-1 cursor-pointer"
                                            />
                                            <div className="flex flex-col -space-y-1">
                                                <span className={`text-[8px] leading-none ${sortConfig.key === 'fecha' && sortConfig.direction === 'asc' ? 'text-white' : 'text-white/40'}`}>▲</span>
                                                <span className={`text-[8px] leading-none ${sortConfig.key === 'fecha' && sortConfig.direction === 'desc' ? 'text-white' : 'text-white/40'}`}>▼</span>
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('checkbox', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.fecha, minWidth: columnWidths.fecha }} className="px-6 py-5 border-r border-white/10 uppercase cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('fecha')}>
                                        <div className="flex items-center gap-2">Fecha {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('fecha', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.areaProceso, minWidth: columnWidths.areaProceso }} className="px-6 py-5 border-r border-white/10 uppercase whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('areaProceso')}>
                                        <div className="flex items-center gap-2">Área de Proceso {sortConfig.key === 'areaProceso' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('areaProceso', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.op, minWidth: columnWidths.op }} className="px-6 py-5 border-r border-white/10 uppercase cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('op')}>
                                        <div className="flex items-center gap-2">OP {sortConfig.key === 'op' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('op', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.planoOpc, minWidth: columnWidths.planoOpc }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('planoOpc')}>
                                        <div className="flex items-center gap-2">PLANO (OPC) {sortConfig.key === 'planoOpc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('planoOpc', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.disenoReferencia, minWidth: columnWidths.disenoReferencia }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('disenoReferencia')}>
                                        <div className="flex items-center gap-2">DISEÑO/REFERENCIA {sortConfig.key === 'disenoReferencia' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('disenoReferencia', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.cantTotal, minWidth: columnWidths.cantTotal }} className="px-6 py-5 border-r border-white/10 text-center cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('cantTotal')}>
                                        <div className="flex items-center justify-center gap-2">CANT TOTAL {sortConfig.key === 'cantTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('cantTotal', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.cantRetenida, minWidth: columnWidths.cantRetenida }} className="px-6 py-5 border-r border-white/10 text-center cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('cantRetenida')}>
                                        <div className="flex items-center justify-center gap-2">CANT RETENIDA {sortConfig.key === 'cantRetenida' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('cantRetenida', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.estado, minWidth: columnWidths.estado }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('estado')}>
                                        <div className="flex items-center gap-2">ESTADO {sortConfig.key === 'estado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('estado', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.defecto, minWidth: columnWidths.defecto }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('defecto')}>
                                        <div className="flex items-center gap-2">DEFECTO {sortConfig.key === 'defecto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('defecto', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.reviso, minWidth: columnWidths.reviso }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('reviso')}>
                                        <div className="flex items-center gap-2">REVISÓ {sortConfig.key === 'reviso' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('reviso', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.responsable, minWidth: columnWidths.responsable }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('responsable')}>
                                        <div className="flex items-center gap-2">RESPONSABLE {sortConfig.key === 'responsable' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('responsable', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.accionCorrectiva, minWidth: columnWidths.accionCorrectiva }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('accionCorrectiva')}>
                                        <div className="flex items-center gap-2">ACCION CORRECTIVA {sortConfig.key === 'accionCorrectiva' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('accionCorrectiva', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.observacion, minWidth: columnWidths.observacion }} className="px-6 py-5 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative" onClick={() => handleSort('observacion')}>
                                        <div className="flex items-center gap-2">OBSERVACION {sortConfig.key === 'observacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('observacion', e)} />
                                    </th>
                                    <th style={{ width: columnWidths.actions, minWidth: columnWidths.actions }} className="px-6 py-5 text-center border-r border-white/10 relative">
                                        ACCIONES
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('actions', e)} />
                                    </th>
                                </tr>

                                <tr className="bg-white/5 border-b dark:border-white/10">
                                    <th className="p-2 border-r dark:border-white/5"></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.fecha} onChange={e => setColumnFilters({ ...columnFilters, fecha: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.areaProceso} onChange={e => setColumnFilters({ ...columnFilters, areaProceso: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.op} onChange={e => setColumnFilters({ ...columnFilters, op: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.planoOpc} onChange={e => setColumnFilters({ ...columnFilters, planoOpc: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.disenoReferencia} onChange={e => setColumnFilters({ ...columnFilters, disenoReferencia: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30 text-center" placeholder="F..." value={columnFilters.cantTotal} onChange={e => setColumnFilters({ ...columnFilters, cantTotal: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30 text-center" placeholder="F..." value={columnFilters.cantRetenida} onChange={e => setColumnFilters({ ...columnFilters, cantRetenida: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.estado} onChange={e => setColumnFilters({ ...columnFilters, estado: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.defecto} onChange={e => setColumnFilters({ ...columnFilters, defecto: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.reviso} onChange={e => setColumnFilters({ ...columnFilters, reviso: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.responsable} onChange={e => setColumnFilters({ ...columnFilters, responsable: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.accionCorrectiva} onChange={e => setColumnFilters({ ...columnFilters, accionCorrectiva: e.target.value })} /></th>
                                    <th className="p-2 border-r dark:border-white/5"><input className="w-full bg-transparent text-[8px] uppercase font-bold outline-none placeholder:text-white/30" placeholder="Filtrar..." value={columnFilters.observacion} onChange={e => setColumnFilters({ ...columnFilters, observacion: e.target.value })} /></th>
                                    <th className="p-2 bg-white/5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={15} className="px-8 py-24 text-center opacity-50"><p className="font-bold text-sm tracking-tight uppercase">Cargando inspecciones...</p></td></tr>
                                ) : paginatedSubmissions.length === 0 ? (
                                    <tr><td colSpan={15} className="px-8 py-24 text-center opacity-20"><p className="font-bold text-sm tracking-tight uppercase">Sin resultados para los filtros actuales</p></td></tr>
                                ) : paginatedSubmissions.map(sub => (
                                    <tr key={sub.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[10px] font-bold ${selectedIds.has(sub.id) ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}>
                                        <td style={{ width: columnWidths.checkbox }} className="px-4 py-4 text-center border-r dark:border-white/5 truncate">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(sub.id)}
                                                onChange={() => toggleSelectRow(sub.id)}
                                                className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                            />
                                        </td>
                                        <td style={{ width: columnWidths.fecha }} className="px-6 py-4 border-r dark:border-white/5 font-bold text-black dark:text-white uppercase truncate" title={sub.fecha}>{sub.fecha}</td>
                                        <td style={{ width: columnWidths.areaProceso }} className="px-6 py-4 uppercase border-r dark:border-white/5 font-black text-black dark:text-white truncate" title={sub.areaProceso}>{sub.areaProceso}</td>
                                        <td style={{ width: columnWidths.op }} className="px-6 py-4 font-mono font-bold text-black dark:text-white uppercase border-r dark:border-white/5 truncate" title={sub.op}>{sub.op}</td>
                                        <td style={{ width: columnWidths.planoOpc }} className="px-6 py-4 text-black dark:text-white font-bold uppercase border-r dark:border-white/5 text-center truncate" title={sub.planoOpc || '-'}>{sub.planoOpc || '-'}</td>
                                        <td style={{ width: columnWidths.disenoReferencia }} className="px-6 py-4 text-black dark:text-white font-black uppercase text-[9px] tracking-wider border-r dark:border-white/5 truncate" title={sub.disenoReferencia}>{sub.disenoReferencia}</td>
                                        <td style={{ width: columnWidths.cantTotal }} className="px-6 py-4 text-center font-bold text-black dark:text-white border-r dark:border-white/5 truncate">{sub.cantTotal}</td>
                                        <td style={{ width: columnWidths.cantRetenida }} className={`px-6 py-4 text-center font-black border-r dark:border-white/5 truncate ${sub.cantRetenida > 0 ? 'text-rose-600' : 'text-black dark:text-white'}`}>{sub.cantRetenida}</td>
                                        <td style={{ width: columnWidths.estado }} className="px-6 py-4 text-center border-r dark:border-white/5 truncate">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${(sub.estado || '').toUpperCase() === 'APROBADO' ? 'bg-emerald-400 text-black border-emerald-500' :
                                                (sub.estado || '').toUpperCase() === 'REPROCESAR' ? 'bg-red-600 text-white border-red-700' :
                                                    (sub.estado || '').toUpperCase() === 'RECHAZADO' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {sub.estado}
                                            </span>
                                        </td>
                                        <td style={{ width: columnWidths.defecto }} className={`px-6 py-4 uppercase border-r dark:border-white/5 font-bold truncate ${['NINGUNO', 'NA'].includes((sub.defecto || '').toUpperCase()) ? 'text-black dark:text-white' : 'text-rose-600'}`} title={sub.defecto}>{sub.defecto}</td>
                                        <td style={{ width: columnWidths.reviso }} className="px-6 py-4 uppercase text-black dark:text-white font-bold border-r dark:border-white/5 truncate" title={sub.reviso}>{sub.reviso}</td>
                                        <td style={{ width: columnWidths.responsable }} className="px-6 py-4 uppercase text-black dark:text-white font-bold border-r dark:border-white/5 truncate" title={sub.responsable}>{sub.responsable}</td>
                                        <td style={{ width: columnWidths.accionCorrectiva }} className={`px-6 py-4 border-r dark:border-white/5 font-bold truncate ${(sub.accionCorrectiva || '').toUpperCase() === 'INTERNA' ? 'text-amber-500' :
                                            (sub.accionCorrectiva || '').toUpperCase() === 'REPOSICION' ? 'text-rose-600' :
                                                ['NA', 'NINGUNO', '', null, undefined].includes(sub.accionCorrectiva) || (sub.accionCorrectiva || '').toUpperCase() === 'NA' ? 'text-black dark:text-white font-normal' :
                                                    'text-amber-500'
                                            }`} title={sub.accionCorrectiva}>{sub.accionCorrectiva}</td>
                                        <td style={{ width: columnWidths.observacion }} className={`px-6 py-4 uppercase text-[9px] border-r dark:border-white/5 truncate ${['NA', 'NINGUNA', 'NINGUNO', ''].includes((sub.observacion || '').toUpperCase()) ? 'text-black dark:text-white' : 'text-rose-600 font-bold'}`} title={sub.observacion}>{sub.observacion}</td>
                                        <td style={{ width: columnWidths.actions }} className="px-4 py-4 text-center truncate">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEdit(sub)} className="p-2 text-slate-800 dark:text-white hover:text-sky-600 transition-colors" title="Editar">
                                                    <EditIcon className="scale-90" />
                                                </button>
                                                <button onClick={() => handleDelete(sub.id)} className="p-2 text-slate-800 dark:text-white hover:text-rose-600 transition-colors" title="Eliminar">
                                                    <TrashIcon className="scale-90" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-6 px-8 bg-slate-50 dark:bg-black/10 border-t dark:border-white/5">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando {Math.min(filteredSubmissions.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredSubmissions.length, currentPage * itemsPerPage)} de {filteredSubmissions.length} registros
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-lg transition-all ${currentPage === 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 active:scale-90'}`}
                                >
                                    <ChevronLeftIcon className="scale-75" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        // Show first, last, and pages around current
                                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`size-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                                            return <span key={page} className="text-slate-300 dark:text-slate-700">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-lg transition-all ${currentPage === totalPages ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 active:scale-90'}`}
                                >
                                    <ChevronRightIcon className="scale-75" />
                                </button>
                            </div>
                        </div>
                    )}
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
