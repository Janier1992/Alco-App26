import { supabase } from '../insforgeClient';

// ─────────────────────────────────────────────────────────────
// Servicio de Búsqueda Global (Command Palette)
// Consulta las tablas de InsForge y construye un índice unificado
// y consultable de TODOS los registros operativos de la app.
// Es tolerante a dos formatos de datos:
//   - Filas crudas de InsForge (snake_case): op, area_proceso, ...
//   - Caché local offline (camelCase): op, areaProceso, ...
// ─────────────────────────────────────────────────────────────

export type SearchResultType =
    | 'inspection'
    | 'nc'
    | 'metrology'
    | 'replacement'
    | 'calibration';

export interface SearchResult {
    key: string;            // identificador único (tipo + id)
    type: SearchResultType;
    typeLabel: string;      // etiqueta visible del tipo
    icon: string;           // clase Font Awesome
    title: string;          // texto principal
    subtitle: string;       // contexto secundario
    meta?: string;          // info terciaria (fecha/estado)
    haystack: string;       // texto buscable (minúsculas)
    path: string;           // ruta de navegación
    state?: Record<string, any>; // estado para deep-link / filtrado
}

const TTL = 60_000; // 1 min de caché en memoria
let cachedIndex: SearchResult[] | null = null;
let lastLoaded = 0;
let inflight: Promise<SearchResult[]> | null = null;

const s = (v: any): string => (v ?? '').toString().trim();
const join = (parts: (string | undefined)[], sep = ' · ') =>
    parts.map(p => s(p)).filter(Boolean).join(sep);

async function fetchTable(table: string): Promise<any[]> {
    try {
        const { data, error } = await supabase.from(table).select('*');
        if (error || !Array.isArray(data)) return [];
        return data;
    } catch {
        return [];
    }
}

function readCache(key: string): any[] {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ─── Normalizadores (tolerantes a snake_case y camelCase) ───

function mapInspection(r: any): SearchResult {
    const op = s(r.op);
    const area = s(r.area_proceso ?? r.areaProceso);
    const plano = s(r.plano_opc ?? r.planoOpc);
    const ref = s(r.diseno_referencia ?? r.disenoReferencia);
    const defecto = s(r.defecto);
    const estado = s(r.estado);
    const reviso = s(r.reviso);
    const responsable = s(r.responsable);
    const obs = s(r.observacion);
    const fecha = s(r.fecha);
    const id = s(r.id);
    return {
        key: 'inspection:' + id,
        type: 'inspection',
        typeLabel: 'Inspección',
        icon: 'fa-clipboard-list',
        title: op ? `OP ${op}` : 'Inspección',
        subtitle: join([area, ref || plano, defecto && defecto !== 'NINGUNO' ? `Defecto: ${defecto}` : '']),
        meta: join([estado, fecha]),
        haystack: [op, area, plano, ref, defecto, estado, reviso, responsable, obs].join(' ').toLowerCase(),
        path: '/quality/forms',
        state: { filterId: id },
    };
}

function mapNC(r: any): SearchResult {
    // raw: serial_id (visible) + id (uuid).  cache: id (=serial) + db_id (uuid)
    const serial = s(r.serial_id ?? r.id);
    const title = s(r.title);
    const process = s(r.process);
    const project = s(r.project);
    const status = s(r.status);
    const severity = s(r.severity);
    const description = s(r.description);
    return {
        key: 'nc:' + s(r.id ?? r.db_id ?? serial),
        type: 'nc',
        typeLabel: 'No Conformidad',
        icon: 'fa-triangle-exclamation',
        title: join([serial, title]) || 'No Conformidad',
        subtitle: join([process, project]),
        meta: join([severity, status]),
        haystack: [serial, title, process, project, status, severity, description].join(' ').toLowerCase(),
        path: '/quality/nc',
        state: { q: serial || title },
    };
}

function mapMetrology(r: any): SearchResult {
    const folio = s(r.folio);
    const receptor = s(r.receptor_nombre ?? r.receptorNombre);
    const area = s(r.area);
    const sede = s(r.sede);
    const fecha = s(r.date ?? r.fecha);
    const id = s(r.id);
    const items = Array.isArray(r.items) ? r.items : [];
    const itemsText = items
        .map((it: any) => join([s(it.equipoNombre ?? it.equipo_nombre), s(it.marca), s(it.codigo)], ' '))
        .join(' ');
    return {
        key: 'metrology:' + id,
        type: 'metrology',
        typeLabel: 'Acta Metrología',
        icon: 'fa-ruler-combined',
        title: folio ? `Acta ${folio}` : `Acta ${id.slice(0, 8)}`,
        subtitle: join([receptor, area, sede]),
        meta: fecha,
        haystack: [folio, receptor, area, sede, itemsText].join(' ').toLowerCase(),
        path: '/metrology',
        state: { q: receptor },
    };
}

function mapReplacement(r: any): SearchResult {
    const equipo = s(r.nombre_equipo ?? r.nombreEquipo);
    const marca = s(r.marca);
    const codigo = s(r.codigo);
    const areaUso = s(r.area_uso ?? r.areaUso);
    const resp = s(r.nombre_responsable ?? r.nombreResponsable);
    const id = s(r.id);
    return {
        key: 'replacement:' + id,
        type: 'replacement',
        typeLabel: 'Reposición Equipo',
        icon: 'fa-arrows-rotate',
        title: join([codigo, equipo]) || 'Reposición de equipo',
        subtitle: join([marca, areaUso]),
        meta: resp,
        haystack: [equipo, marca, codigo, areaUso, resp].join(' ').toLowerCase(),
        path: '/metrology/replacement',
        state: { q: codigo || equipo },
    };
}

function mapCalibration(r: any): SearchResult {
    const tool = s(r.tool);
    const code = s(r.code);
    const cert = s(r.certificate_number ?? r.certificateNumber);
    const status = s(r.status);
    const due = s(r.due_date ?? r.dueDate);
    const id = s(r.id);
    return {
        key: 'calibration:' + id,
        type: 'calibration',
        typeLabel: 'Calibración',
        icon: 'fa-circle-check',
        title: join([code, tool]) || 'Calibración',
        subtitle: join([cert ? `Cert: ${cert}` : '', status]),
        meta: due ? `Vence: ${due}` : '',
        haystack: [tool, code, cert, status].join(' ').toLowerCase(),
        path: '/metrology/calibration',
        state: { q: code || tool },
    };
}

// ─── Carga del índice ───

interface Source {
    table: string;
    cacheKey: string;
    map: (r: any) => SearchResult;
}

const SOURCES: Source[] = [
    { table: 'field_inspections', cacheKey: 'alco_cached_inspections', map: mapInspection },
    { table: 'non_conformities', cacheKey: 'alco_cached_non_conformities', map: mapNC },
    { table: 'metrology_records', cacheKey: 'alco_cached_metrology_records', map: mapMetrology },
    { table: 'metrology_replacements', cacheKey: 'alco_cached_metrology_replacements', map: mapReplacement },
    { table: 'metrology_calibration', cacheKey: 'alco_cached_metrology_calibration', map: mapCalibration },
];

/**
 * Construye (o devuelve cacheado) el índice de búsqueda global.
 * Consulta InsForge en paralelo y, si una tabla falla o está vacía,
 * usa el caché local offline de ese módulo.
 */
export async function loadSearchIndex(force = false): Promise<SearchResult[]> {
    if (!force && cachedIndex && Date.now() - lastLoaded < TTL) return cachedIndex;
    if (!force && inflight) return inflight;

    inflight = (async () => {
        const rowsBySource = await Promise.all(SOURCES.map(src => fetchTable(src.table)));
        const results: SearchResult[] = [];

        SOURCES.forEach((src, i) => {
            const rows = rowsBySource[i].length ? rowsBySource[i] : readCache(src.cacheKey);
            for (const row of rows) {
                try {
                    results.push(src.map(row));
                } catch {
                    /* fila malformada: se ignora */
                }
            }
        });

        cachedIndex = results;
        lastLoaded = Date.now();
        inflight = null;
        return results;
    })();

    return inflight;
}

/** Invalida el índice en memoria (forzará recarga en la próxima búsqueda). */
export function invalidateSearchIndex(): void {
    cachedIndex = null;
    lastLoaded = 0;
}

/**
 * Filtra el índice por una consulta de texto libre.
 * Soporta múltiples términos (todos deben coincidir, en cualquier campo).
 */
export function searchIndex(index: SearchResult[], query: string, limit = 40): SearchResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { item: SearchResult; score: number }[] = [];

    for (const item of index) {
        if (!terms.every(t => item.haystack.includes(t))) continue;
        // Prioriza coincidencias en el título y coincidencias exactas de término
        let score = 0;
        const titleLower = item.title.toLowerCase();
        for (const t of terms) {
            if (titleLower.includes(t)) score += 3;
            if (item.haystack.includes(' ' + t) || item.haystack.startsWith(t)) score += 1;
        }
        scored.push({ item, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(x => x.item);
}
