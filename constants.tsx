
import React from 'react';
import type { NavItem, Document, ProductLot, Column, SupervisorTask, OperationalInsight } from './types';

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
export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-chevron-right w-5 h-5 ${className || ''}`}></i>;
export const MovieIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-film w-5 h-5 ${className || ''}`}></i>;
export const MagicIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-sparkles w-5 h-5 ${className || ''}`}></i>;
export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-sparkles w-5 h-5 ${className || ''}`}></i>;
export const UserShieldIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-user-shield w-5 h-5 ${className || ''}`}></i>;
export const EnvelopeOpenTextIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-envelope-open-text w-5 h-5 ${className || ''}`}></i>;
export const SendIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-paper-plane ${className || ''}`}></i>;
export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fas fa-trash-can ${className || ''}`}></i>;

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
            { id: 'claims', label: 'Gestión de Reclamos', path: '/quality/claims', icon: UserShieldIcon },
            { id: 'audits', label: 'Auditorías IA (ISO 19011)', path: '/quality/audits', icon: RobotIcon },
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
        id: 'documents',
        label: 'GESTIÓN DOCUMENTAL',
        path: '/quality/library',
        icon: BookIcon,
    },
    {
        id: 'projects',
        label: 'GESTIÓN DE PROYECTOS',
        path: '/ops/projects',
        icon: ProjectDiagramIcon,
    },

    {
        id: 'installations',
        label: 'SOPORTE OBRAS',
        path: '/installations',
        icon: ConstructionIcon,
    },
    {
        id: 'settings',
        label: 'CONFIGURACIÓN',
        path: '/settings',
        icon: CogIcon,
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

export const MOCK_NC = [
    { id: 'NC-24-089', title: 'Desviación dimensional en lote A-102.', process: 'Auditoría Interna', project: 'Alco Project A', severity: 'Crítica', status: 'Abierta', createdAt: '2024-07-20', actions: [], description: 'Dimensional deviation in part batch A-102 detected during incoming.' },
    { id: 'NC-24-092', title: 'Falta de certificados de seguridad proveedor X.', process: 'Proveedores', project: 'Alco Project B', severity: 'Mayor', status: 'Abierta', createdAt: '2024-07-21', actions: [], description: 'Missing safety certifications for new chemical reagent supplier.' },
    { id: 'NC-24-075', title: 'Fallo software etiquetado L4.', process: 'Producción', project: 'Alco Project C', severity: 'Menor', status: 'CAPA', createdAt: '2024-07-15', actions: [], description: 'Labeling software crashing intermittently on Line 4.' }
];

export const METROLOGY_MARCAS = ['STANLEY', 'LUFKIN', 'BOSH', 'DEWALT', 'WURTH'];
export const METROLOGY_MEDIDAS = ['0-150mm', '0-25mm', '12"', '3m', '5m', '8m', 'Humboldt', '30m', '50m'];
export const METROLOGY_SECCIONES = [
    'ACCESORIOS', 'ALMACÉN', 'ALISTAMIENTO', 'CALIDAD', 'CNC', 'COMERCIAL',
    'CORTE DE PERFILERIA', 'COTIZACION', 'DESPACHOS', 'DISEÑO', 'ENSAMBLE',
    'FELPA / EMPAQUE', 'INSTALACIÓN', 'PINTURA', 'TROQUELADO 1', 'TROQUELADO 2',
    'TROQUELADO 3', 'VIDRIO CRUDO', 'VIDRIO TEMPLADO', 'ENSAMBLE. BOGOTÁ'
];
export const METROLOGY_ASIGNADOS = ['JANIER MOSQUERA', 'ROBERTO MENDEZ', 'LUIS GOMEZ', 'TAMARA VARGAS'];
export const METROLOGY_OBSERVACIONES_OPTIONS = [
    'FLEXÓMETRO NUEVO, PRIMERA VEZ',
    'FLEXÓMETRO NUEVO, PRIMERA VEZ.',
    'FLEXOMETRO NUEVO, ANTERIOR EXTRAVIADO',
    'FLEXÓMETRO DE SEGUNDA, PRIMERA VEZ',
    'FLEXÓMETRO DE SEGUNDA, ANTERIOR AVERIADO',
    'FLEXÓMETRO NUEVO, ANTERIOR AVERIADO',
    'FLEX. CAMBIO DE 5 A 8 M',
    'FLEXÓMETRO DE SEGUNDA, ANTERIOR AVERIADO',
    'FLEXOMETRO NUEVO, ANTERIOR EXTRAVIADO',
    'DISTANCIÓMETRO NUEVO',
    'FLEXÓMETRO DE SEGUNDA, ANTERIOR AVERIDO',
    'FLEXÓMETRO NUEVO, CAMBIO DE MEDIDA',
    'FLEXOMETRO NUEVO, ANTERIOR AVERIADO'
];

export const PROJECT_USERS = [
    { id: 'u1', initials: 'JP' }, { id: 'u2', initials: 'MR' }, { id: 'u3', initials: 'CR' }, { id: 'u4', initials: 'JM' }
];

export const AVAILABLE_LABELS = [
    { id: '1', name: 'CALIDAD', color: 'red' }, { id: '2', name: 'PLANTA', color: 'blue' }, { id: '3', name: 'URGENTE', color: 'orange' }
];

export const MOCK_DOCUMENTS: Document[] = [
    {
        id: 1, name: 'Manual de Calidad ISO 9001:2015', code: 'MC-ALCO-01', category: 'Manuales',
        date: '2024-01-15', validUntil: '2025-01-15', size: '2.4 MB', version: 'V3.2', status: 'Aprobado',
        author: 'Ing. Elena Rivas', approvedBy: 'Gerencia Técnica'
    },
    {
        id: 2, name: 'Instructivo Corte Perfilería Serie 80', code: 'IT-PR-02', category: 'Instructivos',
        date: '2023-11-02', validUntil: '2024-11-02', size: '1.1 MB', version: 'V1.0', status: 'Aprobado',
        author: 'Supervisor Planta', approvedBy: 'Calidad'
    }
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

export const MOCK_LOTS: ProductLot[] = [
    {
        id: 'LT-2024-001',
        productName: 'Ventana Serie 80 Gris Titanio',
        creationDate: '2024-07-15',
        currentStage: 'Empaque',
        history: [
            { id: 'H1', stage: 'Corte', timestamp: '2024-07-15 08:00', details: 'Perfiles cortados según plano PL-TH.', operator: 'Juan Perez', status: 'OK' },
            { id: 'H2', stage: 'Mecanizado', timestamp: '2024-07-15 10:30', details: 'Perforaciones para cerradura ejecutadas.', operator: 'Carlos Ruiz', status: 'OK' },
            { id: 'H3', stage: 'Pintura', timestamp: '2024-07-16 09:00', details: 'Acabado Gris Titanio 65 micras.', operator: 'Roberto Mendez', status: 'OK' }
        ]
    },
    {
        id: 'LT-2024-002',
        productName: 'Puerta Corrediza Monumental',
        creationDate: '2024-07-18',
        currentStage: 'Pintura',
        history: [
            { id: 'H4', stage: 'Corte', timestamp: '2024-07-18 08:00', details: 'Perfiles cortados.', operator: 'Juan Perez', status: 'OK' }
        ]
    }
];

export const MOCK_WASTE_DATA = [
    { id: '1', date: '2024-07-01', type: 'Aluminio (Retal)', quantityKg: 450, disposalMethod: 'Reciclaje Externo', certificate: 'CERT-AL-001' },
    { id: '2', date: '2024-07-05', type: 'Vidrio (Cera)', quantityKg: 320, disposalMethod: 'Reciclaje Externo', certificate: 'CERT-VI-088' },
    { id: '3', date: '2024-07-10', type: 'Residuos Peligrosos', quantityKg: 25, disposalMethod: 'Incineración Controlada', certificate: 'HAZ-2024-X' },
    { id: '4', date: '2024-07-15', type: 'Cartón/Plástico', quantityKg: 180, disposalMethod: 'Reciclaje Interno', certificate: '' }
];

export const MOCK_MAINT_KPIS = {
    mttr: [
        { name: 'Sem 1', value: 4.5 },
        { name: 'Sem 2', value: 3.8 },
        { name: 'Sem 3', value: 5.2 },
        { name: 'Sem 4', value: 3.2 }
    ],
    preventiveCompliance: 88,
    waterConsumption: [
        { name: 'Lunes', value: 12 },
        { name: 'Martes', value: 15 },
        { name: 'Miércoles', value: 10 },
        { name: 'Jueves', value: 18 },
        { name: 'Viernes', value: 14 }
    ]
};

export const MOCK_SUPERVISOR_TASKS: SupervisorTask[] = [
    {
        id: 'T1', title: 'Validar Espesor Pintura Lote G-90', description: 'Verificar micras en 5 puntos aleatorios de la perfilería.',
        priority: 'High', status: 'Pending', estimatedTime: '15 min',
        isoReference: { clause: '8.5.1', explanation: 'El control de la producción asegura que las salidas cumplen los requisitos.' }
    },
    {
        id: 'T2', title: 'Checklist Seguridad Sierra L2', description: 'Confirmar que las guardas y paradas de emergencia estén funcionales.',
        priority: 'High', status: 'Pending', estimatedTime: '10 min',
        isoReference: { clause: '7.1.3', explanation: 'La infraestructura debe mantenerse para asegurar la conformidad del producto.' }
    }
];

export const MOCK_INSIGHTS: OperationalInsight[] = [
    { id: 'I1', title: 'Descuadre en Ensamble', description: 'Se detectó desviación de 2mm en esquinas superiores.', frequency: '3 veces/semana', correction: 'Ajustar presión de prensas neumáticas.' },
    { id: 'I2', title: 'Burbujas en Sellado', description: 'Aire atrapado en cordones de silicona perimetral.', frequency: '2 veces/semana', correction: 'Limpiar boquillas y reducir velocidad de aplicación.' }
];

export const MOCK_PREDICTIVE_METRICS = Array.from({ length: 20 }, (_, i) => ({
    timestamp: `${10 + Math.floor(i / 2)}:${(i % 2) * 30 === 0 ? '00' : '30'}`,
    value: 40 + Math.random() * 30,
    threshold: 80,
    predicted: i > 15
}));

export const MOCK_COLLABORATORS = [
    { id: '1', name: 'Ana Gómez', role: 'Calidad', status: 'online', avatar: 'AG' },
    { id: '2', name: 'Carlos Ruiz', role: 'Producción', status: 'busy', avatar: 'CR' },
    { id: '3', name: 'Lucía Fernández', role: 'Diseño', status: 'away', avatar: 'LF' },
    { id: '4', name: 'Miguel Torres', role: 'Logística', status: 'online', avatar: 'MT' },
    { id: '5', name: 'Elena Rivas', role: 'Ingeniería', status: 'offline', avatar: 'ER' },
];

export const MOCK_RECENT_ACTIVITIES = [
    { id: 'a1', user: 'Ana Gómez', action: 'Aprobó Lote L-204', time: 'Hace 5 min', type: 'success' },
    { id: 'a2', user: 'Carlos Ruiz', action: 'Reportó Falla en Línea 2', time: 'Hace 12 min', type: 'error' },
    { id: 'a3', user: 'Lucía Fernández', action: 'Actualizó Plano P-88', time: 'Hace 45 min', type: 'info' },
    { id: 'a4', user: 'Miguel Torres', action: 'Inició Despacho D-99', time: 'Hace 1 hora', type: 'warning' },
    { id: 'a5', user: 'Sistema', action: 'Backup Completado', time: 'Hace 2 horas', type: 'info' },
];
