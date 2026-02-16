
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Document, DocumentStatus, DocumentCategory } from '../types';
import {
    SearchIcon, PlusIcon, RefreshIcon,
    DownloadIcon, DeleteIcon, ViewIcon, SaveIcon,
    FileAltIcon, ClipboardCheckIcon, BookIcon, RobotIcon, XCircleIcon
} from '../constants';
import Breadcrumbs from './Breadcrumbs';
import { useNotification } from './NotificationSystem';
import { useAgent } from './AgentContext';
import { supabase } from '../insforgeClient';

const Library: React.FC = () => {
    const { addNotification } = useNotification();
    const { setActiveDocument, toggleAgent } = useAgent();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'Todos'>('Todos');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // To view PDF in an iframe/modal
    const [docToView, setDocToView] = useState<Document | null>(null);

    // Form State for new documents
    const [newDoc, setNewDoc] = useState<Partial<Document>>({
        name: '',
        code: '',
        category: 'Manuales',
        status: 'Aprobado',
        version: 'V1.0',
        author: '',
        validUntil: ''
    });
    const [tempFile, setTempFile] = useState<{ file: File, url: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('sgc_documents').select('*').order('date', { ascending: false });
            if (error) throw error;

            const mappedDocs: Document[] = (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                code: r.code,
                category: r.category,
                date: r.date,
                validUntil: r.valid_until,
                size: r.size,
                version: r.version,
                status: r.status,
                author: r.author,
                url: r.file_url,
                mime: r.mime_type
            }));

            setDocuments(mappedDocs);
        } catch (error: any) {
            console.error('Error fetching documents:', error);
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: 'No se pudo recuperar la biblioteca de documentos.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const categories = useMemo(() => {
        const counts = documents.reduce((acc, doc) => {
            acc[doc.category] = (acc[doc.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { id: 'Todos', label: 'Raíz / Todo', count: documents.length, icon: 'fas fa-layer-group' },
            { id: 'Manuales', label: 'Manuales', count: counts['Manuales'] || 0, icon: 'fas fa-book' },
            { id: 'Instructivos', label: 'Instructivos', count: counts['Instructivos'] || 0, icon: 'fas fa-chalkboard-teacher' },
            { id: 'Planos', label: 'Planos', count: counts['Planos'] || 0, icon: 'fas fa-drafting-compass' },
            { id: 'Fichas Técnicas', label: 'Fichas Técnicas', count: counts['Fichas Técnicas'] || 0, icon: 'fas fa-microchip' },
            { id: 'Registros', label: 'Registros', count: counts['Registros'] || 0, icon: 'fas fa-file-signature' },
        ];
    }, [documents]);

    const getDocStatus = (doc: Document) => {
        if (!doc.validUntil) return doc.status;
        const today = new Date();
        const expiry = new Date(doc.validUntil);
        if (expiry < today) return 'CADUCADO';
        return doc.status;
    };

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || doc.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [documents, searchTerm, selectedCategory]);

    const handleUploadClick = () => {
        setIsUploadModalOpen(true);
        setNewDoc({ name: '', code: '', category: 'Manuales', status: 'Aprobado', version: 'V1.0', author: '', validUntil: '' });
        setTempFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                addNotification({ type: 'error', title: 'FORMATO INVÁLIDO', message: 'Por favor sube solo archivos PDF.' });
                return;
            }

            const url = URL.createObjectURL(file);
            setTempFile({ file: file, url });
            setNewDoc(prev => ({
                ...prev,
                name: prev.name || file.name.split('.')[0],
                size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            }));
        }
    };

    const handleSaveDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempFile || !newDoc.name || !newDoc.code) {
            addNotification({ type: 'error', title: 'FALTA INFORMACIÓN', message: 'Debes completar los campos y adjuntar un PDF.' });
            return;
        }

        try {
            addNotification({ type: 'info', title: 'PROCESANDO', message: 'Subiendo archivo al servidor seguro...' });
            const fileName = `${newDoc.code}_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage.from('quality-documents').upload(fileName, tempFile.file);
            if (uploadError) throw uploadError;

            const publicUrlData = supabase.storage.from('quality-documents').getPublicUrl(fileName);
            const fileUrl = typeof publicUrlData === 'string' ? publicUrlData : (publicUrlData as any).data?.publicUrl || (publicUrlData as any).publicUrl;

            const dbPayload = {
                name: newDoc.name,
                code: newDoc.code,
                category: newDoc.category,
                date: new Date().toISOString().split('T')[0],
                valid_until: newDoc.validUntil || null,
                size: newDoc.size,
                version: newDoc.version,
                status: 'Aprobado',
                author: newDoc.author || 'Usuario Sistema',
                file_url: fileUrl,
                mime_type: 'application/pdf'
            };

            const { error: insertError } = await supabase.from('sgc_documents').insert([dbPayload]);
            if (insertError) throw insertError;

            addNotification({ type: 'success', title: 'DOCUMENTO CARGADO', message: `El archivo ${newDoc.code} ha sido incorporado al SGC.` });
            fetchRecords();
            setIsUploadModalOpen(false);
            setTempFile(null);
        } catch (error: any) {
            console.error('Error saving document:', error);
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Desea eliminar permanentemente este documento del repositorio oficial?')) {
            try {
                const { error } = await supabase.from('sgc_documents').delete().eq('id', id);
                if (error) throw error;
                addNotification({ type: 'error', title: 'DOC ELIMINADO', message: 'La información ha sido purgada de la base de datos.' });
                fetchRecords();
            } catch (error) {
                addNotification({ type: 'error', title: 'ERROR', message: 'No se pudo eliminar el documento.' });
            }
        }
    };

    const handleDownload = (doc: Document) => {
        if (!doc.url) {
            addNotification({ type: 'error', title: 'ERROR DESCARGA', message: 'Archivo no disponible.' });
            return;
        }
        window.open(doc.url, '_blank');
        addNotification({ type: 'success', title: 'DESCARGA INICIADA', message: 'El documento se está abriendo en una nueva pestaña.' });
    };

    const handleConsultAI = async (doc: Document) => {
        if (!doc.url) {
            addNotification({ type: 'error', title: 'IA NO DISPONIBLE', message: 'Este documento no tiene contenido legible por la IA.' });
            return;
        }

        try {
            addNotification({ type: 'info', title: 'PROCESANDO IA', message: 'Recuperando contenido para análisis...' });
            const response = await fetch(doc.url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setActiveDocument({
                    name: doc.name,
                    content: base64,
                    mime: doc.mime || 'application/pdf'
                });
                toggleAgent(true);
            };
            reader.readAsDataURL(blob);
            addNotification({ type: 'info', title: 'COPILOT ACTIVADO', message: `Analizando ${doc.code} con IA...` });
        } catch (error) {
            addNotification({ type: 'error', title: 'ERROR IA', message: 'No se pudo procesar el documento para la IA.' });
        }
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#5d5fef] outline-none uppercase transition-all placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <Breadcrumbs crumbs={[{ label: 'INGENIERÍA Y SGC', path: '/dashboard' }, { label: 'GESTIÓN DOCUMENTAL' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Explorador de <span className="text-sky-600">Documentos</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">Control de información documentada ISO 9001:2015</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => fetchRecords()} className="p-4 bg-white dark:bg-alco-surface border border-slate-200 dark:border-white/5 rounded-2xl text-slate-400 hover:text-[#5d5fef] transition-all shadow-sm">
                        <RefreshIcon />
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex-grow md:flex-none px-8 py-4 bg-[#5d5fef] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#5d5fef]/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-upload"></i> Nueva Versión
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="premium-card p-6 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">Categorías SGC</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id as any)}
                                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all group ${selectedCategory === cat.id ? 'bg-[#5d5fef]/10 text-[#5d5fef]' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <i className={`${cat.icon} text-sm ${selectedCategory === cat.id ? 'text-[#5d5fef]' : 'text-slate-400'}`}></i>
                                        <span className="text-[10px] font-black uppercase tracking-tight truncate">{cat.label}</span>
                                    </div>
                                    <span className={`hidden sm:inline text-[9px] font-bold px-2 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-[#5d5fef]/20 text-[#5d5fef]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                        {cat.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9 space-y-6">
                    <div className="relative group">
                        <input
                            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-alco-surface border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-sm text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#5d5fef] transition-all outline-none"
                            placeholder="Buscar por código (ej: PL-TH) o nombre de documento..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#5d5fef] transition-colors text-xl">
                            <SearchIcon />
                        </div>
                    </div>

                    <div className="premium-card overflow-hidden animate-fade-in shadow-xl">
                        {isLoading ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="animate-spin text-4xl text-[#5d5fef] flex justify-center"><RefreshIcon /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando Repositorio Insforge...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5">
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4">Documento</th>
                                            <th className="px-6 py-4">Versión</th>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Estatus</th>
                                            <th className="px-6 py-4 text-right">Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredDocs.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-300 uppercase italic">No se encontraron documentos</td></tr>
                                        ) : filteredDocs.map(doc => (
                                            <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold text-xs shadow-sm">PDF</div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase leading-none">{doc.name}</p>
                                                            <p className="text-[9px] font-bold text-sky-600 mt-1">{doc.code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{doc.version}</td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{doc.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${getDocStatus(doc) === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {getDocStatus(doc)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setDocToView(doc)} className="p-2 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-600 rounded-lg transition-all" title="Vista Previa"><ViewIcon /></button>
                                                        <button onClick={() => handleDownload(doc)} className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-all" title="Descargar"><DownloadIcon /></button>
                                                        <button onClick={() => handleConsultAI(doc)} className="p-2 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-violet-600 rounded-lg transition-all" title="Consultar con Copilot"><RobotIcon /></button>
                                                        <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 rounded-lg transition-all" title="Eliminar"><DeleteIcon /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Carga */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-alco-dark w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-scale-in">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-alco-surface/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Cargar Nuevo <span className="text-[#5d5fef]">Documento</span></h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Biblioteca SGC - Control ISO 9001</p>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="p-3 bg-white dark:bg-alco-surface rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-white/5 shadow-sm"><XCircleIcon /></button>
                        </div>
                        <form onSubmit={handleSaveDocument} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelStyles}>Nombre del Documento *</label>
                                    <input required value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} className={inputStyles} placeholder="EJ: MANUAL DE PROCEDIMIENTOS DE CALIDAD" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Código / Referencia *</label>
                                    <input required value={newDoc.code} onChange={e => setNewDoc({ ...newDoc, code: e.target.value })} className={inputStyles} placeholder="EJ: MC-ALCO-01" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Categoría *</label>
                                    <select value={newDoc.category} onChange={e => setNewDoc({ ...newDoc, category: e.target.value as any })} className={inputStyles}>
                                        <option value="Manuales">Manuales</option>
                                        <option value="Instructivos">Instructivos</option>
                                        <option value="Planos">Planos</option>
                                        <option value="Fichas Técnicas">Fichas Técnicas</option>
                                        <option value="Registros">Registros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyles}>Vencimiento (Opcional)</label>
                                    <input type="date" value={newDoc.validUntil} onChange={e => setNewDoc({ ...newDoc, validUntil: e.target.value })} className={inputStyles} />
                                </div>
                                <div>
                                    <label className={labelStyles}>Versión</label>
                                    <input required value={newDoc.version} onChange={e => setNewDoc({ ...newDoc, version: e.target.value })} className={inputStyles} placeholder="EJ: V1.0" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${tempFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-white/10 hover:border-[#5d5fef] hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                >
                                    {tempFile ? (
                                        <div className="space-y-2">
                                            <div className="text-3xl text-emerald-500 mb-2 flex justify-center"><ClipboardCheckIcon /></div>
                                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{tempFile.file.name}</p>
                                            <p className="text-[10px] font-bold text-emerald-600">{newDoc.size}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-3xl text-slate-300 flex justify-center"><FileAltIcon /></div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">Haz clic para seleccionar<br />un archivo PDF</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-[#5d5fef] text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#5d5fef]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                <SaveIcon /> Incorporar al Repositorio Oficial
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Vista Previa */}
            {docToView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-alco-dark w-full h-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-alco-surface/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{docToView.name}</h3>
                                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">{docToView.code} - VERSIÓN {docToView.version}</p>
                            </div>
                            <button onClick={() => setDocToView(null)} className="p-3 bg-white dark:bg-alco-surface rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-white/5 shadow-sm"><XCircleIcon /></button>
                        </div>
                        <div className="flex-1 bg-slate-200 dark:bg-[#1a1a24]">
                            <iframe src={docToView.url} className="w-full h-full border-none" title="Vista Previa Documento"></iframe>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-alco-surface/50 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
                            <button onClick={() => handleDownload(docToView)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><DownloadIcon /> Descargar Copia</button>
                            <button onClick={() => handleConsultAI(docToView)} className="px-6 py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><RobotIcon /> Consultar Copilot</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Library;

