
import React from 'react';

export interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    password?: string;
    organizationId?: string;
}

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.FC;
    children?: NavItem[];
}

// --- Gestión de Reclamos y Documentos de Calidad ---
export type DocumentType = 'Informe Técnico de Obra' | 'Comunicado Oficial Post-Venta';
export type ClaimStatus = 'Recibido' | 'En Investigación' | 'Propuesta Enviada' | 'Cerrado' | 'Rechazado';
export type ClaimPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface QualityDocument {
    id: string;
    docType: DocumentType;
    client: string;
    project: string;
    date: string;
    subject: string;
    pdpNumber?: string;
    installer?: string;
    priority: ClaimPriority;
    status: ClaimStatus;
    assignedTo: string;
    description: string;
    antecedentes?: string;
    analisisTecnico?: string;
    accionesCorrectivas?: string;
    accionesPreventivas?: string;
    compromisos?: string;
    recomendaciones?: string;
    officialContent?: string; // Markdown generado por IA
}

// --- Gestión Documental ---
export type DocumentStatus = 'Borrador' | 'En Revisión' | 'Aprobado' | 'Obsoleto';
export type DocumentCategory = 'Manuales' | 'Instructivos' | 'Planos' | 'Fichas Técnicas' | 'Registros';

export interface Document {
    id: string;
    name: string;
    code: string;
    category: DocumentCategory;
    date: string;
    validUntil?: string;
    size: string;
    version: string;
    status: DocumentStatus;
    url?: string;
    approvedBy?: string;
    author: string;
    base64?: string;
    mime?: string;
}

// --- No Conformidades (NC) & CAPA ---
export type NCSeverity = 'Menor' | 'Mayor' | 'Crítica';
export type NCStatus = 'Abierta' | 'Bajo Análisis' | 'CAPA' | 'Cerrada' | 'Eficaz';

export interface FiveWhys {
    why1: string;
    why2: string;
    why3: string;
    why4: string;
    why5: string;
    rootCause: string;
    aiSuggestedRootCause?: string;
    evidence_urls?: string[];
}

export interface CAPAAction {
    id: string;
    description: string;
    responsible: string;
    dueDate: string;
    completed: boolean;
    type: 'Correctiva' | 'Preventiva' | 'Mejora';
}

export interface NonConformity {
    id: string;
    title: string;
    process: string;
    project: string;
    severity: NCSeverity;
    status: NCStatus;
    description: string;
    rca?: FiveWhys;
    actions: CAPAAction[];
    createdAt: string;
    closedAt?: string;
    history: NCHistoryEvent[];
}

export interface NCHistoryEvent {
    id: string;
    date: string;
    user: string;
    action: string;
    details: string;
}

// --- Calidad e Inspección ---
export interface InspectionData {
    id: string;
    fecha: string;
    areaProceso: string;
    op: string;
    planoOpc: string;
    disenoReferencia: string;
    cantTotal: number;
    cantRetenida: number;
    estado: string;
    defecto: string;
    reviso: string;
    responsable: string;
    accionCorrectiva: string;
    observacionSugerida: string;
    observacion: string;
    photo?: string;
    isLocked?: boolean;
    alertLevel?: 'None' | 'Warning' | 'Critical';
    autoNCId?: string;
    aiMetadata?: {
        unitCount: number;
        confidence: string;
        defectFound: boolean;
        suggestedDefect: string;
        aiDescription: string;
    };
}

// --- Metrología ---
export interface MetrologyItem {
    equipoNombre: string;
    marca: string;
    cantidad: number;
    observaciones: string;
}

export interface MetrologyRecord {
    id: string;
    // Header
    fecha: string;
    area: string;
    sede: string;
    receptorNombre: string;
    receptorCedula: string;
    receptorCargo: string;

    // Item Details
    items: MetrologyItem[];

    // Signatures
    firmaEntrega: string;
    firmaRecibe: string;
}

export interface MetrologyReplacementRecord {
    id: string;
    fechaRegistro: string;
    nombreEquipo: string;
    marca: string;
    codigo: string;
    areaUso: string;
    nombreResponsable: string;
    motivoReposicion: string;
    devuelveEquipoAnterior: 'SI' | 'NO' | '';
    descripcionBaja: string;
    seCobraEquipo: 'SI' | 'NO' | '';
    nombreResponsableCalidad: string;
    firmaResponsableArea: string;
    firmaResponsableCalidad: string;
}

// --- Arquitectura de Agente IA (Patrón ReAct) ---
export type AgentPersona = 'Global' | 'Ops' | 'QA' | 'Project' | 'Supply';

export interface AgentMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
}

export interface ProductLot {
    id: string;
    productName: string;
    creationDate: string;
    currentStage: string;
    history: {
        id: string;
        stage: string;
        timestamp: string;
        details: string;
        operator: string;
        status: 'OK' | 'NOK';
    }[];
}

export interface AuditPlan {
    id: string;
    title: string;
    date: string;
    scope: string;
    auditor: string;
    status: string;
    isoClauses: string[];
}

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface UserAvatar {
    id?: string;
    user_id: string;
    user_initials: string;
}

export interface Attachment {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
}

export interface TaskComment {
    id: string;
    author: string;
    text: string;
    date: string;
}

export type MaintenanceType = 'Correctivo' | 'Preventivo' | 'Predictivo' | 'Locativo';

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    priority: Priority;
    description: string;
    dueDate: string;
    labels: Label[];
    assignedUsers: UserAvatar[];
    attachments: Attachment[];
    comments?: TaskComment[];
    checklist?: ChecklistItem[];
    assetId?: string;
    type?: MaintenanceType;
    column_id?: string;
    createdAt?: string;
    is_template?: boolean;
    cover_color?: string;
}

export interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

export interface SupervisorTask {
    id: string;
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'Done';
    estimatedTime: string;
    isoReference: {
        clause: string;
        explanation: string;
    };
}

export interface OperationalInsight {
    id: string;
    title: string;
    description: string;
    frequency: string;
    correction: string;
}

export interface AdverseEventData {
    id: string;
    registradoPor: string;
    fecha: string;
    area: string;
    opPlano: string;
    obra: string;
    unidades: number;
    tipoDefecto: string;
    disenoReferencia: string;
    causaRaiz: string;
    documentoReferencia: string;
    seguimiento: string;
    observacion?: string;
    photo?: string;
}

export interface ExternalForm {
    id: string;
    title: string;
    url: string;
    description: string;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

export interface AgentStep {
    id: string;
    thought: string;
    action: string;
    observation: string;
}

export interface PredictiveAlert {
    id: string;
    severity: 'Critical' | 'Warning' | 'Safe';
    message: string;
    timestamp: string;
    recommendedAction: string;
    lineId: string;
}

export interface LineRiskProfile {
    lineId: string;
    lineName: string;
    riskScore: number;
    topRiskFactor: string;
    status: 'Safe' | 'Warning' | 'Critical';
}

// --- Mensajería Centralizada (User-Centric y Tiempo Real) ---
export type ConversationType = 'direct' | 'group';
export type MessageContentType = 'text' | 'file' | 'image' | 'system';
export type MessageReadStatus = 'sent' | 'delivered' | 'read';

export interface UserSession {
    userId: string;
    socketId?: string;
    isOnline: boolean;
    lastActivity: string;
    deviceInfo?: string;
}

export interface ChatParticipant {
    userId: string;
    username?: string; // Derivado para no hacer JOIN siempre
    role?: string;     // admin, member
    isOnline?: boolean;
    isTyping?: boolean;
    avatar?: string;
    lastReadAt?: string;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    content: string;
    type: MessageContentType;
    createdAt: string;
    editedAt?: string;
    deletedAt?: string;
    readStatus: MessageReadStatus;
    replyTo?: {
        id: string;
        senderName: string;
        content: string;
    };
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
}

export interface Conversation {
    id: string;
    type: ConversationType;
    organizationId: string;
    createdBy: string;
    title?: string;
    avatar?: string;
    participants: ChatParticipant[];
    lastMessage?: ChatMessage;
    unreadCount: number;
    linkedModule?: 'nc' | 'audit' | 'document' | 'project';
    linkedId?: string;
    createdAt: string;
    updatedAt: string;
}

// --- Sistema Unificado de Notificaciones ---

export type EventType =
    | 'NC_CREATED' | 'NC_STATUS_CHANGED' | 'NC_CLOSED'
    | 'CLAIM_CREATED' | 'CLAIM_STATUS_CHANGED' | 'CLAIM_RESOLVED'
    | 'AUDIT_CREATED' | 'AUDIT_SCHEDULED' | 'AUDIT_STATUS_CHANGED' | 'AUDIT_COMPLETED'
    | 'CALIBRATION_CREATED' | 'CALIBRATION_STATUS_CHANGED' | 'CALIBRATION_DUE' | 'CALIBRATION_EXPIRED'
    | 'FORM_SUBMITTED' | 'INSPECTION_CREATED' | 'INSPECTION_COMPLETED'
    | 'DOCUMENT_UPLOADED' | 'DOCUMENT_APPROVED'
    | 'EQUIPMENT_DELIVERED' | 'EQUIPMENT_DECOMMISSIONED'
    | 'INSTRUCTION_APPROVED'
    | 'CUSTOM';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SystemEvent {
    event_type: EventType;
    module: string;
    reference_id: string;
    triggered_by: string;
    timestamp: string;
    payload: Record<string, any>;
}

export interface InternalNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    referenceId?: string;
    moduleName?: string;
    eventType?: EventType;
    priority: NotificationPriority;
    isRead: boolean;
    createdAt: string;
}

export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    eventType: EventType;
    moduleName: string;
    conditionJson: Record<string, any>;
    actionsJson: {
        send_email: boolean;
        create_internal_notification: boolean;
        create_chat_thread: boolean;
        notification_title?: string;
        notification_message?: string;
        email_subject?: string;
        email_body?: string;
    };
    recipientsJson: string[];
    isActive: boolean;
    createdBy?: string;
    createdAt: string;
}

export interface EmailLog {
    id: string;
    moduleName?: string;
    referenceId?: string;
    recipient: string;
    subject: string;
    body?: string;
    status: 'pending' | 'sent' | 'failed' | 'queued';
    errorMessage?: string;
    triggeredBy?: string;
    ruleId?: string;
    createdAt: string;
}
