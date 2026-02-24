import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../insforgeClient';
import { useNotification } from './NotificationSystem';
import { FileExcelIcon, RefreshIcon, ChevronRightIcon, XCircleIcon, SaveIcon } from '../constants';

interface BulkUploadButtonProps {
    tableName: string;
    onUploadComplete: () => void;
    label?: string;
    mapping?: (row: any) => any;
    columns?: { key: string; label: string }[];
}

const BulkUploadButton: React.FC<BulkUploadButtonProps> = ({ tableName, onUploadComplete, label = 'Carga Masiva (Excel)', mapping, columns }) => {
    const { addNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Convert full sheet to array of arrays to find the header row
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                if (rawData.length === 0) throw new Error('El archivo está vacío.');

                // Smart Header Detection: Scan first 10 rows to find the one with most known keywords
                const knownKeywords = ['FECHA', 'DATE', 'OP', 'ORDEN', 'AREA', 'PROCESO', 'PLANO', 'ITEM', 'TOTAL', 'CANTIDAD', 'ESTADO', 'STATUS'];
                let headerRowIndex = 0;
                let maxMatches = 0;

                for (let i = 0; i < Math.min(rawData.length, 10); i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    const matches = row.filter(cell =>
                        typeof cell === 'string' && knownKeywords.some(kw =>
                            cell.toUpperCase().includes(kw)
                        )
                    ).length;

                    if (matches > maxMatches) {
                        maxMatches = matches;
                        headerRowIndex = i;
                    }
                }

                console.log(`Header found at row ${headerRowIndex} with ${maxMatches} matches.`);

                // Re-parse from the identified header row
                const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

                // Capture raw headers for debugging
                const headers = Object.keys(data[0] as object);
                setRawHeaders(headers);

                // Apply mapping to generate preview
                const mappedData = mapping ? data.map(mapping) : data;
                setPreviewData(mappedData.slice(0, 5)); // Show first 5 rows

                const finalPayload = mappedData;

                // Store full data for potential upload, but show preview first
                (window as any).tempUploadPayload = finalPayload;
                setShowPreview(true);

            } catch (error: any) {
                console.error('Read Error:', error);
                addNotification({ type: 'error', title: 'ERROR DE LECTURA', message: error.message || 'Error al leer el archivo.' });
                if (fileInputRef.current) fileInputRef.current.value = '';
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const confirmUpload = async () => {
        const payload = (window as any).tempUploadPayload;
        if (!payload) return;

        setIsUploading(true);
        try {
            const { error } = await supabase.from(tableName).insert(payload);
            if (error) throw error;

            addNotification({ type: 'success', title: 'CARGA EXITOSA', message: `Se importaron ${payload.length} registros.` });
            onUploadComplete();
            setShowPreview(false);
        } catch (error: any) {
            console.error('Upload Error:', error);
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: error.message || 'Error al insertar en base de datos.' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            (window as any).tempUploadPayload = null;
        }
    };

    return (
        <>
            <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? <RefreshIcon className="animate-spin" /> : <FileExcelIcon />}
                {isUploading ? 'Procesando...' : label}
            </button>

            {showPreview && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1a1b26] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <FileExcelIcon className="text-emerald-500" /> Vista Previa de Carga
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Encabezados detectados: <span className="font-mono bg-slate-100 dark:bg-black/30 px-1 rounded text-emerald-600">{rawHeaders.join(', ')}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><XCircleIcon className="scale-125" /></button>
                        </div>

                        <div className="p-6 overflow-auto bg-slate-50 dark:bg-[#0b0b14]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Primeros 5 registros procesados</h4>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold uppercase">
                                        <tr>
                                            {columns
                                                ? columns.map(c => <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>)
                                                : (previewData.length > 0 && Object.keys(previewData[0]).map(k => (
                                                    <th key={k} className="px-4 py-3 whitespace-nowrap">{k}</th>
                                                )))
                                            }
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1a1b26]">
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                {columns
                                                    ? columns.map(c => (
                                                        <td key={c.key} className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                            {row[c.key] === null || row[c.key] === '' ? <span className="text-rose-500 font-bold italic">VACÍO</span> : String(row[c.key])}
                                                        </td>
                                                    ))
                                                    : Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                            {val === null || val === '' ? <span className="text-rose-500 font-bold italic">VACÍO</span> : String(val)}
                                                        </td>
                                                    ))
                                                }
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                                <div className="text-blue-500 mt-0.5"><ChevronRightIcon /></div>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                    **Verifica los datos:** Si ves campos marcados como <span className="text-rose-500 font-bold">VACÍO</span> en columnas críticas (OP, Area, Fecha), revisa que los encabezados de tu Excel coincidan o sean sinónimos reconocibles.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setShowPreview(false)} className="px-6 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">Cancelar</button>
                            <button onClick={confirmUpload} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2">
                                <SaveIcon /> Confirmar e Importar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BulkUploadButton;
