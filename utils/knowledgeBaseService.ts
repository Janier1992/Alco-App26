/**
 * Knowledge Base Service
 * Carga los documentos técnicos de Alco (PDFs) desde /public/knowledge/
 * y los convierte a base64 para pasarlos como contexto multimodal al agente IA.
 */

export interface KBDocument {
    id: string;
    name: string;            // Nombre amigable mostrado en UI
    path: string;            // Ruta pública (relativa a la raíz del sitio)
    description: string;     // Descripción corta del documento
    active: boolean;         // Si el usuario lo ha activado como contexto
    loaded: boolean;         // Si ya se cargó el base64
    data?: string;           // Contenido en base64 (se llena al cargar)
    sizeKb?: number;         // Tamaño aproximado para mostrar en UI
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // e.g. '/Alco-App26'

/**
 * Catálogo de documentos técnicos disponibles en la base de conocimiento.
 * Los paths usan BASE_URL de Vite para funcionar en dev y producción.
 */
export const KB_DOCUMENTS: KBDocument[] = [
    {
        id: 'alco_inspeccion',
        name: 'Manual Inspección y Control de Calidad',
        path: `${BASE}/knowledge/alco_inspeccion_completo.pdf`,
        description: 'Procedimiento completo de inspección y control de calidad Alco',
        active: false,
        loaded: false,
        sizeKb: 109,
    },
    {
        id: 'instructivo_lups',
        name: 'Instructivo LUPS Control e Inspección',
        path: `${BASE}/knowledge/instructivo_lups.pdf`,
        description: 'Instructivo de control e inspección bajo el estándar LUPS',
        active: false,
        loaded: false,
        sizeKb: 507,
    },
    {
        id: 'instructivo_pc_opt_ii',
        name: 'Instructivo PC-OPT-II-TT V2',
        path: `${BASE}/knowledge/instructivo_pc_opt_ii.pdf`,
        description: 'Instructivo de fabricación y control para perfil PC-OPT-II termotanque',
        active: false,
        loaded: false,
        sizeKb: 1753,
    },
    {
        id: 'instructivo_pc_opt_iii',
        name: 'Instructivo PC-OPT-III-PGE V2',
        path: `${BASE}/knowledge/instructivo_pc_opt_iii.pdf`,
        description: 'Instructivo de fabricación y control para perfil PC-OPT-III puertas',
        active: false,
        loaded: false,
        sizeKb: 1984,
    },
    {
        id: 'disenos_alco',
        name: 'Diseños Alco: Inspección y Control Calidad',
        path: `${BASE}/knowledge/disenos_alco.pdf`,
        description: 'Manual detallado de diseños, tolerancias y control de calidad Alco',
        active: false,
        loaded: false,
        sizeKb: 46330,
    },
];


/**
 * Carga un documento PDF desde la ruta pública y lo convierte a base64.
 * Almacena el resultado en el objeto doc para caché.
 */
export const loadDocument = async (doc: KBDocument): Promise<KBDocument> => {
    if (doc.loaded && doc.data) return doc;

    try {
        const response = await fetch(doc.path);
        if (!response.ok) throw new Error(`HTTP ${response.status} al cargar ${doc.name}`);

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        return { ...doc, loaded: true, data: base64 };
    } catch (error) {
        console.error(`[KnowledgeBase] Error cargando ${doc.name}:`, error);
        return { ...doc, loaded: false };
    }
};

/**
 * Convierte los documentos activos y cargados en partes multimodales de Gemini.
 * Retorna un array de partes con inlineData para incluir en el prompt.
 */
export const getKBParts = (docs: KBDocument[]): any[] => {
    const activeDocs = docs.filter(d => d.active && d.loaded && d.data);
    if (activeDocs.length === 0) return [];

    const parts: any[] = [];

    // Mensaje introductorio para el agente
    parts.push({
        text: `[SISTEMA] Tienes acceso a los siguientes documentos técnicos de referencia de Alco:\n${activeDocs.map(d => `• ${d.name}: ${d.description}`).join('\n')}\nUSA estos documentos como fuente principal de verdad para responder preguntas técnicas.`
    });

    // Agregar cada PDF como inlineData
    activeDocs.forEach(doc => {
        parts.push({
            inlineData: {
                data: doc.data!,
                mimeType: 'application/pdf'
            }
        });
    });

    return parts;
};

/**
 * Texto del sistema que informa al agente sobre su base de conocimiento.
 */
export const getKBSystemContext = (docs: KBDocument[]): string => {
    const activeDocs = docs.filter(d => d.active);
    if (activeDocs.length === 0) {
        return 'SISTEMA DE SEGURIDAD CRÍTICA: No hay manuales activos. RECUERDA AL USUARIO que DEBE activar documentos para recibir asistencia técnica. TIENES PROHIBIDO dar cualquier medida o dato técnico sin documentos activos.';
    }
    return `BASE DE CONOCIMIENTO TÉCNICA ALCO (FUENTE ÚNICA DE VERDAD): 
- Eres un motor de búsqueda y validación técnica. NO eres un chat creativo.
- Solo tienes permitido usar la información de los archivos: ${activeDocs.map(d => d.name).join(', ')}.
- REGLA DE ORO: Si el dato exacto (medida, tolerancia, proceso) NO está en el texto recuperado, responde: "Dato no disponible en los manuales actuales".
- PROHIBIDO: Usar conocimiento externo de metalurgia, ISO 9001 o ingeniería general para rellenar vacíos.
- Cita siempre la fuente: "[Manual X] indica que...".`;
};
