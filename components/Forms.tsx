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
import { EmailService } from '../services/NotificationCoreService';
import BulkUploadButton from './BulkUploadButton';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GENAI_KEY;

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

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <label className={labelStyles}>{label}</label>
            <div className="relative">
                <input type="text" className={inputStyles} placeholder={placeholder || "Buscar o agregar..."} value={searchTerm} onFocus={() => setIsOpen(true)} onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SearchIcon /></div>
            </div>
            {isOpen && (
                <div className="absolute z-[2100] w-full mt-2 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up">
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

const MOCK_INSPECTIONS: InspectionData[] = [
    {
        id: 'MOCK-1',
        fecha: new Date(Date.now() - 3600000 * 2).toISOString().split('T')[0], // hoy hace 2 horas
        areaProceso: 'ENSAMBLE',
        op: 'OP-4509',
        planoOpc: 'PL-502',
        disenoReferencia: 'VC/VCR-PRI2',
        cantTotal: 48,
        cantRetenida: 0,
        estado: 'Aprobado',
        defecto: 'NINGUNO',
        reviso: 'YEFERSON PALACIOS',
        responsable: 'LOPEZ CASTRO JUAN PABLO',
        accionCorrectiva: 'NA',
        observacionSugerida: 'NA',
        observacion: 'Lote de ventanas revisado visualmente y con cota de holgura de ensamble óptima. Perfiles alineados, felpas y empaques en correcta tensión.',
        photo: ''
    },
    {
        id: 'MOCK-2',
        fecha: new Date(Date.now() - 86400000).toISOString().split('T')[0], // ayer
        areaProceso: 'TROQUELADO 1',
        op: 'OP-4890',
        planoOpc: 'PL-312',
        disenoReferencia: 'CF-PRI2',
        cantTotal: 120,
        cantRetenida: 5,
        estado: 'Aprobado (Condicionado)',
        defecto: 'AGRIETAMIENTO',
        reviso: 'JANIER MOSQUERA',
        responsable: 'SANCHEZ OSORIO CRISTIAN',
        accionCorrectiva: 'INTERNA',
        observacionSugerida: '(T/CNC) REBABA POR EQUIPO DE TROQUELADO',
        observacion: 'Se retuvieron 5 unidades temporales debido a rebabas excesivas en troquel número 3. Se realiza pulido local manual e instructivo para ajuste de prensa.',
        photo: ''
    },
    {
        id: 'MOCK-3',
        fecha: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // hace 2 días
        areaProceso: 'PINTURA',
        op: 'OP-5112',
        planoOpc: 'PL-204',
        disenoReferencia: 'VP-PRI3',
        cantTotal: 85,
        cantRetenida: 12,
        estado: 'Rechazado',
        defecto: 'DECOLORACION',
        reviso: 'SARA HURTADO',
        responsable: 'VALENCIA USREGA DILAN',
        accionCorrectiva: 'EXTERNA',
        observacionSugerida: '(P) RETOQUE POR DEFECTO DE PINTURA',
        observacion: 'Tonalidad Gris Titanio fuera de especificación (Delta E > 1.5). Desprendimiento parcial en bordes de perfiles de 6 metros. Se solicita re-procesamiento completo por proveedor.',
        photo: ''
    },
    {
        id: 'MOCK-4',
        fecha: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], // hace 3 días
        areaProceso: 'CORTE DE',
        op: 'OP-5201',
        planoOpc: 'PL-101',
        disenoReferencia: 'FACH-S45',
        cantTotal: 250,
        cantRetenida: 0,
        estado: 'Aprobado',
        defecto: 'NINGUNO',
        reviso: 'JHONATAN GUERRA',
        responsable: 'DURANGO PUERTA DIEGO',
        accionCorrectiva: 'NA',
        observacionSugerida: 'NA',
        observacion: 'Cortes limpios sin rebabas. Ángulos a 45 grados validados con goniómetro digital calibrado. Medidas correctas de longitud.',
        photo: ''
    },
    {
        id: 'MOCK-5',
        fecha: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], // hace 4 días
        areaProceso: 'VIDRIO TEMPLADO',
        op: 'OP-4100',
        planoOpc: 'PL-90',
        disenoReferencia: 'AL-90',
        cantTotal: 75,
        cantRetenida: 2,
        estado: 'Rechazado',
        defecto: 'DESPORTILLADO',
        reviso: 'EDWIN BEDOYA',
        responsable: 'SALAZAR DUARTE CARLOS ALBERTO',
        accionCorrectiva: 'REPOSICION',
        observacionSugerida: '(VT) DESPICADO / CUCACHARA',
        observacion: 'Dos hojas de vidrio templado de 10mm presentan desportilladuras en esquinas superiores debido a mal arrume en caballete de transporte interno. Se ordenó reposición inmediata.',
        photo: ''
    }
];

interface OfflineQueueItem {
    id: string;
    type: 'create' | 'update' | 'delete';
    payload: any;
    metadata: {
        op: string;
        areaProceso: string;
        planoOpc?: string;
        timestamp: number;
        editingId?: string | null;
    };
}

const Forms: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeFormType, setActiveFormType] = useState<'none' | 'general'>('none');
    const [isLinksViewOpen, setIsLinksViewOpen] = useState(false);
    const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
    const [embeddedForm, setEmbeddedForm] = useState<ExternalForm | null>(null);
    const [externalLinks, setExternalLinks] = useState<ExternalForm[]>([]);
    
    // --- Estados locales para la Sincronización Offline ---
    const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // --- Estados para el Módulo de Visión Artificial e Inspección Inteligente ---
    const [visionMode, setVisionMode] = useState<'defect' | 'measure' | 'count'>('defect');
    const [calibrationLength, setCalibrationLength] = useState<number>(120); // 120 cm por defecto
    const [calibrationLine, setCalibrationLine] = useState<{ p1: { x: number; y: number }; p2: { x: number; y: number } }>({
        p1: { x: 25, y: 30 },
        p2: { x: 75, y: 30 }
    });
    const [measurementLines, setMeasurementLines] = useState<{ id: string; p1: { x: number; y: number }; p2: { x: number; y: number }; label: string }[]>([]);
    const [detectedWindows, setDetectedWindows] = useState<{ id: number; box_2d: [number, number, number, number] }[]>([]);
    const [draggingAnchor, setDraggingAnchor] = useState<{ lineId: string; point: 'p1' | 'p2' } | null>(null);
    
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNativePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(prev => ({ ...prev, photo: event.target!.result as string }));
                    setDetectedWindows([]);
                    setMeasurementLines([]);
                    addNotification({ type: 'success', title: 'IMAGEN CARGADA', message: 'Se ha capturado la evidencia de calidad con éxito.' });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Métodos para control de cotas de medición
    const addMeasurementLine = () => {
        const id = 'measure_' + Date.now();
        const index = measurementLines.length + 1;
        setMeasurementLines(prev => [
            ...prev,
            {
                id,
                p1: { x: 30, y: 40 + index * 5 },
                p2: { x: 70, y: 40 + index * 5 },
                label: `Cota ${index}`
            }
        ]);
        addNotification({ type: 'info', title: 'NUEVA COTA', message: 'Se ha agregado una línea de cota azul. Arrastra sus extremos.' });
    };

    const clearMeasurementLines = () => {
        setMeasurementLines([]);
        addNotification({ type: 'info', title: 'LIMPIAR COTAS', message: 'Se han eliminado todas las líneas de cota.' });
    };

    const getLineDistance = (line: { p1: { x: number; y: number }; p2: { x: number; y: number } }) => {
        const dx = line.p2.x - line.p1.x;
        const dy = line.p2.y - line.p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const calculateRealLength = (line: { p1: { x: number; y: number }; p2: { x: number; y: number } }) => {
        const refDist = getLineDistance(calibrationLine);
        if (refDist === 0) return 0;
        const lineDist = getLineDistance(line);
        return (lineDist / refDist) * calibrationLength;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!draggingAnchor || !imageContainerRef.current) return;
        
        let clientX = 0;
        let clientY = 0;
        
        if ('touches' in e) {
            if (e.touches.length === 0) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const rect = imageContainerRef.current.getBoundingClientRect();
        
        // Calcular porcentaje (0-100) acotado a los límites del contenedor
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        
        if (draggingAnchor.lineId === 'calibration') {
            setCalibrationLine(prev => ({
                ...prev,
                [draggingAnchor.point]: { x, y }
            }));
        } else {
            setMeasurementLines(prev => prev.map(line => {
                if (line.id === draggingAnchor.lineId) {
                    return {
                        ...line,
                        [draggingAnchor.point]: { x, y }
                    };
                }
                return line;
            }));
        }
    };

    useEffect(() => {
        fetchExternalLinks();
        
        // Cargar cola offline inicial
        const saved = localStorage.getItem('alco_offline_queue');
        if (saved) {
            try {
                setOfflineQueue(JSON.parse(saved));
            } catch (e) {
                console.error('Error cargando cola offline:', e);
            }
        }
    }, []);

    const saveOfflineQueue = (queue: OfflineQueueItem[]) => {
        setOfflineQueue(queue);
        localStorage.setItem('alco_offline_queue', JSON.stringify(queue));
    };

    const fetchExternalLinks = async () => {
        try {
            const { data, error } = await supabase.from('external_links').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setExternalLinks(data || []);
        } catch (error) {
            console.error('Error fetching links:', error);
        }
    };

    // --- Motor de Sincronización de Cola Offline ---
    const triggerSyncQueue = async () => {
        const savedQueue = localStorage.getItem('alco_offline_queue');
        if (!savedQueue) return;
        
        let currentQueue: OfflineQueueItem[] = [];
        try {
            currentQueue = JSON.parse(savedQueue);
        } catch (e) {
            return;
        }

        if (currentQueue.length === 0 || isSyncing) return;

        setIsSyncing(true);
        addNotification({
            type: 'info',
            title: 'SINCRONIZANDO...',
            message: `Subiendo ${currentQueue.length} transacciones pendientes a la nube...`
        });

        const remainingQueue: OfflineQueueItem[] = [];

        for (const item of currentQueue) {
            try {
                if (item.type === 'create') {
                    // Create Mode
                    const { error } = await supabase.from('field_inspections').insert(item.payload);
                    if (error) throw error;

                    // Enviar notificaciones de email si aplica
                    try {
                        const first = item.payload[0];
                        await EmailService.send({
                            to: 'calidad@alco.com',
                            subject: `[OFFLINE] Nuevos Registros de Inspección: OP ${first.op}`,
                            body: `Se han sincronizado ${item.payload.length} reportes desde campo en modo offline de la OP ${first.op} en ${first.area_proceso}.\nInspector: ${first.reviso || 'system'}`,
                            moduleName: 'forms',
                            referenceId: `OP-${first.op}`,
                            triggeredBy: first.reviso || 'system'
                        });
                    } catch (e) {
                        console.warn("Fallo al enviar correo en sync:", e);
                    }

                    // NC automático
                    const rejectedItem = item.payload.find((p: any) => p.estado === 'Rechazado');
                    if (rejectedItem) {
                        try {
                            await triggerNC(rejectedItem);
                        } catch (ncErr) {
                            console.error("Fallo al crear NC en sync:", ncErr);
                        }
                    }
                } else if (item.type === 'update') {
                    // Update Mode
                    const { error } = await supabase
                        .from('field_inspections')
                        .update(item.payload)
                        .eq('id', item.metadata.editingId);
                    if (error) throw error;
                } else if (item.type === 'delete') {
                    // Delete Mode
                    const chunkSize = 100;
                    const ids = item.payload as string[];
                    for (let i = 0; i < ids.length; i += chunkSize) {
                        const chunk = ids.slice(i, i + chunkSize);
                        const { error } = await supabase.from('field_inspections').delete().in('id', chunk);
                        if (error) throw error;
                    }
                }
            } catch (err: any) {
                console.error("Error syncing queue item:", err);
                remainingQueue.push(item); // Si falla, lo dejamos en la cola para reintento
            }
        }

        saveOfflineQueue(remainingQueue);
        setIsSyncing(false);

        if (remainingQueue.length === 0) {
            addNotification({
                type: 'success',
                title: 'SINCRONIZACIÓN EXITOSA',
                message: 'Todos los registros fuera de línea se han subido a la base de datos.'
            });
        } else {
            addNotification({
                type: 'warning',
                title: 'SINCRONIZACIÓN PARCIAL',
                message: `Quedan ${remainingQueue.length} registros pendientes debido a fallos de red.`
            });
        }

        fetchInspections();
    };

    // Escuchador de red para auto-sincronización
    useEffect(() => {
        const handleOnline = () => {
            triggerSyncQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [offlineQueue, isSyncing]);

    // --- Fusión de Cola Offline con Registros de Base de Datos ---
    const mergeOfflineQueue = (dbData: InspectionData[]): InspectionData[] => {
        const savedQueue = localStorage.getItem('alco_offline_queue');
        let currentQueue: OfflineQueueItem[] = [];
        if (savedQueue) {
            try { currentQueue = JSON.parse(savedQueue); } catch (e) {}
        }

        let result = [...dbData];

        // 1. Procesar eliminaciones offline primero (filtrar registros de la DB)
        const deletedIds = new Set(
            currentQueue
                .filter(q => q.type === 'delete')
                .flatMap(q => q.payload as string[])
        );
        result = result.filter(r => !deletedIds.has(r.id));

        // 2. Procesar actualizaciones offline (modificar registros DB existentes)
        const updates = currentQueue.filter(q => q.type === 'update');
        updates.forEach(u => {
            const index = result.findIndex(r => r.id === u.metadata.editingId);
            if (index !== -1) {
                result[index] = {
                    ...result[index],
                    fecha: u.payload.fecha,
                    areaProceso: u.payload.area_proceso,
                    op: u.payload.op,
                    planoOpc: u.payload.plano_opc,
                    disenoReferencia: u.payload.diseno_referencia,
                    cantTotal: u.payload.cant_total,
                    cantRetenida: u.payload.cant_retenida,
                    estado: u.payload.estado,
                    defecto: u.payload.defecto,
                    reviso: u.payload.reviso,
                    responsable: u.payload.responsable,
                    accionCorrectiva: u.payload.accion_correctiva,
                    observacionSugerida: u.payload.observacion_sugerida,
                    observacion: u.payload.observacion,
                    photo: u.payload.photo_url,
                    // @ts-ignore
                    isOfflinePending: true
                };
            }
        });

        // 3. Procesar creaciones offline (agregar registros al listado)
        const creations = currentQueue.filter(q => q.type === 'create');
        creations.forEach(c => {
            const items = Array.isArray(c.payload) ? c.payload : [c.payload];
            items.forEach((item: any, idx: number) => {
                result.unshift({
                    id: `${c.id}-${idx}`, // ID temporal
                    fecha: item.fecha,
                    areaProceso: item.area_proceso,
                    op: item.op,
                    planoOpc: item.plano_opc,
                    disenoReferencia: item.diseno_referencia,
                    cantTotal: item.cant_total,
                    cantRetenida: item.cant_retenida,
                    estado: item.estado,
                    defecto: item.defecto,
                    reviso: item.reviso,
                    responsable: item.responsable,
                    accionCorrectiva: item.accion_correctiva,
                    observacionSugerida: item.observacion_sugerida,
                    observacion: item.observacion,
                    photo: item.photo_url,
                    // @ts-ignore
                    isOfflinePending: true
                });
            });
        });

        return result;
    };

    const [formData, setFormData] = useState<Omit<InspectionData, 'id'>>(INITIAL_FORM_DATA);
    const [submissions, setSubmissions] = useState<InspectionData[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [globalSearch, setGlobalSearch] = useState('');
    const [selectedAreaFilter, setSelectedAreaFilter] = useState('');
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

    const uniqueAreas = useMemo(() => {
        const areas = new Set<string>();
        // 1. Cargar áreas de los registros existentes en el estado local (incluyendo áreas recién creadas)
        submissions.forEach(s => {
            if (s.areaProceso) {
                areas.add(s.areaProceso.toUpperCase().trim());
            }
        });
        // 2. Combinar con las áreas estáticas por defecto de constants.tsx
        AREAS_PROCESO.forEach(a => {
            if (a) {
                areas.add(a.toUpperCase().trim());
            }
        });
        return Array.from(areas).sort((a, b) => a.localeCompare(b));
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        // 0. Strict Filter by ID (Deep Link)
        if (filterId) {
            return submissions.filter(s => s.id === filterId);
        }

        let result = submissions.filter(sub => {
            // 0.5 Filtro por Área de Proceso seleccionada en el desplegable
            if (selectedAreaFilter) {
                const areaVal = String(sub.areaProceso || '').toUpperCase().trim();
                if (areaVal !== selectedAreaFilter.toUpperCase().trim()) {
                    return false;
                }
            }

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
    }, [submissions, columnFilters, globalSearch, sortConfig, filterId, selectedAreaFilter]);

    const paginatedSubmissions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredSubmissions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);

    const totalInspected = useMemo(() => filteredSubmissions.reduce((acc, s) => acc + (s.cantTotal || 0), 0), [filteredSubmissions]);
    const totalRetained = useMemo(() => filteredSubmissions.reduce((acc, s) => acc + (s.cantRetenida || 0), 0), [filteredSubmissions]);
    const compliancePct = useMemo(() => {
        const total = filteredSubmissions.reduce((acc, s) => acc + (s.cantTotal || 0), 0);
        if (total === 0) return 100;
        const retained = filteredSubmissions.reduce((acc, s) => acc + (s.cantRetenida || 0), 0);
        return Math.round((1 - (retained / total)) * 100);
    }, [filteredSubmissions]);

    useEffect(() => {
        setCurrentPage(1);
    }, [globalSearch, columnFilters, filterId, selectedAreaFilter]);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchInspections();
    }, []);

    useEffect(() => {
        if (location.state && submissions.length > 0) {
            const targetId = location.state.filterId || location.state.editingId;
            if (targetId) {
                const sub = submissions.find(s => s.id === targetId);
                if (sub) {
                    const { id, ...data } = sub;
                    setFormData(data);
                    setEditingId(id);
                    setFilterId(id);
                    setActiveFormType('general');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
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

            // Guardar en caché local para persistencia offline y sesiones sin conexión
            localStorage.setItem('alco_cached_inspections', JSON.stringify(mappedData));

            const merged = mergeOfflineQueue(mappedData);
            setSubmissions(merged);
        } catch (error) {
            console.error("fetchInspections failed, using local fallback:", error);
            
            // Fallback 1: Intentar cargar del caché local
            const cached = localStorage.getItem('alco_cached_inspections');
            let baseSubmissions: InspectionData[] = [];
            if (cached) {
                try {
                    baseSubmissions = JSON.parse(cached);
                } catch (e) {
                    console.error("Error parsing cached inspections:", e);
                }
            }

            // Fallback 2: Si el caché está vacío, usar los mock de alta fidelidad
            if (baseSubmissions.length === 0) {
                baseSubmissions = submissions.length > 0 
                    ? submissions.filter(s => !(s as any).isOfflinePending)
                    : MOCK_INSPECTIONS;
            }

            const merged = mergeOfflineQueue(baseSubmissions);
            setSubmissions(merged);
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
        // Modo Demo fallback si falta la API Key o es el placeholder
        const isDemoMode = !API_KEY || API_KEY.includes('YOUR_GEMINI_API_KEY');

        let base64Image = formData.photo;
        let mimeType = "image/png"; // Default

        if (!base64Image) {
            // Cargar imagen demo si está vacía
            const demoImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAiSURBVHgB7c6xCQAgDAVRR9A6g4u4/2QW4QPct8p1CR8zM3O3750A8iJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiSwlspTIUiJLiyx9I8sF/w49i0kAAAAASUVORK5CYII=';
            setFormData(prev => ({ ...prev, photo: demoImage }));
            addNotification({ type: 'info', title: 'MODO DEMO', message: 'Se ha cargado una imagen de prueba. Procesando...' });
            base64Image = demoImage;
        }

        setIsAnalyzing(true);
        const isCountingMode = visionMode === 'count';

        if (isDemoMode) {
            addNotification({ 
                type: 'info', 
                title: 'MODO DEMO ACTIVO', 
                message: isCountingMode ? 'Simulando conteo de ventanas en arrume por IA...' : 'Simulando análisis de defectos por IA...' 
            });
            
            // Simular retraso de red de 2 segundos para credibilidad visual
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (isCountingMode) {
                // 4 ventanas simuladas en coordenadas normalizadas (0-1000)
                const mockWindows = [
                    { id: 1, box_2d: [150, 150, 450, 450] as [number, number, number, number] },
                    { id: 2, box_2d: [150, 550, 450, 850] as [number, number, number, number] },
                    { id: 3, box_2d: [550, 150, 850, 450] as [number, number, number, number] },
                    { id: 4, box_2d: [550, 550, 850, 850] as [number, number, number, number] }
                ];
                setDetectedWindows(mockWindows);
                setFormData(prev => ({
                    ...prev,
                    cantTotal: 4,
                    observacion: prev.observacion === 'NA'
                        ? 'IA CONTEO (DEMO): Se detectaron 4 unidades en el arrume de ventanas.'
                        : `${prev.observacion} \n[IA CONTEO DEMO]: Se detectaron 4 unidades en el arrume de ventanas.`
                }));
                addNotification({ type: 'success', title: 'CONTEO COMPLETADO (DEMO)', message: 'La IA detectó 4 unidades de ventana apiladas en el arrume.' });
            } else {
                setFormData(prev => ({
                    ...prev,
                    cantTotal: 1,
                    defecto: 'NINGUNO',
                    estado: 'Aprobado',
                    alertLevel: 'None',
                    isLocked: false,
                    observacion: prev.observacion === 'NA'
                        ? 'IA DEFECTOS (DEMO): Perfil de aluminio verificado con éxito. Sin defectos visibles.'
                        : `${prev.observacion} \n[IA DEFECTOS DEMO]: Perfil de aluminio verificado con éxito. Sin defectos visibles.`
                }));
                addNotification({ type: 'success', title: 'ANÁLISIS COMPLETADO (DEMO)', message: 'Conteo: 1 | Defecto: NINGUNO | Estado: Aprobado' });
            }
            setIsAnalyzing(false);
            return;
        }

        // Extraer datos base64 y tipo mime
        const parts = base64Image.split(',');
        if (parts.length > 1) {
            mimeType = parts[0].match(/:(.*?);/)?.[1] || mimeType;
            base64Image = parts[1];
        } else {
            mimeType = "image/png";
        }

        addNotification({ type: 'info', title: 'ANALIZANDO...', message: 'Gemini 1.5 Flash está inspeccionando la imagen...' });

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = isCountingMode ? `
                Analiza esta foto de perfiles o ventanas de aluminio apiladas/arrumadas en una obra o fábrica.
                Actúa como un inspector de control de calidad experto en metrología y empaque industrial de Alco.
                1. Identifica y cuenta con precisión absoluta cuántas unidades individuales de ventanas o perfiles apilados están presentes en el arrume.
                2. Para cada ventana o perfil individual visible que identifiques en el arrume, proporciona su caja delimitadora aproximada [ymin, xmin, ymax, xmax] normalizada en una escala de 0 a 1000 (donde 0 es arriba/izquierda y 1000 es abajo/derecha).
                3. Responde EXCLUSIVAMENTE con un JSON plano y limpio (sin formato markdown \`\`\`json ... \`\`\` adicional):
                {
                    "cantTotal": number (conteo total de unidades detectadas en los arrumes),
                    "ventanas": [
                        { "id": number (correlativo), "box_2d": [number, number, number, number] }
                    ],
                    "observacion": "descripción técnica en ESPAÑOL indicando cuántas unidades se contaron en el arrume de perfiles"
                }
                Asegúrate de responder estrictamente en formato JSON válido y en ESPAÑOL.
            ` : `
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

            // Parsear JSON (limpiar marcas Markdown ```json si existen)
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJson);

            if (isCountingMode) {
                setDetectedWindows(analysis.ventanas || []);
                setFormData(prev => ({
                    ...prev,
                    cantTotal: analysis.cantTotal || 0,
                    observacion: prev.observacion === 'NA'
                        ? `Conteo IA: Se detectaron ${analysis.cantTotal} unidades en arrume. ${analysis.observacion}`
                        : `${prev.observacion} \n[IA Conteo]: Se detectaron ${analysis.cantTotal} unidades en arrume. ${analysis.observacion}`
                }));
                addNotification({
                    type: 'success',
                    title: 'CONTEO COMPLETADO',
                    message: `La IA detectó ${analysis.cantTotal} unidades en el arrume de ventanas.`
                });
            } else {
                // Determinar estado de acuerdo al defecto
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

    const handleCloseForm = () => {
        setActiveFormType('none');
        setEditingId(null);
        setFilterId(null);
        setFormData(INITIAL_FORM_DATA);
        navigate('/quality/forms', { replace: true, state: {} });
    };

    const handleOfflineDelete = (idsToDelete: string[], isBulk: boolean) => {
        const savedQueue = localStorage.getItem('alco_offline_queue');
        let currentQueue: OfflineQueueItem[] = [];
        if (savedQueue) {
            try { currentQueue = JSON.parse(savedQueue); } catch (e) {}
        }

        // Separar IDs de DB reales y IDs temporales creados localmente
        const realDbIds = idsToDelete.filter(id => !id.toString().includes('offline-'));
        const tempIds = idsToDelete.filter(id => id.toString().includes('offline-'));

        // 1. Eliminar de la cola local las creaciones offline temporales
        if (tempIds.length > 0) {
            // El ID temporal es de la forma "offline-<timestamp>-<idx>", extraemos el prefijo temporal "offline-<timestamp>"
            const tempPrefixes = new Set(tempIds.map(id => id.split('-').slice(0, 2).join('-')));
            currentQueue = currentQueue.filter(q => !tempPrefixes.has(q.id));
        }

        // 2. Para los registros que ya están en la DB, encolamos su eliminación offline
        if (realDbIds.length > 0) {
            const tempId = `offline-${Date.now()}`;
            const deleteItem: OfflineQueueItem = {
                id: tempId,
                type: 'delete',
                payload: realDbIds,
                metadata: {
                    op: 'ELIMINACIÓN MASIVA',
                    areaProceso: 'MÚLTIPLE',
                    timestamp: Date.now()
                }
            };
            currentQueue.push(deleteItem);
        }

        saveOfflineQueue(currentQueue);
        fetchInspections(); // Recargar para volver a inyectar la cola local fusionada

        if (isBulk) setSelectedIds(new Set());
        addNotification({
            type: 'error',
            title: 'ELIMINADO LOCALMENTE',
            message: isBulk 
                ? `${idsToDelete.length} registros eliminados localmente. Se sincronizará al conectar.` 
                : 'Inspección eliminada localmente en tu dispositivo.'
        });
    };

    const handleDelete = async (id: string | string[]) => {
        const isBulk = Array.isArray(id);
        const idsToDelete = isBulk ? id : [id];
        const message = isBulk
            ? `¿Confirmas la eliminación permanente de ${idsToDelete.length} registros seleccionados?`
            : '¿Eliminar este registro de inspección permanentemente?';

        if (confirm(message)) {
            // Si estamos offline, desviamos a la cola offline
            if (!navigator.onLine) {
                handleOfflineDelete(idsToDelete, isBulk);
                return;
            }

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
                console.error("Delete online failed, falling back to offline delete:", error);
                handleOfflineDelete(idsToDelete, isBulk);
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

    const handleOfflineSubmit = (getDBPayload: any) => {
        const queue: OfflineQueueItem[] = JSON.parse(localStorage.getItem('alco_offline_queue') || '[]');
        const tempId = `offline-${Date.now()}`;
        let item: OfflineQueueItem;

        if (editingId) {
            // Modo de edición offline
            const payload = getDBPayload(formData);
            item = {
                id: tempId,
                type: 'update',
                payload,
                metadata: {
                    op: formData.op,
                    areaProceso: formData.areaProceso,
                    planoOpc: formData.planoOpc,
                    timestamp: Date.now(),
                    editingId
                }
            };
            addNotification({ 
                type: 'warning', 
                title: 'GUARDADO LOCALMENTE', 
                message: `Inspección OP #${formData.op} actualizada localmente en tu dispositivo.` 
            });
        } else {
            // Modo de creación offline
            const planNumbers = formData.planoOpc ? parsePlanNumbers(formData.planoOpc) : [formData.planoOpc];
            const plansToSubmit = planNumbers.length > 0 ? planNumbers : [formData.planoOpc];
            const inserts = plansToSubmit.map(plan => getDBPayload({ ...formData, planoOpc: plan }));

            item = {
                id: tempId,
                type: 'create',
                payload: inserts,
                metadata: {
                    op: formData.op,
                    areaProceso: formData.areaProceso,
                    planoOpc: formData.planoOpc,
                    timestamp: Date.now()
                }
            };
            addNotification({ 
                type: 'warning', 
                title: 'GUARDADO LOCALMENTE', 
                message: `${inserts.length} registros guardados localmente. Se sincronizarán al recuperar conexión.` 
            });
        }

        queue.push(item);
        saveOfflineQueue(queue);
        fetchInspections(); // Recargar para fusionar e inyectar el cambio en la tabla
        
        setFormData(INITIAL_FORM_DATA);
        setActiveFormType('none');
        setEditingId(null);
        setFilterId(null);
        navigate('/quality/forms', { replace: true, state: {} });
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

        // 1. Detectar si estamos offline antes de proceder
        if (!navigator.onLine) {
            handleOfflineSubmit(getDBPayload);
            return;
        }

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

                try {
                    await EmailService.send({
                        to: 'calidad@alco.com',
                        subject: `Nuevos Registros de Inspección: OP ${formData.op}`,
                        body: `Se han generado ${inserts.length} reportes de inspección para la OP ${formData.op} en el área de ${formData.areaProceso}.\nInspector: ${formData.reviso || 'system'}`,
                        moduleName: 'forms',
                        referenceId: `OP-${formData.op}`,
                        triggeredBy: formData.reviso || 'system'
                    });
                } catch (emailErr) {
                    console.warn("Fallo al enviar correo en creación online:", emailErr);
                }

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
            setEditingId(null);
            setFilterId(null);
            navigate('/quality/forms', { replace: true, state: {} });

        } catch (error) {
            console.error("Online submit failed, falling back to offline mode:", error);
            handleOfflineSubmit(getDBPayload);
        }
    };

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all uppercase placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

    // Si hay un formulario embebido activo, mostramos el visor de pantalla completa
    if (embeddedForm) {
        return (
            <div className="fixed inset-0 z-[3000] bg-slate-900 flex flex-col animate-fade-in">
                {/* Barra de Herramientas del Navegador Interno */}
                <div className="bg-white/90 dark:bg-[#0a0e18]/90 backdrop-blur-lg p-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.04] shadow-lg">
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
                <div className="bg-white/90 dark:bg-[#0a0e18]/90 backdrop-blur-lg p-2 text-center border-t border-slate-200/80 dark:border-white/[0.04]">
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
                        hideIcon={true}
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
                    <button onClick={() => setIsLinksViewOpen(!isLinksViewOpen)} className={`flex items-center gap-2 px-4 py-2.5 ${isLinksViewOpen ? 'bg-slate-300 dark:bg-slate-600' : 'bg-[#4b5563] hover:bg-[#374151]'} text-white rounded-lg font-bold text-xs shadow-md transition-all`}>Enlaces Externos</button>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFilterId(null);
                            setFormData(INITIAL_FORM_DATA);
                            setActiveFormType('general');
                            navigate('/quality/forms', { replace: true, state: {} });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        Nueva Inspección
                    </button>
                </div>
            </div>

            {/* BANNER DE SINCRONIZACIÓN OFFLINE */}
            {offlineQueue.length > 0 && (
                <div className="glass-card p-4 md:p-6 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-amber-500/10">
                            <i className="fas fa-cloud-slash text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Sincronización Fuera de Línea</h3>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mt-1">
                                Tienes {offlineQueue.length} {offlineQueue.length === 1 ? 'inspección pendiente' : 'inspecciones pendientes'} de subir a la nube
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={triggerSyncQueue}
                            disabled={isSyncing}
                            className={`w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSyncing ? (
                                <>
                                    <i className="fas fa-spinner animate-spin"></i> Sincronizando...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sync-alt animate-spin" style={{ animationDuration: '3s' }}></i> Sincronizar Ahora
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {isLinksViewOpen && (
                <div className="premium-card p-8 animate-fade-in-up mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div><h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Formularios Externos Embebidos</h2></div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsAddLinkModalOpen(true)} className="px-4 py-2 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-900/20 active:scale-95 transition-all">+ Agregar Enlace</button>
                            <button onClick={() => setIsLinksViewOpen(false)} className="text-slate-400 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-colors">Cerrar</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {externalLinks.map(link => (
                            <div key={link.id} className="glass-card p-6 group hover:border-indigo-500/20 relative">
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
                <div className="premium-card p-4 md:p-10 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-8 border-b dark:border-white/5 pb-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                <RobotIcon className="text-sky-600" /> Inspección Multimodal Alco
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-9 opacity-60">IA + Captura Semántica por Voz</p>
                        </div>
                        <button onClick={handleCloseForm} className="text-slate-300 hover:text-rose-500 transition-colors text-3xl font-light">&times;</button>
                    </div>
                    <form onSubmit={handleSubmitGeneral} className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Panel Izquierdo: Captura Visual y Visión Artificial */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="flex justify-between items-center px-1">
                                    <label className={labelStyles}>Evidencia Visual e Inspección Inteligente</label>
                                </div>
                                
                                {/* Menú de Pestañas HUD para Modos de Visión */}
                                <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-2xl border border-slate-200/60 dark:border-white/[0.04] text-[9px] font-black uppercase tracking-wider shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => { setVisionMode('defect'); setDetectedWindows([]); }}
                                        className={`flex-1 py-2.5 rounded-xl transition-all duration-300 ${visionMode === 'defect' ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                    >
                                        <i className="fas fa-search-minus mr-1.5"></i> Defectos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setVisionMode('measure'); setDetectedWindows([]); }}
                                        className={`flex-1 py-2.5 rounded-xl transition-all duration-300 ${visionMode === 'measure' ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                    >
                                        <i className="fas fa-ruler-combined mr-1.5"></i> Cotas 2D
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setVisionMode('count'); }}
                                        className={`flex-1 py-2.5 rounded-xl transition-all duration-300 ${visionMode === 'count' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                    >
                                        <i className="fas fa-boxes mr-1.5"></i> Arrumes
                                    </button>
                                </div>

                                {/* Contenedor de Imagen y SVG Overlay */}
                                <div 
                                    ref={imageContainerRef}
                                    onMouseMove={handleMouseMove}
                                    onTouchMove={handleMouseMove}
                                    onMouseUp={() => setDraggingAnchor(null)}
                                    onTouchEnd={() => setDraggingAnchor(null)}
                                    onMouseLeave={() => setDraggingAnchor(null)}
                                    className="aspect-square bg-slate-50 dark:bg-black/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center relative overflow-hidden group select-none shadow-inner"
                                >
                                    {formData.photo ? (
                                        <>
                                            <img 
                                                src={formData.photo} 
                                                alt="Evidencia" 
                                                className="w-full h-full object-cover pointer-events-none select-none" 
                                                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                            />
                                            
                                            {/* Capa de Dibujo SVG para Visión Computacional */}
                                            <svg 
                                                className="absolute inset-0 w-full h-full pointer-events-auto" 
                                                viewBox="0 0 100 100" 
                                                preserveAspectRatio="none"
                                            >
                                                {/* MODO MEDICIÓN: Línea de calibración y cotas */}
                                                {visionMode === 'measure' && (
                                                    <>
                                                        {/* Línea de Calibración (Verde) */}
                                                        <line 
                                                            x1={calibrationLine.p1.x} 
                                                            y1={calibrationLine.p1.y} 
                                                            x2={calibrationLine.p2.x} 
                                                            y2={calibrationLine.p2.y} 
                                                            stroke="#10b981" 
                                                            strokeWidth="1" 
                                                            strokeDasharray="2" 
                                                        />
                                                        {/* Etiqueta de Calibración */}
                                                        <rect 
                                                            x={((calibrationLine.p1.x + calibrationLine.p2.x) / 2) - 13} 
                                                            y={((calibrationLine.p1.y + calibrationLine.p2.y) / 2) - 3} 
                                                            width="26" 
                                                            height="6" 
                                                            rx="1.5" 
                                                            fill="#064e3b" 
                                                        />
                                                        <text 
                                                            x={(calibrationLine.p1.x + calibrationLine.p2.x) / 2} 
                                                            y={((calibrationLine.p1.y + calibrationLine.p2.y) / 2) + 1.2} 
                                                            fill="#10b981" 
                                                            fontSize="2.8" 
                                                            fontWeight="black" 
                                                            textAnchor="middle"
                                                        >
                                                            REF: {calibrationLength} cm
                                                        </text>
                                                        {/* Anclas de Calibración */}
                                                        <circle 
                                                            cx={calibrationLine.p1.x} 
                                                            cy={calibrationLine.p1.y} 
                                                            r="2.2" 
                                                            fill="#10b981" 
                                                            stroke="white" 
                                                            strokeWidth="0.5" 
                                                            className="cursor-move pointer-events-auto hover:scale-125 transition-transform" 
                                                            onMouseDown={() => setDraggingAnchor({ lineId: 'calibration', point: 'p1' })} 
                                                            onTouchStart={() => setDraggingAnchor({ lineId: 'calibration', point: 'p1' })} 
                                                        />
                                                        <circle 
                                                            cx={calibrationLine.p2.x} 
                                                            cy={calibrationLine.p2.y} 
                                                            r="2.2" 
                                                            fill="#10b981" 
                                                            stroke="white" 
                                                            strokeWidth="0.5" 
                                                            className="cursor-move pointer-events-auto hover:scale-125 transition-transform" 
                                                            onMouseDown={() => setDraggingAnchor({ lineId: 'calibration', point: 'p2' })} 
                                                            onTouchStart={() => setDraggingAnchor({ lineId: 'calibration', point: 'p2' })} 
                                                        />

                                                        {/* Líneas de Cota Adicionales (Cian) */}
                                                        {measurementLines.map(line => {
                                                            const len = calculateRealLength(line).toFixed(1);
                                                            return (
                                                                <g key={line.id}>
                                                                    <line 
                                                                        x1={line.p1.x} 
                                                                        y1={line.p1.y} 
                                                                        x2={line.p2.x} 
                                                                        y2={line.p2.y} 
                                                                        stroke="#38bdf8" 
                                                                        strokeWidth="0.8" 
                                                                    />
                                                                    {/* Etiqueta de la Cota */}
                                                                    <rect 
                                                                        x={((line.p1.x + line.p2.x) / 2) - 10} 
                                                                        y={((line.p1.y + line.p2.y) / 2) - 3} 
                                                                        width="20" 
                                                                        height="6" 
                                                                        rx="1.5" 
                                                                        fill="#0c4a6e" 
                                                                    />
                                                                    <text 
                                                                        x={(line.p1.x + line.p2.x) / 2} 
                                                                        y={((line.p1.y + line.p2.y) / 2) + 1.2} 
                                                                        fill="#38bdf8" 
                                                                        fontSize="2.8" 
                                                                        fontWeight="black" 
                                                                        textAnchor="middle"
                                                                    >
                                                                        {len} cm
                                                                    </text>
                                                                    {/* Anclas de la Cota */}
                                                                    <circle 
                                                                        cx={line.p1.x} 
                                                                        cy={line.p1.y} 
                                                                        r="1.8" 
                                                                        fill="#38bdf8" 
                                                                        stroke="white" 
                                                                        strokeWidth="0.4" 
                                                                        className="cursor-move pointer-events-auto hover:scale-125 transition-transform" 
                                                                        onMouseDown={() => setDraggingAnchor({ lineId: line.id, point: 'p1' })} 
                                                                        onTouchStart={() => setDraggingAnchor({ lineId: line.id, point: 'p1' })} 
                                                                    />
                                                                    <circle 
                                                                        cx={line.p2.x} 
                                                                        cy={line.p2.y} 
                                                                        r="1.8" 
                                                                        fill="#38bdf8" 
                                                                        stroke="white" 
                                                                        strokeWidth="0.4" 
                                                                        className="cursor-move pointer-events-auto hover:scale-125 transition-transform" 
                                                                        onMouseDown={() => setDraggingAnchor({ lineId: line.id, point: 'p2' })} 
                                                                        onTouchStart={() => setDraggingAnchor({ lineId: line.id, point: 'p2' })} 
                                                                    />
                                                                </g>
                                                            );
                                                        })}
                                                    </>
                                                )}

                                                {/* MODO CONTEO: Bounding Boxes de ventanas */}
                                                {visionMode === 'count' && (
                                                    <>
                                                        {detectedWindows.map(win => {
                                                            const ymin = win.box_2d[0] / 10;
                                                            const xmin = win.box_2d[1] / 10;
                                                            const ymax = win.box_2d[2] / 10;
                                                            const xmax = win.box_2d[3] / 10;
                                                            const w = xmax - xmin;
                                                            const h = ymax - ymin;
                                                            return (
                                                                <g key={win.id}>
                                                                    <rect 
                                                                        x={xmin} 
                                                                        y={ymin} 
                                                                        width={w} 
                                                                        height={h} 
                                                                        fill="rgba(16, 185, 129, 0.12)" 
                                                                        stroke="#10b981" 
                                                                        strokeWidth="0.8" 
                                                                        strokeDasharray="1 1"
                                                                        rx="1" 
                                                                    />
                                                                    {/* Banderola con número de conteo */}
                                                                    <rect 
                                                                        x={xmin} 
                                                                        y={ymin} 
                                                                        width="6" 
                                                                        height="6" 
                                                                        rx="1" 
                                                                        fill="#10b981" 
                                                                    />
                                                                    <text 
                                                                        x={xmin + 3} 
                                                                        y={ymin + 4.2} 
                                                                        fill="white" 
                                                                        fontSize="3.2" 
                                                                        fontWeight="black" 
                                                                        textAnchor="middle"
                                                                    >
                                                                        {win.id}
                                                                    </text>
                                                                </g>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </svg>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 opacity-30">
                                            <CameraIcon className="text-4xl mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Sin captura</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsCameraOpen(true)} 
                                            className="p-4 bg-sky-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform flex items-center justify-center"
                                            title="Abrir Cámara Web / Celular"
                                        >
                                            <CameraIcon />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform flex items-center justify-center"
                                            title="Captura Nativa / Subir Archivo"
                                        >
                                            <i className="fas fa-upload text-sm"></i>
                                        </button>
                                        {formData.photo && <button type="button" onClick={() => { setFormData({ ...formData, photo: '' }); setDetectedWindows([]); setMeasurementLines([]); }} className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><TrashIcon /></button>}
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleNativePhotoCapture} 
                                    />
                                </div>

                                {/* Panel de control inferior de acuerdo al modo */}
                                {visionMode === 'defect' && (
                                    <div className="p-5 bg-sky-50 dark:bg-sky-900/10 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2 mb-2"><SparklesIcon className="scale-75" /> Recomendación IA</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">"Capture los bordes de la perfilería a 45° para detectar rebabas de corte automáticamente."</p>

                                        <button
                                            type="button"
                                            onClick={analyzeImage}
                                            disabled={isAnalyzing}
                                            className={`w-full mt-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02]'}`}
                                        >
                                            {isAnalyzing ? <RefreshIcon className="animate-spin" /> : <SparklesIcon />}
                                            {isAnalyzing ? 'Procesando...' : 'Analizar con IA'}
                                        </button>
                                    </div>
                                )}

                                {visionMode === 'measure' && (
                                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-ruler-horizontal text-xs"></i> Calibrador 2D</p>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Metrología</span>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="block text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Largo de Referencia (cm):</label>
                                            <input 
                                                type="number"
                                                value={calibrationLength}
                                                onChange={(e) => setCalibrationLength(Math.max(1, parseFloat(e.target.value) || 0))}
                                                className="w-full p-2.5 bg-white dark:bg-white/[0.03] border border-slate-250 dark:border-white/[0.06] rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>

                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic">
                                            "Arrastra la línea punteada verde sobre un objeto de medida conocida para autocalibrar el visor de píxeles."
                                        </p>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={addMeasurementLine}
                                                disabled={!formData.photo}
                                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <i className="fas fa-plus mr-1"></i> Nueva Cota
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearMeasurementLines}
                                                className="py-2 px-3 border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {visionMode === 'count' && (
                                    <div className="p-5 bg-violet-50 dark:bg-violet-950/10 rounded-2xl border border-violet-100 dark:border-violet-900/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-boxes text-xs"></i> Conteo Inteligente</p>
                                            {detectedWindows.length > 0 && (
                                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded font-mono text-[8px] font-bold uppercase tracking-widest">
                                                    IA: {detectedWindows.length} UDS
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic">
                                            "Enfoque y capture un arrume de ventanas apiladas. La IA identificará, encuadrará y contará de forma automatizada cada unidad."
                                        </p>

                                        <button
                                            type="button"
                                            onClick={analyzeImage}
                                            disabled={isAnalyzing}
                                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isAnalyzing ? 'bg-slate-200 text-slate-400' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02]'}`}
                                        >
                                            {isAnalyzing ? <RefreshIcon className="animate-spin" /> : <i className="fas fa-calculator"></i>}
                                            {isAnalyzing ? 'Contando...' : 'Contar Arrumes con IA'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Panel Derecho: Datos Técnicos */}
                            <div className="lg:col-span-8 space-y-6">
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
                                    <button type="button" onClick={handleCloseForm} className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={formData.isLocked}
                                        className={`px-12 py-4 ${formData.isLocked ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/20'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3`}
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
                <div className="premium-card overflow-hidden animate-fade-in border border-slate-200 dark:border-white/[0.08] shadow-2xl rounded-3xl bg-white dark:bg-[#0a0e1a]">

                    {/* EXCEL QUICK ACTIONS TOOLBAR */}
                    <div className="bg-slate-50 dark:bg-[#0e1220] border-b border-slate-200 dark:border-white/[0.06] p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Delete selected */}
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => handleDelete(Array.from(selectedIds))}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                                >
                                    Borrar Filas ({selectedIds.size})
                                </button>
                            )}

                            <button 
                                onClick={fetchInspections} 
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {loading ? 'Actualizando...' : 'Recargar'}
                            </button>

                             {/* Dropdown Filter for Process Areas next to Recargar */}
                            <select
                                value={selectedAreaFilter}
                                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest outline-none shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                            >
                                <option value="">TODAS LAS ÁREAS</option>
                                {uniqueAreas.map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>

                            {/* Excel-like Sorting buttons (arrows) next to Area filter */}
                            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/[0.06] mx-1"></div>
                            
                            <button
                                type="button"
                                onClick={() => setSortConfig({ key: 'fecha', direction: 'desc' })}
                                className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1 ${
                                    sortConfig.key === 'fecha' && sortConfig.direction === 'desc'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                                }`}
                                title="Ordenar de más recientes a más antiguos (Recientes)"
                            >
                                ↓ RECIENTES
                            </button>

                            <button
                                type="button"
                                onClick={() => setSortConfig({ key: 'fecha', direction: 'asc' })}
                                className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1 ${
                                    sortConfig.key === 'fecha' && sortConfig.direction === 'asc'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                                }`}
                                title="Ordenar de más antiguos a más recientes (Antiguos)"
                            >
                                ↑ ANTIGUOS
                            </button>
                        </div>

                        {/* Search input in quick actions toolbar instead of formula bar */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.06] rounded-lg w-full sm:w-auto sm:min-w-[200px] shadow-sm">
                            <input
                                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
                                placeholder="BUSCAR EN HOJA..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                            />
                            <SearchIcon className="text-slate-400 scale-75 cursor-pointer hover:text-sky-600 transition-colors" />
                        </div>
                    </div>

                    
                    {/* VISTA MÓVIL: TARJETAS */}
                    <div className="md:hidden p-4 space-y-4">
                        {loading && submissions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <RefreshIcon className="animate-spin text-indigo-500" />
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
                                        <button onClick={() => handleEdit(sub)} className="px-3 py-1.5 bg-white dark:bg-white/5 text-sky-600 dark:text-sky-400 font-black text-[9px] uppercase tracking-wider rounded hover:underline">Editar</button>
                                        <button onClick={() => handleDelete(sub.id)} className="px-3 py-1.5 bg-white dark:bg-white/5 text-rose-600 dark:text-rose-400 font-black text-[9px] uppercase tracking-wider rounded hover:underline">Eliminar</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* VISTA ESCRITORIO: TABLA (EXCEL SPREADSHEET GRID) */}
                    <div className="hidden md:block overflow-x-auto pb-4 custom-scrollbar">
                        <table className="w-full min-w-[2200px] text-left border-collapse text-[10px] table-fixed border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0a0e1a]">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-[#151a2d] text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-white/[0.08] select-none">
                                    {/* Excel Row Index Header */}
                                    <th style={{ width: 40 }} className="px-2 py-3 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center font-black border-r border-b border-slate-200 dark:border-white/[0.08]">
                                        #
                                    </th>
                                    <th style={{ width: columnWidths.checkbox, minWidth: columnWidths.checkbox }} className="px-4 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] text-center group cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative">
                                        <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size > 0 && selectedIds.size === filteredSubmissions.length}
                                                onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                                className="size-4 rounded border-slate-300 dark:border-slate-700 bg-transparent text-sky-600 focus:ring-sky-500 mb-1 cursor-pointer"
                                            />
                                            <div className="flex flex-col -space-y-1">
                                                <span className={`text-[7px] leading-none ${sortConfig.key === 'fecha' && sortConfig.direction === 'asc' ? 'text-indigo-600' : 'text-slate-400'}`}>▲</span>
                                                <span className={`text-[7px] leading-none ${sortConfig.key === 'fecha' && sortConfig.direction === 'desc' ? 'text-indigo-600' : 'text-slate-400'}`}>▼</span>
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('checkbox', e)} />
                                    </th>
                                    {/* Column Date */}
                                    <th style={{ width: columnWidths.fecha, minWidth: columnWidths.fecha }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('fecha')}>
                                        Fecha {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('fecha', e)} />
                                    </th>
                                    {/* Column Area */}
                                    <th style={{ width: columnWidths.areaProceso, minWidth: columnWidths.areaProceso }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('areaProceso')}>
                                        Área de Proceso {sortConfig.key === 'areaProceso' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('areaProceso', e)} />
                                    </th>
                                    {/* Column OP */}
                                    <th style={{ width: columnWidths.op, minWidth: columnWidths.op }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('op')}>
                                        OP {sortConfig.key === 'op' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('op', e)} />
                                    </th>
                                    {/* Column Plano */}
                                    <th style={{ width: columnWidths.planoOpc, minWidth: columnWidths.planoOpc }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('planoOpc')}>
                                        Plano (OPC) {sortConfig.key === 'planoOpc' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('planoOpc', e)} />
                                    </th>
                                    {/* Column Diseño */}
                                    <th style={{ width: columnWidths.disenoReferencia, minWidth: columnWidths.disenoReferencia }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('disenoReferencia')}>
                                        Diseño/Referencia {sortConfig.key === 'disenoReferencia' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('disenoReferencia', e)} />
                                    </th>
                                    {/* Column Cant Total */}
                                    <th style={{ width: columnWidths.cantTotal, minWidth: columnWidths.cantTotal }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] text-center uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('cantTotal')}>
                                        Cant Total {sortConfig.key === 'cantTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('cantTotal', e)} />
                                    </th>
                                    {/* Column Cant Retenida */}
                                    <th style={{ width: columnWidths.cantRetenida, minWidth: columnWidths.cantRetenida }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] text-center uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('cantRetenida')}>
                                        Cant Retenida {sortConfig.key === 'cantRetenida' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('cantRetenida', e)} />
                                    </th>
                                    {/* Column Estado */}
                                    <th style={{ width: columnWidths.estado, minWidth: columnWidths.estado }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('estado')}>
                                        Estado {sortConfig.key === 'estado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('estado', e)} />
                                    </th>
                                    {/* Column Defecto */}
                                    <th style={{ width: columnWidths.defecto, minWidth: columnWidths.defecto }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('defecto')}>
                                        Defecto {sortConfig.key === 'defecto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('defecto', e)} />
                                    </th>
                                    {/* Column Reviso */}
                                    <th style={{ width: columnWidths.reviso, minWidth: columnWidths.reviso }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('reviso')}>
                                        Revisó {sortConfig.key === 'reviso' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('reviso', e)} />
                                    </th>
                                    {/* Column Responsable */}
                                    <th style={{ width: columnWidths.responsable, minWidth: columnWidths.responsable }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('responsable')}>
                                        Responsable {sortConfig.key === 'responsable' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('responsable', e)} />
                                    </th>
                                    {/* Column Accion */}
                                    <th style={{ width: columnWidths.accionCorrectiva, minWidth: columnWidths.accionCorrectiva }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('accionCorrectiva')}>
                                        Acción Correctiva {sortConfig.key === 'accionCorrectiva' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('accionCorrectiva', e)} />
                                    </th>
                                    {/* Column Observacion */}
                                    <th style={{ width: columnWidths.observacion, minWidth: columnWidths.observacion }} className="px-6 py-3 border-r border-b border-slate-200 dark:border-white/[0.08] uppercase cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('observacion')}>
                                        Observación {sortConfig.key === 'observacion' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('observacion', e)} />
                                    </th>
                                    {/* Column Actions */}
                                    <th style={{ width: columnWidths.actions, minWidth: columnWidths.actions }} className="px-6 py-3 text-center border-b border-slate-200 dark:border-white/[0.08] relative">
                                        ACCIONES
                                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400/50 z-10" onMouseDown={(e) => handleResizeStart('actions', e)} />
                                    </th>
                                </tr>

                                {/* Excel Row Column Filter Inputs */}
                                <tr className="bg-slate-50 dark:bg-[#0e111e] border-b border-slate-200 dark:border-white/[0.08]">
                                    {/* Empty index filter cell */}
                                    <th className="p-2 border-r border-slate-200 dark:border-white/[0.08]"></th>
                                    <th className="p-2 border-r border-slate-200 dark:border-white/[0.08]"></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.fecha} onChange={e => setColumnFilters({ ...columnFilters, fecha: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.areaProceso} onChange={e => setColumnFilters({ ...columnFilters, areaProceso: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.op} onChange={e => setColumnFilters({ ...columnFilters, op: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.planoOpc} onChange={e => setColumnFilters({ ...columnFilters, planoOpc: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.disenoReferencia} onChange={e => setColumnFilters({ ...columnFilters, disenoReferencia: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400 text-center" placeholder="F..." value={columnFilters.cantTotal} onChange={e => setColumnFilters({ ...columnFilters, cantTotal: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400 text-center" placeholder="F..." value={columnFilters.cantRetenida} onChange={e => setColumnFilters({ ...columnFilters, cantRetenida: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.estado} onChange={e => setColumnFilters({ ...columnFilters, estado: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.defecto} onChange={e => setColumnFilters({ ...columnFilters, defecto: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.reviso} onChange={e => setColumnFilters({ ...columnFilters, reviso: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.responsable} onChange={e => setColumnFilters({ ...columnFilters, responsable: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.accionCorrectiva} onChange={e => setColumnFilters({ ...columnFilters, accionCorrectiva: e.target.value })} /></th>
                                    <th className="p-1 border-r border-slate-200 dark:border-white/[0.06]"><input className="w-full bg-white dark:bg-[#1a1f30] px-2 py-1 border border-slate-200 dark:border-white/[0.06] rounded text-[8px] uppercase font-bold outline-none placeholder:text-slate-400" placeholder="Filtrar..." value={columnFilters.observacion} onChange={e => setColumnFilters({ ...columnFilters, observacion: e.target.value })} /></th>
                                    <th className="p-1 bg-white/5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/[0.08]">
                                {loading && submissions.length === 0 ? (
                                    <tr><td colSpan={16} className="px-8 py-24 text-center text-slate-400 uppercase font-extrabold select-none">Cargando inspecciones...</td></tr>
                                ) : paginatedSubmissions.length === 0 ? (
                                    <tr><td colSpan={16} className="px-8 py-24 text-center text-slate-400 uppercase font-extrabold select-none">Sin resultados para los filtros actuales</td></tr>
                                ) : paginatedSubmissions.map((sub, idx) => (
                                    <tr key={sub.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[10px] font-bold ${selectedIds.has(sub.id) ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''} ${(sub as any).isOfflinePending ? 'border-l-2 border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.03]' : idx % 2 === 0 ? 'bg-white dark:bg-[#0a0e1a]' : 'bg-slate-50/20 dark:bg-white/[0.01]'}`}>
                                        {/* Excel Row Index Label */}
                                        <td className="bg-slate-100/50 dark:bg-[#111524] text-slate-400 dark:text-slate-500 text-center font-extrabold border-r border-b border-slate-200 dark:border-white/[0.08] select-none py-2.5">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        <td style={{ width: columnWidths.checkbox }} className="text-center border-r border-b border-slate-200 dark:border-white/[0.06] py-2.5 truncate">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(sub.id)}
                                                onChange={() => toggleSelectRow(sub.id)}
                                                className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                                            />
                                        </td>
                                        <td style={{ width: columnWidths.fecha }} className="px-6 border-r border-b border-slate-200 dark:border-white/[0.06] py-2.5 font-bold text-slate-800 dark:text-slate-200 uppercase truncate" title={sub.fecha}>
                                            <div className="flex items-center gap-1.5">
                                                {(sub as any).isOfflinePending && (
                                                    <span className="text-amber-500 animate-pulse" title="Pendiente de sincronizar con el servidor">
                                                        <i className="fas fa-cloud-slash text-[10px]"></i>
                                                    </span>
                                                )}
                                                <span>{sub.fecha}</span>
                                            </div>
                                        </td>
                                        <td style={{ width: columnWidths.areaProceso }} className="px-6 uppercase border-r border-b border-slate-200 dark:border-white/[0.06] py-2.5 font-black text-slate-900 dark:text-white truncate" title={sub.areaProceso}>{sub.areaProceso}</td>
                                        <td style={{ width: columnWidths.op }} className="px-6 py-2.5 font-mono font-bold text-slate-900 dark:text-white border-r border-b border-slate-200 dark:border-white/[0.06] truncate" title={sub.op}>{sub.op}</td>
                                        <td style={{ width: columnWidths.planoOpc }} className="px-6 py-2.5 text-slate-900 dark:text-white font-bold border-r border-b border-slate-200 dark:border-white/[0.06] text-center truncate" title={sub.planoOpc || '-'}>{sub.planoOpc || '-'}</td>
                                        <td style={{ width: columnWidths.disenoReferencia }} className="px-6 py-2.5 text-slate-900 dark:text-white font-black uppercase text-[9px] tracking-wider border-r border-b border-slate-200 dark:border-white/[0.06] truncate" title={sub.disenoReferencia}>{sub.disenoReferencia}</td>
                                        <td style={{ width: columnWidths.cantTotal }} className="px-6 py-2.5 text-center font-bold text-slate-900 dark:text-white border-r border-b border-slate-200 dark:border-white/[0.06] truncate">{sub.cantTotal}</td>
                                        <td style={{ width: columnWidths.cantRetenida }} className={`px-6 py-2.5 text-center font-black border-r border-b border-slate-200 dark:border-white/[0.06] truncate ${sub.cantRetenida > 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-500/5' : 'text-slate-900 dark:text-white'}`}>{sub.cantRetenida}</td>
                                        <td style={{ width: columnWidths.estado }} className="px-6 py-2.5 text-center border-r border-b border-slate-200 dark:border-white/[0.06] truncate">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${(sub.estado || '').toUpperCase() === 'APROBADO' ? 'bg-emerald-400 text-black border-emerald-500' :
                                                (sub.estado || '').toUpperCase() === 'REPROCESAR' ? 'bg-red-600 text-white border-red-700' :
                                                    (sub.estado || '').toUpperCase() === 'RECHAZADO' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {sub.estado}
                                            </span>
                                        </td>
                                        <td style={{ width: columnWidths.defecto }} className={`px-6 py-2.5 uppercase border-r border-b border-slate-200 dark:border-white/[0.06] font-bold truncate ${['NINGUNO', 'NA'].includes((sub.defecto || '').toUpperCase()) ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600 dark:text-rose-400'}`} title={sub.defecto}>{sub.defecto}</td>
                                        <td style={{ width: columnWidths.reviso }} className="px-6 py-2.5 uppercase text-slate-800 dark:text-slate-200 font-bold border-r border-b border-slate-200 dark:border-white/[0.06] truncate" title={sub.reviso}>{sub.reviso}</td>
                                        <td style={{ width: columnWidths.responsable }} className="px-6 py-2.5 uppercase text-slate-800 dark:text-slate-200 font-bold border-r border-b border-slate-200 dark:border-white/[0.06] truncate" title={sub.responsable}>{sub.responsable}</td>
                                        <td style={{ width: columnWidths.accionCorrectiva }} className={`px-6 py-2.5 border-r border-b border-slate-200 dark:border-white/[0.06] font-bold truncate ${(sub.accionCorrectiva || '').toUpperCase() === 'INTERNA' ? 'text-amber-500' :
                                            (sub.accionCorrectiva || '').toUpperCase() === 'REPOSICION' ? 'text-rose-600' :
                                                ['NA', 'NINGUNO', '', null, undefined].includes(sub.accionCorrectiva) || (sub.accionCorrectiva || '').toUpperCase() === 'NA' ? 'text-slate-800 dark:text-slate-200 font-normal' :
                                                    'text-amber-500'
                                            }`} title={sub.accionCorrectiva}>{sub.accionCorrectiva}</td>
                                        <td style={{ width: columnWidths.observacion }} className={`px-6 py-2.5 uppercase text-[9px] border-r border-b border-slate-200 dark:border-white/[0.06] truncate ${['NA', 'NINGUNA', 'NINGUNO', ''].includes((sub.observacion || '').toUpperCase()) ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600 dark:text-rose-400 font-bold'}`} title={sub.observacion}>{sub.observacion}</td>
                                        <td style={{ width: columnWidths.actions }} className="px-4 py-2.5 text-center border-b border-slate-200 dark:border-white/[0.06] truncate">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEdit(sub)} className="text-sky-600 dark:text-sky-400 hover:underline font-bold text-[9px] uppercase" title="Editar">
                                                    Editar
                                                </button>
                                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                                <button onClick={() => handleDelete(sub.id)} className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[9px] uppercase" title="Eliminar">
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* EXCEL STATUS BAR (Calculated aggregates at the very bottom) */}
                    <div className="bg-indigo-600 dark:bg-indigo-950 text-white font-mono text-[9px] uppercase py-2 px-6 flex flex-wrap items-center justify-between gap-4 border-t border-indigo-700 dark:border-indigo-900 select-none">
                        <div className="flex items-center gap-6">
                            <span className="font-extrabold flex items-center gap-1.5">RECUENTO: <span className="text-white bg-indigo-800 dark:bg-indigo-900 px-2 py-0.5 rounded font-black">{filteredSubmissions.length}</span></span>
                            <span className="font-extrabold flex items-center gap-1.5">SUMA (TOTAL): <span className="text-white bg-indigo-800 dark:bg-indigo-900 px-2 py-0.5 rounded font-black">{totalInspected}</span></span>
                            <span className="font-extrabold flex items-center gap-1.5">SUMA (RETENIDA): <span className="text-rose-200 bg-indigo-800 dark:bg-indigo-900 px-2 py-0.5 rounded font-black">{totalRetained}</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-extrabold flex items-center gap-1.5">
                                CUMPLIMIENTO:
                                <span className={`px-2 py-0.5 rounded font-black ${compliancePct >= 90 ? 'bg-emerald-600 text-white' : compliancePct >= 75 ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'}`}>
                                    {compliancePct}%
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* PAGINACIÓN (Spreedsheet Page Selector) */}
                    {totalPages > 1 && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-4 px-8 bg-slate-50 dark:bg-black/10 border-t dark:border-white/[0.06]">
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
                    <div className="bg-white dark:bg-[#111827] rounded-3xl max-w-lg w-full p-12 shadow-2xl animate-fade-in-up border border-slate-200/80 dark:border-white/[0.06] relative overflow-hidden my-auto">
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

            {/* Modal de Cámara Web / Stream */}
            <CameraModal 
                isOpen={isCameraOpen} 
                onClose={() => setIsCameraOpen(false)} 
                onCapture={(imageSrc) => {
                    setFormData(prev => ({ ...prev, photo: imageSrc }));
                    setDetectedWindows([]);
                    setMeasurementLines([]);
                    addNotification({ type: 'success', title: 'FOTO CAPTURADA', message: 'La captura se ha guardado como evidencia.' });
                }} 
            />
        </div>
    );
};

const CameraModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onCapture: (imageSrc: string) => void; 
}> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const startCamera = async () => {
            setHasError(false);
            try {
                // Intentar primero con la cámara trasera en dispositivos móviles
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: { ideal: 'environment' } } 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error al acceder a la cámara trasera, intentando fallback:", err);
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    streamRef.current = fallbackStream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                    }
                } catch (fallbackErr) {
                    console.error("Acceso a cámara fallido por completo:", fallbackErr);
                    setHasError(true);
                }
            }
        };

        if (isOpen) startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                onCapture(dataUrl);
            }
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[3000] flex justify-center items-center p-4 animate-fade-in">
            <div className="relative bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 space-y-6">
                {/* Decoración de Neón */}
                <div className="absolute top-[-20%] left-[-20%] w-[200px] h-[200px] bg-sky-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Cámara de Inspección</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Enfoque de Perfilería Alco</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="text-slate-400 hover:text-white transition-colors text-3xl font-light leading-none"
                    >
                        &times;
                    </button>
                </div>

                <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-white/5 shadow-inner flex items-center justify-center">
                    {hasError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
                            <i className="fas fa-exclamation-triangle text-rose-500 text-3xl animate-bounce"></i>
                            <div>
                                <p className="text-xs font-black uppercase text-slate-200">Permiso Denegado o Error</p>
                                <p className="text-[10px] text-slate-400 leading-normal max-w-[280px] mx-auto mt-1">
                                    No pudimos acceder a la transmisión de video. Por favor, asegúrese de dar permisos de cámara o use el botón de <b>Captura Nativa</b> en su celular.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                            
                            {/* Capa guía HUD técnica */}
                            <div className="absolute inset-4 border border-white/10 pointer-events-none rounded-xl flex items-center justify-center">
                                <div className="absolute w-6 h-0.5 bg-sky-500/30"></div>
                                <div className="absolute h-6 w-0.5 bg-sky-500/30"></div>
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-sky-400 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-sky-400 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-sky-400 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-sky-400 rounded-br-lg"></div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 relative z-10 pt-2 border-t border-white/5">
                    <button 
                        onClick={onClose} 
                        type="button" 
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                        Cancelar
                    </button>
                    {!hasError && (
                        <button 
                            onClick={handleCapture} 
                            type="button" 
                            className="flex-[2] py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-camera text-xs"></i> Capturar Foto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Forms;
