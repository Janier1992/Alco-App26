
import React from 'react';
import type { NavItem, Column } from './types';

// Iconos
// Iconos
export const TachometerIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-desktop w-5 h-5 ${className || ''}`}></i>);
export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-shield-check w-5 h-5 ${className || ''}`}></i>);
export const ClipboardListIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-tasks w-5 h-5 ${className || ''}`}></i>);
export const FolderOpenIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-folder-tree w-5 h-5 ${className || ''}`}></i>);
export const ChartLineIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-chart-mixed w-5 h-5 ${className || ''}`}></i>);
export const FileAltIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-file-signature w-5 h-5 ${className || ''}`}></i>);
export const SignOutIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-power-off w-5 h-5 ${className || ''}`}></i>);
export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${className || ''}`}></i>);
export const ProjectDiagramIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-sitemap w-5 h-5 ${className || ''}`}></i>);
export const Bars3Icon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-bars-staggered h-5 w-5 ${className || ''}`}></i>);
export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-search ${className || ''}`}></i>);
export const ViewIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-eye w-4 h-4 ${className || ''}`}></i>);
export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-download w-4 h-4 ${className || ''}`}></i>);
export const DeleteIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-trash-can w-4 h-4 ${className || ''}`}></i>);
export const EditIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-pen-to-square w-4 h-4 ${className || ''}`}></i>);
export const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-camera-viewfinder w-5 h-5 ${className || ''}`}></i>);
export const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (<i className={`fas fa-floppy-disk w-5 h-5 ${className || ''}`}></i>);
export const SunIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-sun h-5 w-5 ${className || ''}`}></i>;
export const MoonIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-moon h-5 w-5 ${className || ''}`}></i>;
export const RobotIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-robot w-5 h-5 ${className || ''}`}></i>;
export const BookIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-book w-5 h-5 ${className || ''}`}></i>;
export const ExclamationTriangleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-exclamation-triangle w-5 h-5 ${className || ''}`}></i>;
export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-clipboard-check w-5 h-5 ${className || ''}`}></i>;
export const BellIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-bell w-5 h-5 ${className || ''}`}></i>;
export const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-circle-user h-6 w-6 ${className || ''}`}></i>;
export const ClipboardCheckIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-clipboard-check w-5 h-5 ${className || ''}`}></i>;
export const CogIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-gears w-5 h-5 ${className || ''}`}></i>;
export const ChartPieIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-chart-pie-simple w-5 h-5 ${className || ''}`}></i>;
export const IndustryIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-factory w-5 h-5 ${className || ''}`}></i>;
export const LeafIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-leaf-heart w-5 h-5 ${className || ''}`}></i>;
export const WrenchIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-screwdriver-wrench w-5 h-5 ${className || ''}`}></i>;
export const FileExcelIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-file-spreadsheet ${className || ''}`}></i>;
export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-plus ${className || ''}`}></i>;
export const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-earth-americas ${className || ''}`}></i>;
export const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-arrows-rotate ${className || ''}`}></i>;
export const RulerIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-ruler-combined w-5 h-5 ${className || ''}`}></i>;
export const GraduationCapIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-graduation-cap w-5 h-5 ${className || ''}`}></i>;
export const LightbulbIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-lightbulb w-5 h-5 ${className || ''}`}></i>;
export const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-database w-5 h-5 ${className || ''}`}></i>;
export const ConstructionIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-hard-hat w-5 h-5 ${className || ''}`}></i>;
export const ToolIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-tools w-5 h-5 ${className || ''}`}></i>;
export const LinkIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-link w-5 h-5 ${className || ''}`}></i>;
export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-upload w-5 h-5 ${className || ''}`}></i>;
export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-calendar-alt w-5 h-5 ${className || ''}`}></i>;
export const PaperclipIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-paperclip w-5 h-5 ${className || ''}`}></i>;
export const InfoCircleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-info-circle w-5 h-5 ${className || ''}`}></i>;
export const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-times-circle w-5 h-5 ${className || ''}`}></i>;
export const DropIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-droplet w-5 h-5 ${className || ''}`}></i>;
export const QRIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-qrcode w-5 h-5 ${className || ''}`}></i>;
export const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-microphone w-5 h-5 ${className || ''}`}></i>;
export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fab fa-google w-5 h-5 ${className || ''}`}></i>;
export const MapIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-map-marked-alt w-5 h-5 ${className || ''}`}></i>;
export const ImageIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-image w-5 h-5 ${className || ''}`}></i>;
export const BrainIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-brain w-5 h-5 ${className || ''}`}></i>;
export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-chevron-left w-5 h-5 ${className || ''}`}></i>;
export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-chevron-right w-5 h-5 ${className || ''}`}></i>;
export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-sparkles w-5 h-5 ${className || ''}`}></i>;
export const UserShieldIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-user-shield w-5 h-5 ${className || ''}`}></i>;
export const EnvelopeOpenTextIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-envelope-open-text w-5 h-5 ${className || ''}`}></i>;
export const SendIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-paper-plane ${className || ''}`}></i>;
export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-trash-can ${className || ''}`}></i>;
export const PencilSquareIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-pen-to-square ${className || ''}`}></i>;
export const TagIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-tag ${className || ''}`}></i>;
export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-clock ${className || ''}`}></i>;
export const ChatIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-comments w-5 h-5 ${className || ''}`}></i>;
export const FileEditIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-file-pen w-5 h-5 ${className || ''}`}></i>;

// --- ESTRUCTURA ARQUITECTÓNICA ALCO SGC PRO ---
export const NAV_ITEMS: NavItem[] = [
    {
        id: 'dashboard',
        label: 'INICIO SISTEMA',
        path: '/dashboard',
        icon: TachometerIcon,
    },
    {
        id: 'quality_core',
        label: 'Ciclo de Calidad ISO',
        path: '/quality',
        icon: ShieldCheckIcon,
        children: [
            { id: 'forms', label: 'Inspecciones en Campo', path: '/quality/forms', icon: ClipboardListIcon },
            { id: 'nc', label: 'No Conformidades y CAPA', path: '/quality/nc', icon: ExclamationTriangleIcon },
            { id: 'instructivos', label: 'Instructivos de Diseños', path: '/quality/instructivos', icon: FileEditIcon },
        ],
    },
    {
        id: 'metrology_root',
        label: 'Metrología Pro',
        path: '/metrology',
        icon: RulerIcon,
        children: [
            { id: 'metrology_entry', label: 'Entrega de Equipos', path: '/metrology', icon: RulerIcon },
            { id: 'metrology_replacement', label: 'Reposición y Baja', path: '/metrology/replacement', icon: DeleteIcon },
            { id: 'metrology_cal', label: 'Control Calibración', path: '/metrology/calibration', icon: CheckCircleIcon },
        ]
    },
    {
        id: 'messaging',
        label: 'MENSAJERÍA',
        path: '/messaging',
        icon: ChatIcon,
    }
];

// --- DATA EXTRACTED FROM IMAGE REFERENCE ---
export const AREAS_PROCESO = [
    'ACCESORIOS', 'ALMACÉN', 'CALIDAD', 'CNC', 'CORTE DE', 'COTIZACION',
    'DESPACHOS', 'DISEÑO', 'ENSAMBLE', 'ENSAMBLE BOGOTÁ', 'FELPA / EMPAQUE',
    'PINTURA', 'TROQUELADO 1', 'TROQUELADO 2', 'TROQUELADO 3', 'VIDRIO CRUDO',
    'VIDRIO TEMPLADO', 'TALLER'
];

export const ESTADO_OPTIONS = ['NA', 'Aprobado', 'Rechazado', 'Pendiente', 'Reprocesar'];

// --- NUEVA LISTA DE DEFECTOS ACTUALIZADA SEGÚN IMAGEN ---
export const DEFECTO_TYPES = [
    'NINGUNO',
    'AGRIETAMIENTO',
    'BRILLO',
    'BURBUJA',
    'COLILLA',
    'COLOR',
    'DECOLORACION',
    'DESPORTILLADO',
    'DISTORSION ASOCIADA',
    'EMP./FELPA',
    'ESTÉTICA',
    'FUNCIONALIDAD',
    'MEDIDAS',
    'PIEDRA',
    'RASGUÑO',
    'RODAMIENTO',
    'SILICONA',
    'SUCIEDAD'
];

export const REGISTRO_USERS = [
    'ALEJANDRO AGUDELO', 'EDWIN BEDOYA', 'JANIER MOSQUERA', 'JORGE PABÓN',
    'JHONATAN GUERRA', 'NIVER METAUTE', 'SARA HURTADO', 'OSCAR GALINDO', 'YEFERSON PALACIOS'
];

export const ACCION_CORRECTIVA_OPTIONS = ['NA', 'INTERNA', 'EXTERNA', 'REPOSICION'];

export const DISENO_REFERENCIA_OPTIONS = [
    'VC/VCR-PRI2', 'VC/VCR-PRI3', 'VC/VCR-DS', 'VC/VCR-OPT', 'VCALF-PRI2',
    'VCALF-PRI3', 'VCALF-OPT', 'VC-OPT-ANGEOANT', 'CF-PRI', 'CF-PRI2',
    'CF-PRI3', 'CF-OPT', 'CF-MONU', 'VR-PRI', 'VR-DS', 'PC/PCR-OPT-II',
    'PC/PCR-OPT-III', 'PC/PCR-OPT-IV', 'PC-PCR-DS', 'VP-PRI', 'VP-PRI3',
    'VP-OPT', 'PP-VITRI-A', 'PP-VITRI-B', 'PP-VITRI-C', 'PSM-BAR-OLO',
    'VP-FL-PLNUEVA', 'VP-FL-PLVIEJA', 'GT-DS-P6X-GTNA', 'FACH-S45', 'AL-90', 'CF-PRI'
];

export const OPERARIO_RESPONSABLES = [
    'DURANGO PUERTA DIEGO', 'LOPEZ CASTRO JUAN PABLO', 'VILLA VERGARA KELLER ESTIVEN',
    'RACINES GALINDO JUAN CAMILO', 'SANCHEZ OSORIO CRISTIAN', 'ALVAREZ YEPES MARIA CAMILA',
    'VALENCIA USREGA DILAN', 'QUIROZ HENAO SANTIAGO', 'SALAZAR DUARTE CARLOS ALBERTO',
    'OROZCO COGOLLO ANDRES MIGUEL', 'MEDINA BADILLO RONAL', 'RODRIGUEZ ZAPATA JAIDER ANDRES'
];

// --- OBSERVACIONES EXTRAÍDAS DE LA IMAGEN CATEGORIZADAS ---
export const OBSERVACIONES_SUGERIDAS = [
    "(P) REBABA POR CORTE", "(P) CORTE INCORRECTO (ACABADO)", "(P) CORTE INCORRECTO (GRADOS)",
    "(P) CORTE INCORRECTO (MEDIDA)", "(P) CORTE INCORRECTO (SENTIDOS)", "(P) MAL ARRUME",
    "(P) MATERIAL SIN PROTECCION", "(P) PERFILERIA EN CARROS SIN PROTECCION",
    "(P) PERFILERIA EN CARROS SIN MARCAR", "(P) PERFILERIA TALLADA",
    "(P) MATERIAL NO CONFORME AUTORIZADO POR PRODUCCION", "(P) RETOQUE POR DEFECTO DE PINTURA",
    "(P) FRICCION, GOLPE Y DESGARRE",
    "(P) COLOR / TONO NO CONFORME", "(P) DESPRENDIMIENTO DE PINTURA", "(P) FRICCIONES / RAYONES / GOLPES",
    "(P) MATERIAL RETOCADO / RECHAZO", "(P) MATERIAL PINTADO POR AUTORIRACION DE PRODUCCION",
    "(P) NO SE REALIZO PRUEBA DE ADHERENCIA", "(P) PIEL NARANJA", "(P) PIEL DE LIJA", "(P) PINHOLE",
    "(P) NO SE REALIZÓ TITULACIÓN, POR TRABAJO EN EL TANQUE",
    "(T/CNC) REBABA POR EQUIPO DE TROQUELADO", "(T/CNC) TROQUELADO INCORRECTO", "(T/CNC) SIN TROQUELAR",
    "(T/CNC) DESPRENDIMIENTO DE PINTURA", "(T/CNC) FRICCIONES / RAYONES / GOLPES", "(T/CNC) MAL ARRUME",
    "(T/CNC) MATERIAL SIN PROTECCION", "(T/CNC) PERFILERIA EN CARROS SIN PROTECCION",
    "(T/CNC) PERFILERIA EN CARROS SIN MARCAR", "(T/CNC) PERFILERIA TALLADA",
    "(T7CNC) MATERIAL NO CONFORME AUTORIZADO POR PRODUCCION",
    "(E) AUTORIZAR PRODUCCION INCONFORME", "(E) CAJAS MAL REALIZADAS", "(E) ENSAMBLE INCORRECTO DE LOS MATERIALES",
    "(E) INGRESAR SIN APROBAR", "(E) LUCES ENTRE PERFILES", "(E) MALA INSTALACIÓN DEL EMPAQUE",
    "(E) MALA INSTALACIÓN DEL VIDRIO", "(E) MALA APLICACION DE SILICONA", "(E) DAÑO DE PERFILERIA",
    "(E) FRICCIONES / RAYONES / GOLPES", "(E) RETOCAR PINTURA", "(E) VIDRIO DEFECTUOSO",
    "(E) ALUMINIO DEFECTUOSO", "(E) MALA INSTALACIÓN DE LA FELPA", "(E) MEDIDAS NO CONFORME",
    "(E) ACCESORIOS DEFECTUOSOS", "(E) MODELOS", "(E) PERFORACION MAL REALIZADA",
    "(E) MATERIAL NO CONFORME DE PROVEEDOR", "(E) PRODUCCIÓN SIN REVISAR POR CALIDAD",
    "(E) SE INGRESO PARTE DE LA PRODUCCIÓN SIN REVISAR",
    "(VC) VIDRIO DEFECTUOSO", "(VC) VIDRIO RAYADO", "(VC) CORTE INCORRECTO", "(VC) VIDRIO MANCHADO",
    "(VC) VIDRIO QUEBRADO", "(VC) DEFECTO DE ESPESOR", "(VC) INCLUSIONES / BURBUJAS",
    "(VT) DISTORSION OPTICA DE IMAGEN", "(VT) DESPOTILLADO", "(VT) BURBUJAS / INCLUSIONES",
    "(VT) RAYAS / TALLONES", "(VT) COLOR / TONO NO CONFORME", "(VT) MAL ARRUME",
    "(VT) DESPICADO / CUCACHARA", "(VT) VIDRIOS QUEBRADOS", "(VT) MATERIAL NO CONFORME AUTORIZADO POR PRODUCCION"
];

export const MOCK_CHART_DATA = {
    qualityTrend: [
        { name: 'Lun', value: 92 }, { name: 'Mar', value: 94 }, { name: 'Mie', value: 91 },
        { name: 'Jue', value: 96 }, { name: 'Vie', value: 95 }, { name: 'Sab', value: 98 },
        { name: 'Dom', value: 97 }
    ],
    defectsByType: [
        { name: 'RASGUÑO', value: 24, fill: '#ef4444' },
        { name: 'MEDIDAS', value: 18, fill: '#f97316' },
        { name: 'PINTURA', value: 12, fill: '#eab308' },
        { name: 'ENSAMBLE', value: 8, fill: '#3b82f6' },
        { name: 'SUCIEDAD', value: 4, fill: '#10b981' }
    ],
    inspectionsByArea: [
        { name: 'CORTE DE', value: 45 },
        { name: 'ENSAMBLE', value: 38 },
        { name: 'PINTURA', value: 52 },
        { name: 'FELPA / EMPAQUE', value: 29 },
        { name: 'CALIDAD', value: 60 }
    ],
    defects: [
        { name: 'CORTE', value: 40 }, { name: 'PINTURA', value: 30 }, { name: 'ENSAMBLE', value: 20 }, { name: 'VENTA', value: 10 }
    ]
};

export const METROLOGY_MARCAS = ['STANLEY', 'LUFKIN', 'BOSH', 'DEWALT', 'WURTH'];
export const METROLOGY_MEDIDAS = ['0-150mm', '0-25mm', '12"', '3m', '5m', '8m', 'Humboldt', '30m', '50m'];
export const METROLOGY_SECCIONES = [
    'ABASTECIMIENTO',
    'ACCESORIOS',
    'ALISTAMIENTO',
    'ALMACEN',
    'AMBIENTAL',
    'CALIDAD',
    'CNC',
    'COMERCIAL',
    'DESPACHOS',
    'DISEÑO',
    'ENSAMBLE',
    'FELPA Y EMPAQUE',
    'GERENCIAL',
    'INSTALACION',
    'MANTENIMIENTO',
    'PERFILERIA',
    'POSVENTAS',
    'PRODUCCION-OFICINAS',
    'TROQUELADO 1',
    'TROQUELADO 2',
    'TROQUELADO 3',
    'VIDRIO CRUDO',
    'VIDRIO LAMINADO',
    'VIDRIO TEMPLADO',
];
export const METROLOGY_ASIGNADOS = ['JANIER MOSQUERA', 'ROBERTO MENDEZ', 'LUIS GOMEZ', 'TAMARA VARGAS'];
export const METROLOGY_OBSERVACIONES_OPTIONS = [
    'FLEXÓMETRO NUEVO, PRIMERA VEZ',
    'FLEXÓMETRO NUEVO, ANTERIOR EXTRAVIADO',
    'FLEXÓMETRO NUEVO, ANTERIOR AVERIADO',
    'FLEXÓMETRO NUEVO, CAMBIO DE MEDIDA',
    'FLEXÓMETRO DE SEGUNDA, PRIMERA VEZ',
    'FLEXÓMETRO DE SEGUNDA, ANTERIOR AVERIADO',
    'FLEXÓMETRO CAMBIO DE 5 A 8 METROS',
    'DISTANCIÓMETRO NUEVO'
];

export const PROJECT_USERS = [
    { user_id: 'u1', user_initials: 'JP' }, { user_id: 'u2', user_initials: 'MR' }, { user_id: 'u3', user_initials: 'CR' }, { user_id: 'u4', user_initials: 'JM' }
];

export const AVAILABLE_LABELS = [
    { id: '1', name: 'CALIDAD', color: 'red' }, { id: '2', name: 'PLANTA', color: 'blue' }, { id: '3', name: 'URGENTE', color: 'orange' }
];

export const MAINTENANCE_COLUMNS: { [key: string]: Column } = {
    todo: {
        id: 'todo',
        title: 'Por Hacer',
        tasks: [
            { id: 'OT-001', title: 'Fuga Hidráulica T1', priority: 'Crítica', type: 'Correctivo', assetId: 'TRQ-01', description: 'Goteo constante en manguera de alta presión.', dueDate: '2024-07-25', labels: [], assignedUsers: [], attachments: [], comments: [] },
            { id: 'OT-002', title: 'Limpieza Filtros Aire', priority: 'Media', type: 'Preventivo', assetId: 'COMP-02', description: 'Cambio de filtros mensual según cronograma.', dueDate: '2024-07-28', labels: [], assignedUsers: [], attachments: [], comments: [] }
        ]
    },
    in_progress: {
        id: 'in_progress',
        title: 'En Proceso',
        tasks: []
    },
    done: {
        id: 'done',
        title: 'Finalizado',
        tasks: []
    }
};

export const INITIAL_MAINTENANCE_TASKS = [
    ...MAINTENANCE_COLUMNS.todo.tasks,
    ...MAINTENANCE_COLUMNS.in_progress.tasks,
    ...MAINTENANCE_COLUMNS.done.tasks
];
