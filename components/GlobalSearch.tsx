import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSearchIndex, searchIndex, type SearchResult, type SearchResultType } from '../utils/globalSearch';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

// Acento visual por tipo de registro (dentro de la paleta corporativa)
const TYPE_ACCENT: Record<SearchResultType, string> = {
    inspection: 'text-indigo-500 bg-indigo-500/10',
    nc: 'text-rose-500 bg-rose-500/10',
    metrology: 'text-sky-500 bg-sky-500/10',
    replacement: 'text-violet-500 bg-violet-500/10',
    calibration: 'text-emerald-500 bg-emerald-500/10',
};

const EXAMPLES = [
    { icon: 'fa-clipboard-list', label: 'Inspección por número de OP' },
    { icon: 'fa-ruler-combined', label: 'Código de equipo de medición' },
    { icon: 'fa-triangle-exclamation', label: 'No conformidad por obra o proceso' },
    { icon: 'fa-circle-check', label: 'Calibración por instrumento' },
];

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [indexReady, setIndexReady] = useState(false);

    const indexRef = useRef<SearchResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Carga del índice al abrir
    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setResults([]);
        setActiveIndex(0);
        setLoading(true);
        setIndexReady(false);

        let cancelled = false;
        loadSearchIndex()
            .then(idx => {
                if (cancelled) return;
                indexRef.current = idx;
                setIndexReady(true);
            })
            .finally(() => !cancelled && setLoading(false));

        // foco en el input
        const t = setTimeout(() => inputRef.current?.focus(), 60);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [isOpen]);

    // Búsqueda con debounce
    useEffect(() => {
        if (!isOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const r = searchIndex(indexRef.current, query);
            setResults(r);
            setActiveIndex(0);
        }, 180);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, isOpen, indexReady]);

    const goTo = useCallback((item: SearchResult) => {
        navigate(item.path, { state: { ...item.state, _ts: Date.now() } });
        onClose();
    }, [navigate, onClose]);

    // Navegación por teclado
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, Math.max(results.length - 1, 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = results[activeIndex];
            if (item) goTo(item);
        }
    };

    // Mantener el item activo visible
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const el = list.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, results]);

    if (!isOpen) return null;

    const hasQuery = query.trim().length > 0;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-start justify-center p-4 pt-[12vh] bg-slate-900/50 backdrop-blur-sm animate-fade-in"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-[#0b0f1d] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-scale-in"
                onMouseDown={e => e.stopPropagation()}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-5 border-b border-slate-100 dark:border-white/[0.06]">
                    <i className="fas fa-search text-indigo-500 text-sm"></i>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar OP, equipo, NC, acta, calibración..."
                        className="flex-1 py-4 bg-transparent outline-none text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                    {loading && <i className="fas fa-circle-notch fa-spin text-slate-400 text-xs"></i>}
                    <button
                        onClick={onClose}
                        className="text-[10px] font-black text-slate-400 border border-slate-200 dark:border-white/10 rounded-md px-1.5 py-0.5 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        ESC
                    </button>
                </div>

                {/* Resultados */}
                <div ref={listRef} className="max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {!hasQuery && (
                        <div className="p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
                                Qué puedes buscar
                            </p>
                            <div className="space-y-1">
                                {EXAMPLES.map((ex, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400">
                                        <i className={`fas ${ex.icon} text-indigo-400 w-4`}></i>
                                        <span className="text-xs font-semibold">{ex.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasQuery && results.length === 0 && (
                        <div className="py-14 text-center">
                            <i className="fas fa-magnifying-glass text-2xl text-slate-300 dark:text-slate-600 mb-3"></i>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                {loading ? 'Cargando registros...' : 'Sin resultados'}
                            </p>
                            {!loading && (
                                <p className="text-[11px] text-slate-400 mt-1">No se encontraron registros para "{query}"</p>
                            )}
                        </div>
                    )}

                    {hasQuery && results.length > 0 && (
                        <div className="py-2">
                            {results.map((item, idx) => (
                                <button
                                    key={item.key}
                                    data-idx={idx}
                                    onClick={() => goTo(item)}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors ${idx === activeIndex ? 'bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_ACCENT[item.type]}`}>
                                        <i className={`fas ${item.icon} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.title}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded flex-shrink-0">{item.typeLabel}</span>
                                        </div>
                                        {item.subtitle && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                                        )}
                                    </div>
                                    {item.meta && (
                                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 hidden sm:block">{item.meta}</span>
                                    )}
                                    {idx === activeIndex && (
                                        <i className="fas fa-arrow-turn-down rotate-90 text-indigo-400 text-xs flex-shrink-0"></i>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        <span><kbd className="font-mono">↑↓</kbd> navegar</span>
                        <span><kbd className="font-mono">↵</kbd> abrir</span>
                        <span><kbd className="font-mono">esc</kbd> cerrar</span>
                    </div>
                    {hasQuery && results.length > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{results.length} resultados</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
