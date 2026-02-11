
import React, { useState, useMemo, useRef } from 'react';
import type { Document, DocumentStatus, DocumentCategory } from '../types';
import {
    MOCK_DOCUMENTS, SearchIcon, PlusIcon, FolderOpenIcon,
    DownloadIcon, DeleteIcon, ViewIcon, RefreshIcon, SaveIcon,
    FileAltIcon, ClipboardCheckIcon, BookIcon, RobotIcon, XCircleIcon
} from '../constants';
import Breadcrumbs from './Breadcrumbs';
import { useNotification } from './NotificationSystem';
import { useAgent } from './AgentContext';

const Library: React.FC = () => {
    const { addNotification } = useNotification();
    const { setActiveDocument, toggleAgent } = useAgent();

    // Initial State with some mock docs that won't work with AI/Download but serve as placeholders
    const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
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
    const [tempFile, setTempFile] = useState<{ base64: string, mime: string, url: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Categories with counts
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

    // ISO Validity Check
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
            // Validate PDF
            if (file.type !== 'application/pdf') {
                addNotification({ type: 'error', title: 'FORMATO INVÁLIDO', message: 'Por favor sube solo archivos PDF.' });
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                const url = URL.createObjectURL(file);

                setTempFile({
                    base64,
                    mime: file.type,
                    url
                });

                setNewDoc(prev => ({
                    ...prev,
                    name: file.name.split('.')[0],
                    size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveDocument = (e: React.FormEvent) => {
        e.preventDefault();

        if (!tempFile) {
            addNotification({ type: 'error', title: 'FALTA ARCHIVO', message: 'Debes adjuntar un documento PDF.' });
            return;
        }

        const docToAdd: Document = {
            id: Date.now(),
            name: newDoc.name || 'Sin nombre',
            code: newDoc.code || `DOC-${Math.floor(Math.random() * 1000)}`,
            category: newDoc.category as DocumentCategory,
            date: new Date().toISOString().split('T')[0],
            validUntil: newDoc.validUntil,
            size: newDoc.size || '0.0 MB',
            version: newDoc.version || 'V1.0',
            status: 'Aprobado',
            author: newDoc.author || 'Usuario Sistema',
            base64: tempFile.base64,
            mime: tempFile.mime,
            url: tempFile.url
        };

        setDocuments(prev => [docToAdd, ...prev]);
        setIsUploadModalOpen(false);
        setTempFile(null); // Clear temp
        addNotification({
            type: 'success',
            title: 'DOCUMENTO CARGADO',
            message: `El archivo ${docToAdd.code} ha sido incorporado al SGC.`
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('¿Desea eliminar permanentemente este documento del repositorio oficial?')) {
            const doc = documents.find(d => d.id === id);
            if (doc?.url) URL.revokeObjectURL(doc.url); // Cleanup
            setDocuments(prev => prev.filter(d => d.id !== id));
            addNotification({ type: 'error', title: 'DOC ELIMINADO', message: 'La información ha sido purgada de la base de datos.' });
        }
    };

    const handleDownload = (doc: Document) => {
        if (!doc.url) {
            addNotification({ type: 'error', title: 'ERROR DESCARGA', message: 'Archivo no disponible (es un mock).' });
            return;
        }
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = `${doc.code}_${doc.name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification({ type: 'success', title: 'DESCARGA INICIADA', message: 'El documento se está descargando.' });
    };

    const handleConsultAI = (doc: Document) => {
        if (!doc.base64) {
            addNotification({ type: 'error', title: 'IA NO DISPONIBLE', message: 'Este documento no tiene contenido legible por la IA (mock).' });
            return;
        }
        setActiveDocument({
            name: doc.name,
            content: doc.base64,
            mime: doc.mime || 'application/pdf'
        });
        toggleAgent(true);
        addNotification({ type: 'info', title: 'COPILOT ACTIVADO', message: `Analizando ${doc.code} con IA...` });
    };

    const inputStyles = "w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none uppercase placeholder:text-slate-400";
    const labelStyles = "text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1 block ml-1";

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <Breadcrumbs crumbs={[{ label: 'INGENIERÍA Y SGC', path: '/dashboard' }, { label: 'GESTIÓN DOCUMENTAL' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Explorador de <span className="text-sky-600">Documentos</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">Control de información documentada ISO 9001:2015</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.location.reload()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-sky-600 transition-colors shadow-sm">
                        <RefreshIcon />
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="px-8 py-3 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-sky-600/20 hover:scale-105 flex items-center gap-2"
                    >
                        <i className="fas fa-upload"></i> Nueva Versión
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar - Categorías */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">Categorías SGC</h3>
                        <div className="space-y-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id as any)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group ${selectedCategory === cat.id ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <i className={`${cat.icon} text-sm ${selectedCategory === cat.id ? 'text-sky-600' : 'text-amber-500'}`}></i>
                                        <span className="text-xs font-black uppercase tracking-tight">{cat.label}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        {cat.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Listado de Documentos */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="relative group">
                        <input
                            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-none rounded-[2.5rem] shadow-sm text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all outline-none"
                            placeholder="Buscar por código (ej: PL-TH) o nombre de documento..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-sky-500 transition-colors text-xl">
                            <SearchIcon />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b dark:border-slate-700">
                                    <tr>
                                        <th className="px-8 py-6">Código / Documento</th>
                                        <th className="px-8 py-6">Vigencia</th>
                                        <th className="px-8 py-6 text-center">Estado ISO</th>
                                        <th className="px-8 py-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredDocs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="opacity-20">
                                                    <i className="fas fa-folder-open text-5xl mb-4"></i>
                                                    <p className="font-black uppercase tracking-widest text-xs">Sin documentos encontrados</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDocs.map(doc => {
                                            const isoStatus = getDocStatus(doc);
                                            return (
                                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500">
                                                                <i className="fas fa-file-pdf text-xl"></i>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs font-black text-sky-600 uppercase">{doc.code}</span>
                                                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{doc.version}</span>
                                                                </div>
                                                                <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{doc.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className={`text-[11px] font-black uppercase ${isoStatus === 'CADUCADO' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {doc.validUntil || 'Sin vencimiento'}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Revisión Anual</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isoStatus === 'Aprobado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            isoStatus === 'CADUCADO' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                'bg-amber-50 text-amber-700 border-amber-100'
                                                            }`}>
                                                            {isoStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleConsultAI(doc)}
                                                                className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all hover:scale-110 shadow-sm border border-indigo-100 dark:border-indigo-800 group/ai"
                                                                title="Consultar con IA"
                                                            >
                                                                <RobotIcon />
                                                            </button>
                                                            <button
                                                                onClick={() => setDocToView(doc)}
                                                                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all hover:scale-110 shadow-sm border border-slate-200 dark:border-slate-700"
                                                                title="Ver Documento"
                                                            >
                                                                <ViewIcon />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(doc)}
                                                                className="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl transition-all hover:scale-110 shadow-sm border border-sky-100 dark:border-sky-800"
                                                                title="Descargar PDF"
                                                            >
                                                                <DownloadIcon />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(doc.id)}
                                                                className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl transition-all hover:scale-110 shadow-sm border border-rose-100 dark:border-rose-800"
                                                                title="Eliminar Documento"
                                                            >
                                                                <DeleteIcon />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE CARGA */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 transition-all">
                    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] max-w-2xl w-full p-12 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full"></div>
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Incorporar Información <span className="text-sky-600">Documentada</span></h2>
                                <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">Protocolo de Control de Información ISO 9001</p>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                        </div>

                        <form onSubmit={handleSaveDocument} className="space-y-6 relative z-10">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 text-center hover:border-sky-500/50 transition-all cursor-pointer group bg-slate-50/50 dark:bg-white/5"
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
                                <div className="size-16 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center text-sky-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <i className="fas fa-cloud-upload-alt text-2xl"></i>
                                </div>
                                <p className="text-sm font-black text-slate-800 dark:text-white uppercase">
                                    {tempFile ? 'Archivo seleccionado correctamente' : 'Seleccione o arrastre el archivo PDF'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Solo archivos PDF hasta 50MB</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelStyles}>Nombre Descriptivo</label>
                                    <input required type="text" className={inputStyles} value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} placeholder="EJ: MANUAL DE PINTURA" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Código SGC</label>
                                    <input required type="text" className={inputStyles} value={newDoc.code} onChange={e => setNewDoc({ ...newDoc, code: e.target.value })} placeholder="EJ: MC-ALCO-01" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Categoría</label>
                                    <select className={inputStyles} value={newDoc.category} onChange={e => setNewDoc({ ...newDoc, category: e.target.value as any })}>
                                        <option value="Manuales">Manuales</option>
                                        <option value="Instructivos">Instructivos</option>
                                        <option value="Planos">Planos</option>
                                        <option value="Fichas Técnicas">Fichas Técnicas</option>
                                        <option value="Registros">Registros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelStyles}>Vigencia Técnica</label>
                                    <input required type="date" className={`${inputStyles} dark:[color-scheme:dark]`} value={newDoc.validUntil} onChange={e => setNewDoc({ ...newDoc, validUntil: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelStyles}>Versión</label>
                                    <input required type="text" className={inputStyles} value={newDoc.version} onChange={e => setNewDoc({ ...newDoc, version: e.target.value })} placeholder="EJ: V3.2" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Autor / Responsable</label>
                                    <input required type="text" className={inputStyles} value={newDoc.author} onChange={e => setNewDoc({ ...newDoc, author: e.target.value })} placeholder="NOMBRE DEL INGENIERO" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                                <SaveIcon /> Validar y Guardar Documento
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZACIÓN */}
            {docToView && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 transition-all">
                    <div className="bg-white dark:bg-slate-900 w-full h-full sm:max-w-6xl sm:h-[90vh] rounded-none sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative border-none sm:border border-slate-700">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-black text-slate-800 dark:text-white uppercase truncate pr-4">{docToView.code} - {docToView.name}</h3>
                            <button onClick={() => setDocToView(null)} className="text-slate-400 hover:text-rose-500 text-2xl transition-colors p-2">
                                <XCircleIcon />
                            </button>
                        </div>
                        <div className="flex-grow bg-slate-100 dark:bg-black/50 p-0 sm:p-4">
                            {docToView.url ? (
                                <iframe src={`${docToView.url}#view=FitH`} className="w-full h-full sm:rounded-xl border-none sm:border border-slate-200 dark:border-slate-800" title="PDF Viewer" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <p className="font-bold">Vista previa no disponible para documentos de prueba.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Library;

