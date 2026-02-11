import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { useNotification } from './NotificationSystem';
import { FileExcelIcon, RefreshIcon } from '../constants'; // Ensure icons are available

interface BulkUploadButtonProps {
    tableName: string;
    onUploadComplete: () => void;
    label?: string;
    mapping?: (row: any) => any; // Optional function to transform data before insertion
}

const BulkUploadButton: React.FC<BulkUploadButtonProps> = ({ tableName, onUploadComplete, label = 'Carga Masiva (Excel)', mapping }) => {
    const { addNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

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
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error('El archivo está vacío.');
                }

                // Apply mapping if provided, otherwise use raw data (keys must match DB columns)
                const payload = mapping ? data.map(mapping) : data;

                const { error } = await supabase
                    .from(tableName)
                    .insert(payload);

                if (error) throw error;

                addNotification({ type: 'success', title: 'CARGA EXITOSA', message: `Se importaron ${data.length} registros.` });
                onUploadComplete();
            } catch (error: any) {
                console.error('Upload Error:', error);
                addNotification({ type: 'error', title: 'ERROR DE CARGA', message: error.message || 'Error al procesar el archivo.' });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls, .csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? <RefreshIcon className="animate-spin" /> : <FileExcelIcon />}
                {isUploading ? 'Procesando...' : label}
            </button>
        </>
    );
};

export default BulkUploadButton;
