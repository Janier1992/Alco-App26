
import React, { useState, useRef, useEffect } from 'react';
import type { Column, Task, Priority, Label, UserAvatar, Attachment } from '../types';
import Breadcrumbs from './Breadcrumbs';
import { MAINTENANCE_COLUMNS, AVAILABLE_LABELS, PROJECT_USERS, PaperclipIcon, PlusIcon, CameraIcon, DownloadIcon, WrenchIcon, ShieldCheckIcon, DropIcon } from '../constants';

// --- Helper Components (Shared Logic with Projects, adapted for Maintenance) ---

const CameraModal: React.FC<{ isOpen: boolean; onClose: () => void; onCapture: (imageSrc: string) => void; }> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("No se pudo acceder a la cámara. Asegúrese de haber otorgado los permisos necesarios.");
                onClose();
            }
        };

        if (isOpen) startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen, onClose]);

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                onCapture(dataUrl);
            }
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[1002] flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold text-sky-900 dark:text-sky-300">Capturar Evidencia</h2>
                </div>
                <div className="p-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-md"></video>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-700">
                    <button onClick={onClose} type="button" className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
                    <button onClick={handleCapture} type="button" className="px-4 py-2 bg-sky-700 text-white rounded-md hover:bg-sky-800 transition-colors flex items-center gap-2">
                        <CameraIcon /> Capturar
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttachmentPreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; attachment: Attachment | null }> = ({ isOpen, onClose, attachment }) => {
    if (!isOpen || !attachment) return null;
    const downloadAttachment = () => {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.setAttribute('download', attachment.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const renderPreview = () => {
        if (attachment.type.startsWith('image/')) return <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-[60vh] mx-auto rounded-md" />;
        if (attachment.type === 'application/pdf') return <iframe src={attachment.url} className="w-full h-[70vh] border-0 rounded-md" title={attachment.name}></iframe>
        return (
            <div className="p-4 h-48 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/50 rounded-lg border-2 border-dashed dark:border-slate-700 text-center">
                <i className="fas fa-file-alt text-4xl text-slate-400 dark:text-slate-500 mb-3"></i>
                <p className="text-slate-600 dark:text-slate-400 font-semibold">Vista Previa no Disponible</p>
            </div>
        );
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[1002] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-900 dark:text-sky-300 truncate pr-4">{attachment.name}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl flex-shrink-0">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">{renderPreview()}</div>
                <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md">Cerrar</button>
                    <button onClick={downloadAttachment} className="px-4 py-2 bg-sky-700 text-white rounded-md flex items-center gap-2"><DownloadIcon /> Descargar</button>
                </div>
            </div>
        </div>
    );
};

const DropdownManager: React.FC<{ label: string; items: (UserAvatar | Label)[]; selectedItems: (UserAvatar | Label)[]; availableItems: (UserAvatar | Label)[]; onAdd: (item: UserAvatar | Label) => void; onRemove: (itemId: string) => void; }> = ({ label, items, selectedItems, availableItems, onAdd, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isLabel = (item: any): item is Label => 'color' in item;
    const LABEL_STYLES: { [key: string]: string } = { 'blue': 'bg-blue-100 text-blue-800', 'purple': 'bg-purple-100 text-purple-800', 'green': 'bg-green-100 text-green-800', 'yellow': 'bg-yellow-100 text-yellow-800', 'red': 'bg-red-100 text-red-800', 'gray': 'bg-gray-100 text-gray-800' };

    return (
        <div>
            <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm">{label}</label>
            <div className="relative">
                <div className="flex flex-wrap gap-1 p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md min-h-[42px]">
                    {selectedItems.map(item => (
                        <span key={item.id} className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded ${isLabel(item) ? LABEL_STYLES[item.color] : 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'}`}>
                            {isLabel(item) ? item.name : item.initials}
                            <button onClick={() => onRemove(item.id)} className="font-bold">&times;</button>
                        </span>
                    ))}
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"><PlusIcon /></button>
                </div>
                {isOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {availableItems.map(item => (
                            <div key={item.id} onClick={() => { onAdd(item); setIsOpen(false); }} className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">
                                {isLabel(item) ? item.name : item.initials}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AttachmentsManager: React.FC<{ attachments: Attachment[]; onFilesAdd: (files: FileList) => void; onTakePhotoClick: () => void; onRemove: (attachmentId: string) => void; onView: (attachment: Attachment) => void; }> = ({ attachments, onFilesAdd, onRemove, onTakePhotoClick, onView }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="font-medium text-slate-600 dark:text-slate-400 block mb-2 text-sm">Evidencia y Archivos</label>
            <div className="space-y-2 mb-2">
                {attachments.map(att => (
                    <button type="button" key={att.id} onClick={() => onView(att)} className="w-full flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md text-left hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {att.type.startsWith('image/') ? <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover flex-shrink-0" /> : <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded flex items-center justify-center flex-shrink-0"><i className="fas fa-file-alt"></i></div>}
                            <div className="truncate"><p className="text-sm font-medium truncate">{att.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{(att.size / 1024 / 1024).toFixed(2)} MB</p></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onRemove(att.id); }} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 flex-shrink-0 z-10">&times;</button>
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full p-2 text-sm border-2 border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center justify-center gap-2"><PaperclipIcon /> Adjuntar Archivo</button>
                <button type="button" onClick={onTakePhotoClick} className="w-full p-2 text-sm border-2 border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center justify-center gap-2"><CameraIcon /> Tomar Foto</button>
            </div>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && onFilesAdd(e.target.files)} />
        </div>
    );
};

// --- Maintenance Specific Components ---

const MaintenanceTaskModal: React.FC<{ isOpen: boolean; onClose: () => void; task: Task | null; onSave: (task: Task) => void; onDelete: (taskId: string) => void; }> = ({ isOpen, onClose, task, onSave, onDelete }) => {
    const [editedTask, setEditedTask] = useState<Task | null>(task);
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [attachmentToView, setAttachmentToView] = useState<Attachment | null>(null);

    useEffect(() => { setEditedTask(task); }, [task]);
    if (!isOpen || !editedTask) return null;

    const handleSave = () => { onSave(editedTask); onClose(); };
    const handleFilesAdd = (files: FileList) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newAtt: Attachment = { id: `${Date.now()}`, name: file.name, size: file.size, type: file.type, url: e.target?.result as string };
                setEditedTask(prev => prev ? { ...prev, attachments: [...prev.attachments, newAtt] } : null);
            };
            reader.readAsDataURL(file);
        });
    };
    const handlePhotoCapture = (imageSrc: string) => {
        const newAtt: Attachment = { id: `capture-${Date.now()}`, name: `Evidencia-${Date.now()}.jpg`, type: 'image/jpeg', url: imageSrc, size: 50000 };
        setEditedTask(prev => prev ? { ...prev, attachments: [...prev.attachments, newAtt] } : null);
        setCameraOpen(false);
    };

    const inputStyles = "w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-md focus:ring-2 focus:ring-sky-500 outline-none transition-colors";
    const labelStyles = "font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm";
    const availableUsers = PROJECT_USERS.filter(u => !editedTask.assignedUsers.some(au => au.id === u.id));
    const availableLabels = AVAILABLE_LABELS.filter(l => !editedTask.labels.some(sl => sl.id === l.id));

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[1001] flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start p-4 border-b dark:border-slate-700">
                        <div className="w-full mr-4">
                            <label className="text-xs uppercase text-slate-400 font-bold mb-1 block">Título de la Orden</label>
                            <input type="text" value={editedTask.title} onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })} className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:ring-0 w-full p-1" />
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl">&times;</button>
                    </div>
                    <div className="p-4 md:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Specific Maintenance Fields */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className={labelStyles}>Activo / Equipo</label>
                                    <input type="text" value={editedTask.assetId || ''} onChange={(e) => setEditedTask({ ...editedTask, assetId: e.target.value })} className={inputStyles} placeholder="Ej: TRQ-01" />
                                </div>
                                <div>
                                    <label className={labelStyles}>Tipo de Mantenimiento</label>
                                    <select value={editedTask.type || 'Correctivo'} onChange={(e) => setEditedTask({ ...editedTask, type: e.target.value as any })} className={inputStyles}>
                                        <option value="Correctivo">Correctivo</option>
                                        <option value="Preventivo">Preventivo</option>
                                        <option value="Predictivo">Predictivo</option>
                                        <option value="Locativo">Locativo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelStyles}>Descripción Detallada</label>
                                <textarea value={editedTask.description} onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })} className={`${inputStyles} min-h-[120px]`} placeholder="Describa el problema, repuestos necesarios, etc."></textarea>
                            </div>

                            <AttachmentsManager
                                attachments={editedTask.attachments}
                                onFilesAdd={handleFilesAdd}
                                onRemove={(id) => setEditedTask(p => p ? { ...p, attachments: p.attachments.filter(a => a.id !== id) } : null)}
                                onTakePhotoClick={() => setCameraOpen(true)}
                                onView={(att) => { setAttachmentToView(att); setPreviewOpen(true); }}
                            />
                        </div>

                        {/* Sidebar Controls */}
                        <div className="space-y-5">
                            <div>
                                <label className={labelStyles}>Estado / Columna</label>
                                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    {MAINTENANCE_COLUMNS[Object.keys(MAINTENANCE_COLUMNS).find(key => MAINTENANCE_COLUMNS[key].tasks.some(t => t.id === editedTask.id)) || 'todo'].title}
                                </div>
                            </div>
                            <div>
                                <label className={labelStyles}>Prioridad</label>
                                <select value={editedTask.priority} onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Priority })} className={inputStyles}>
                                    <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelStyles}>Fecha Vencimiento</label>
                                <input type="date" value={editedTask.dueDate} onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })} className={`${inputStyles} dark:[color-scheme:dark]`} />
                            </div>
                            <DropdownManager
                                label="Técnicos Asignados"
                                items={PROJECT_USERS}
                                selectedItems={editedTask.assignedUsers}
                                availableItems={availableUsers}
                                onAdd={(i) => setEditedTask(p => p ? { ...p, assignedUsers: [...p.assignedUsers, i as UserAvatar] } : null)}
                                onRemove={(id) => setEditedTask(p => p ? { ...p, assignedUsers: p.assignedUsers.filter(u => u.id !== id) } : null)}
                            />
                            <DropdownManager
                                label="Etiquetas"
                                items={AVAILABLE_LABELS}
                                selectedItems={editedTask.labels}
                                availableItems={availableLabels}
                                onAdd={(i) => setEditedTask(p => p ? { ...p, labels: [...p.labels, i as Label] } : null)}
                                onRemove={(id) => setEditedTask(p => p ? { ...p, labels: p.labels.filter(l => l.id !== id) } : null)}
                            />
                            <button onClick={() => { onDelete(editedTask.id); onClose(); }} className="w-full px-4 py-2 mt-8 border border-red-500 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm">
                                Eliminar Orden
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 rounded-b-lg">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-sky-700 text-white rounded-md hover:bg-sky-800 transition-colors font-semibold shadow-sm">Guardar Cambios</button>
                    </div>
                </div>
            </div>
            <CameraModal isOpen={isCameraOpen} onClose={() => setCameraOpen(false)} onCapture={handlePhotoCapture} />
            <AttachmentPreviewModal isOpen={isPreviewOpen} onClose={() => setPreviewOpen(false)} attachment={attachmentToView} />
        </>
    );
};

const AddMaintenanceTaskModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (title: string, priority: Priority, type: string, assetId: string) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<Priority>('Media');
    const [type, setType] = useState('Correctivo');
    const [assetId, setAssetId] = useState('');

    if (!isOpen) return null;
    const handleSave = () => {
        if (title.trim()) {
            onSave(title, priority, type, assetId);
            setTitle(''); setPriority('Media'); setType('Correctivo'); setAssetId('');
            onClose();
        } else alert('El título es obligatorio.');
    };

    const inputStyles = "w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-md focus:ring-2 focus:ring-sky-500 outline-none";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[1001] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold text-sky-900 dark:text-sky-300">Nueva Orden de Trabajo</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm">Título de la OT</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyles} placeholder="Ej: Fuga en Troqueladora" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm">Activo / Equipo</label>
                            <input type="text" value={assetId} onChange={(e) => setAssetId(e.target.value)} className={inputStyles} placeholder="Ej: TRQ-01" />
                        </div>
                        <div>
                            <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm">Tipo</label>
                            <select value={type} onChange={(e) => setType(e.target.value)} className={inputStyles}>
                                <option>Correctivo</option><option>Preventivo</option><option>Predictivo</option><option>Locativo</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1 text-sm">Prioridad</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputStyles}>
                            <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-sky-700 text-white rounded-md font-semibold shadow-sm">Crear Orden</button>
                </div>
            </div>
        </div>
    );
};

const TaskCard: React.FC<{ task: Task; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void; columnId: string; onClick: () => void; }> = ({ task, onDragStart, columnId, onClick }) => {
    const PRIORITY_STYLES: { [key in Priority]: string } = { 'Baja': 'bg-green-100 text-green-800', 'Media': 'bg-yellow-100 text-yellow-800', 'Alta': 'bg-orange-100 text-orange-800', 'Crítica': 'bg-red-100 text-red-800' };
    const getTypeIcon = (t?: string) => {
        if (t === 'Preventivo') return <ShieldCheckIcon />;
        if (t === 'Locativo') return <DropIcon />;
        return <WrenchIcon />;
    }

    return (
        <div draggable onDragStart={(e) => onDragStart(e, task.id, columnId)} onClick={onClick} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all mb-3 group">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${PRIORITY_STYLES[task.priority]} border-transparent`}>{task.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 flex items-center gap-1 ${task.type === 'Correctivo' ? 'text-red-600' : 'text-blue-600'}`}>
                    {getTypeIcon(task.type)} {task.type}
                </span>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight">{task.title}</h4>
            {task.assetId && <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-mono bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded w-fit">ID: {task.assetId}</div>}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 text-slate-400">
                    {task.attachments.length > 0 && <span className="text-xs flex items-center gap-1"><PaperclipIcon /> {task.attachments.length}</span>}
                    <span className="text-xs flex items-center gap-1"><i className="far fa-calendar"></i> {task.dueDate}</span>
                </div>
                <div className="flex -space-x-2">
                    {task.assignedUsers.map(u => (
                        <div key={u.id} className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200" title={u.initials}>{u.initials}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{ column: Column; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void; onDragOver: (e: React.DragEvent<HTMLDivElement>) => void; onDrop: (e: React.DragEvent<HTMLDivElement>, destinationColumnId: string) => void; onViewTask: (task: Task) => void; onAddTask: (colId: string) => void }> = ({ column, onDragStart, onDragOver, onDrop, onViewTask, onAddTask }) => (
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 w-80 flex-shrink-0 flex flex-col max-h-[calc(100vh-200px)]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, column.id)}>
        <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="font-bold text-slate-700 dark:text-slate-200">{column.title}</h3>
            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">{column.tasks.length}</span>
        </div>
        <div className="overflow-y-auto flex-grow pr-1">
            {column.tasks.map(task => <TaskCard key={task.id} task={task} onDragStart={onDragStart} columnId={column.id} onClick={() => onViewTask(task)} />)}
        </div>
        <button onClick={() => onAddTask(column.id)} className="w-full mt-2 p-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center justify-center gap-2">
            <PlusIcon /> Añadir Orden
        </button>
    </div>
);

const Maintenance: React.FC = () => {
    const [columns, setColumns] = useState<{ [key: string]: Column }>(MAINTENANCE_COLUMNS);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isViewModalOpen, setViewModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newColumnId, setNewColumnId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => { e.dataTransfer.setData("taskId", taskId); e.dataTransfer.setData("sourceColumnId", sourceColumnId); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, destinationColumnId: string) => {
        const taskId = e.dataTransfer.getData("taskId");
        const sourceColumnId = e.dataTransfer.getData("sourceColumnId");
        if (sourceColumnId === destinationColumnId) return;
        let taskToMove: Task;
        const newColumns = { ...columns };
        const sourceColumn = newColumns[sourceColumnId as keyof typeof newColumns];
        const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            [taskToMove] = sourceColumn.tasks.splice(taskIndex, 1);
            newColumns[destinationColumnId as keyof typeof newColumns].tasks.push(taskToMove);
            setColumns(newColumns);
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            const idx = newColumns[colId].tasks.findIndex(t => t.id === updatedTask.id);
            if (idx !== -1) { newColumns[colId].tasks[idx] = updatedTask; break; }
        }
        setColumns(newColumns);
    };

    const handleDeleteTask = (taskId: string) => {
        const newColumns = { ...columns };
        for (const colId in newColumns) { newColumns[colId].tasks = newColumns[colId].tasks.filter(t => t.id !== taskId); }
        setColumns(newColumns);
    };

    const handleAddTask = (title: string, priority: Priority, type: string, assetId: string) => {
        if (!newColumnId) return;
        const newTask: Task = { id: Date.now().toString(), title, priority, type: type as any, assetId, description: '', dueDate: new Date().toISOString().split('T')[0], labels: [], assignedUsers: [], attachments: [] };
        const newColumns = { ...columns };
        newColumns[newColumnId].tasks.push(newTask);
        setColumns(newColumns);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
                <Breadcrumbs crumbs={[{ label: 'Mantenimiento', path: '/maintenance/board' }, { label: 'Tablero OTs' }]} />
                <div className="flex justify-between items-end mt-2">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Tablero de Mantenimiento</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gestión visual de órdenes de trabajo (Trello-Style).</p>
                    </div>
                </div>
            </div>
            <div className="flex-grow overflow-x-auto">
                <div className="flex gap-6 h-full min-w-max pb-4 px-1">
                    {(Object.values(columns) as Column[]).map((column) => (
                        <KanbanColumn key={column.id} column={column} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onViewTask={(t) => { setSelectedTask(t); setViewModalOpen(true); }} onAddTask={(id) => { setNewColumnId(id); setAddModalOpen(true); }} />
                    ))}
                </div>
            </div>
            <MaintenanceTaskModal isOpen={isViewModalOpen} onClose={() => setViewModalOpen(false)} task={selectedTask} onSave={handleUpdateTask} onDelete={handleDeleteTask} />
            <AddMaintenanceTaskModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleAddTask} />
        </div>
    );
};

export default Maintenance;
