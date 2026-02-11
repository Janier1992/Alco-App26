
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Column, Task, Priority, Attachment, TaskComment, UserAvatar, Label, ChecklistItem } from '../types';
import Breadcrumbs from './Breadcrumbs';
import {
    SearchIcon, PlusIcon, DownloadIcon, SaveIcon, PaperclipIcon,
    UserCircleIcon, SendIcon, TrashIcon, PROJECT_USERS, AVAILABLE_LABELS,
    EditIcon, ChevronRightIcon, CalendarIcon, CheckCircleIcon, Bars3Icon,
    BellIcon, RobotIcon, FolderOpenIcon
} from '../constants';
import { useNotification } from './NotificationSystem';

// Componente de Popover Reutilizable
const Popover: React.FC<{
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    anchorEl: React.RefObject<HTMLElement | null>;
}> = ({ title, onClose, children, anchorEl }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl.current && !anchorEl.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorEl]);

    return (
        <div ref={popoverRef} className="absolute z-[2500] w-72 bg-white dark:bg-[#1a1a24] shadow-2xl rounded-2xl border border-slate-200 dark:border-white/10 p-4 animate-fade-in mt-2">
            <div className="flex justify-between items-center mb-4 border-b dark:border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
                <button onClick={onClose} className="text-slate-400 hover:text-rose-500">&times;</button>
            </div>
            {children}
        </div>
    );
};

// Componente de Tarjeta Kanban
const ProjectCard: React.FC<{
    task: Task;
    columnId: string;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void;
}> = ({ task, columnId, onClick, onDragStart }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id, columnId)}
            onClick={onClick}
            className="bg-white dark:bg-[#1a1a24] rounded-xl p-3 shadow-sm border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/30 transition-all group cursor-pointer mb-3"
        >
            <div className="flex flex-wrap gap-1 mb-2">
                {task.labels.map(label => (
                    <div
                        key={label.id}
                        className="h-2 w-10 rounded-full transition-all group-hover:w-12"
                        style={{ backgroundColor: label.color === 'red' ? '#ef4444' : label.color === 'blue' ? '#0ea5e9' : label.color === 'orange' ? '#f59e0b' : '#64748b' }}
                    />
                ))}
            </div>

            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug mb-4 group-hover:text-sky-600 transition-colors">
                {task.title}
            </p>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {task.dueDate && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">
                            <CalendarIcon className="scale-75" />
                            {task.dueDate.split('-').slice(1).reverse().join('/')}
                        </div>
                    )}
                    <div className="flex gap-2 text-slate-400">
                        {task.attachments.length > 0 && (
                            <span className="text-[10px] font-bold flex items-center gap-1">
                                <PaperclipIcon className="scale-75" /> {task.attachments.length}
                            </span>
                        )}
                        {task.checklist && task.checklist.length > 0 && (
                            <span className="text-[10px] font-bold flex items-center gap-1">
                                <CheckCircleIcon className="scale-75" /> {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex -space-x-2">
                    {task.assignedUsers.map(user => (
                        <div key={user.id} className="size-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-[#1a1a24] flex items-center justify-center text-[9px] font-black text-slate-600 dark:text-slate-300 shadow-sm" title={user.initials}>
                            {user.initials}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Modal para crear nuevo requerimiento
const CreateTaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, priority: Priority, description: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<Priority>('Media');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(title, priority, description);
        setTitle('');
        setPriority('Media');
        setDescription('');
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-sky-500/10 outline-none transition-all";
    const labelStyles = "text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1";

    return (
        <div className="fixed inset-0 z-[2500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0b0b14] rounded-3xl w-full max-w-2xl my-auto shadow-2xl border border-slate-200 dark:border-white/5 animate-fade-in-up overflow-hidden">
                <div className="p-10 border-b dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
                            <PlusIcon />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Nuevo Requerimiento</h2>
                    </div>
                    <button onClick={onClose} className="size-10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 text-2xl transition-all flex items-center justify-center">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div>
                        <label className={labelStyles}>Título del Proyecto / Requerimiento</label>
                        <input
                            required
                            autoFocus
                            className={inputStyles}
                            placeholder="Ej: Análisis estructural Fachada Norte..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelStyles}>Prioridad Crítica</label>
                            <select
                                className={inputStyles}
                                value={priority}
                                onChange={e => setPriority(e.target.value as Priority)}
                            >
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                                <option value="Crítica">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelStyles}>Fecha Sugerida</label>
                            <input
                                type="date"
                                className={inputStyles}
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelStyles}>Descripción Inicial</label>
                        <textarea
                            className={`${inputStyles} min-h-[120px] resize-none`}
                            placeholder="Breve relato técnico sobre la necesidad del proyecto..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all">Cancelar</button>
                        <button type="submit" className="flex-[2] py-5 bg-sky-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/30 hover:brightness-110 active:scale-95 transition-all">Crear Registro Técnico</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Projects: React.FC = () => {
    const { addNotification } = useNotification();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // UI States for Popovers
    const [activePopover, setActivePopover] = useState<'labels' | 'members' | 'dates' | 'checklist' | 'move' | null>(null);
    const popoverAnchorRefs = {
        labels: useRef<HTMLButtonElement>(null),
        members: useRef<HTMLButtonElement>(null),
        dates: useRef<HTMLButtonElement>(null),
        checklist: useRef<HTMLButtonElement>(null),
        move: useRef<HTMLButtonElement>(null)
    };

    // States for inputs inside the modal
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState('');
    const [commentText, setCommentText] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');

    const [columns, setColumns] = useState<{ [key: string]: Column }>({
        'identified': {
            id: 'identified',
            title: 'Identificadas',
            tasks: [
                { id: 'NC-24-089', title: 'CATALOGO PERFILERIA 22/06/2022', priority: 'Crítica', description: 'ADJUNTO CATALOGO DE PERFILERIA COMPARTIDO POR DISEÑO PARA VALIDACIÓN DE ESPESORES.', dueDate: '2024-08-10', labels: [{ id: '1', name: 'CALIDAD', color: 'red' }], assignedUsers: [{ id: 'u1', initials: 'JP' }, { id: 'u4', initials: 'JM' }], attachments: [{ id: 'a1', name: 'CATALOGO PERFILERIA.PDF', size: 1024, type: 'application/pdf', url: '#' }], comments: [{ id: 'c1', author: 'Edwin Bedoya', text: '@board favor revisar las nuevas cotas de pintura', date: '22 jun 2022' }], checklist: [{ id: 'cl1', text: 'Verificar espesor pintura', completed: true }, { id: 'cl2', text: 'Validar con ingeniería', completed: false }] },
                { id: 'NC-24-092', title: 'PLANOS FACHADA TORRE A', priority: 'Alta', description: 'Revision final de despieces antes del envío a planta 2.', dueDate: '2024-08-12', labels: [{ id: '2', name: 'PLANTA', color: 'blue' }], assignedUsers: [{ id: 'u2', initials: 'MR' }], attachments: [], comments: [], checklist: [] }
            ]
        },
        'analysis': {
            id: 'analysis',
            title: 'Análisis (RCA)',
            tasks: [
                { id: 'NC-24-075', title: 'FALLO SOFTWARE ETIQUETADO L4.', priority: 'Media', description: 'Investigando logs de sistema para detectar por qué se pierden las órdenes de producción.', dueDate: '2024-08-05', labels: [{ id: '3', name: 'URGENTE', color: 'orange' }], assignedUsers: [{ id: 'u3', initials: 'CR' }], attachments: [], comments: [] }
            ]
        },
        'plan': {
            id: 'plan',
            title: 'Plan de Acción',
            tasks: [
                { id: 'CAPA-24-012', title: 'RE-ENTRENAMIENTO PERSONAL SALA LIMPIA.', priority: 'Alta', description: 'Capacitación obligatoria tras hallazgo en auditoría cruzada de Q2.', dueDate: '2024-09-01', labels: [{ id: '1', name: 'CALIDAD', color: 'red' }], assignedUsers: [{ id: 'u1', initials: 'JP' }], attachments: [], comments: [] }
            ]
        },
        'verification': {
            id: 'verification',
            title: 'Verificación',
            tasks: []
        }
    });

    const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.setData("sourceColId", sourceColId);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, destColId: string) => {
        const taskId = e.dataTransfer.getData("taskId");
        const sourceColId = e.dataTransfer.getData("sourceColId");
        moveTask(taskId, sourceColId, destColId);
    };

    const moveTask = (taskId: string, sourceColId: string, destColId: string) => {
        if (sourceColId === destColId) return;
        const sourceCol = columns[sourceColId];
        const destCol = columns[destColId];
        const taskToMove = sourceCol.tasks.find(t => t.id === taskId);

        if (taskToMove) {
            setColumns({
                ...columns,
                [sourceColId]: { ...sourceCol, tasks: sourceCol.tasks.filter(t => t.id !== taskId) },
                [destColId]: { ...destCol, tasks: [...destCol.tasks, taskToMove] }
            });
            addNotification({ type: 'info', title: 'Tarea Movida', message: `Ubicación actualizada: ${destCol.title}` });
            if (selectedTask?.id === taskId) {
                setActivePopover(null);
            }
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            const index = newColumns[colId].tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                newColumns[colId].tasks[index] = updatedTask;
                break;
            }
        }
        setColumns(newColumns);
        setSelectedTask(updatedTask);
    };

    // --- Actions Panel Functions ---

    const handleArchive = () => {
        if (!selectedTask) return;
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            newColumns[colId].tasks = newColumns[colId].tasks.filter(t => t.id !== selectedTask.id);
        }
        setColumns(newColumns);
        setSelectedTask(null);
        addNotification({ type: 'error', title: 'Registro Archivado', message: 'La tarea ha sido movida al archivo histórico del SGC.' });
    };

    const handleCopy = () => {
        if (!selectedTask) return;
        const newTask = { ...selectedTask, id: `COPY-${Date.now()}`, title: `${selectedTask.title} (Copia)` };
        const colId = Object.keys(columns).find(k => columns[k].tasks.some(t => t.id === selectedTask.id)) || 'identified';
        setColumns({
            ...columns,
            [colId]: { ...columns[colId], tasks: [...columns[colId].tasks, newTask] }
        });
        addNotification({ type: 'success', title: 'Tarea Duplicada', message: 'Se ha creado una copia técnica del registro.' });
    };

    const handleShare = () => {
        if (!selectedTask) return;
        navigator.clipboard.writeText(`${window.location.origin}/#/ops/projects?taskId=${selectedTask.id}`);
        addNotification({ type: 'info', title: 'Enlace Copiado', message: 'Trazabilidad digital disponible en el portapapeles.' });
    };

    const handlePostComment = () => {
        if (!selectedTask || !commentText.trim()) return;
        const newComment: TaskComment = {
            id: Date.now().toString(),
            author: 'Janier Mosquera',
            text: commentText,
            date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        handleUpdateTask({
            ...selectedTask,
            comments: [...(selectedTask.comments || []), newComment]
        });
        setCommentText('');
    };

    const handleSaveDesc = () => {
        if (!selectedTask) return;
        handleUpdateTask({ ...selectedTask, description: tempDesc });
        setIsEditingDesc(false);
    };

    const handleSaveNewTask = (title: string, priority: Priority, description: string) => {
        const newTask: Task = {
            id: `TASK-${Date.now()}`,
            title,
            priority,
            description,
            dueDate: new Date().toISOString().split('T')[0],
            labels: [],
            assignedUsers: [],
            attachments: [],
            comments: [],
            checklist: []
        };

        setColumns({
            ...columns,
            'identified': {
                ...columns['identified'],
                tasks: [...columns['identified'].tasks, newTask]
            }
        });

        setIsCreateModalOpen(false);
        addNotification({
            type: 'success',
            title: 'REQUERIMIENTO CREADO',
            message: `El registro "${title}" ha sido incorporado a la lista de Identificadas.`
        });
    };

    // --- Checklist Functions ---

    const handleAddChecklistItem = () => {
        if (!selectedTask || !newChecklistItem.trim()) return;
        const newItem: ChecklistItem = { id: Date.now().toString(), text: newChecklistItem, completed: false };
        handleUpdateTask({ ...selectedTask, checklist: [...(selectedTask.checklist || []), newItem] });
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id: string) => {
        if (!selectedTask) return;
        const newChecklist = selectedTask.checklist?.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        handleUpdateTask({ ...selectedTask, checklist: newChecklist });
    };

    // --- Popover Toggles ---
    const togglePopover = (type: typeof activePopover) => {
        setActivePopover(activePopover === type ? null : type);
    };

    const currentColumnId = useMemo(() => {
        if (!selectedTask) return '';
        return Object.keys(columns).find(k => columns[k].tasks.some(t => t.id === selectedTask.id)) || '';
    }, [selectedTask, columns]);

    const currentColumnTitle = useMemo(() => {
        return columns[currentColumnId]?.title || '';
    }, [currentColumnId, columns]);

    return (
        <div className="flex flex-col h-full gap-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-2">
                <Breadcrumbs crumbs={[{ label: 'Operaciones', path: '/dashboard' }, { label: 'Gestión de Proyectos' }]} />
                <div className="flex flex-wrap justify-between items-center gap-6">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                        Tablero <span className="text-sky-600">Estratégico Alco</span>
                    </h1>
                    <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-8 h-14 bg-sky-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-sky-600/20 active:scale-95">
                        <PlusIcon /> Nuevo Requerimiento
                    </button>
                </div>
            </div>

            <div className="flex-grow flex gap-6 overflow-x-auto pb-10 custom-scrollbar px-2 items-start">
                {(Object.values(columns) as Column[]).map(col => (
                    <div
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className="flex flex-col gap-4 min-w-[320px] max-w-[320px] bg-slate-100/50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm h-fit"
                    >
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h3 className="font-black text-[12px] uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
                                {col.title}
                            </h3>
                            <span className="text-[10px] font-black bg-white dark:bg-white/10 px-2 py-0.5 rounded-lg text-slate-400">{col.tasks.length}</span>
                        </div>

                        <div className="flex flex-col min-h-[200px]">
                            {col.tasks.map(task => (
                                <ProjectCard
                                    key={task.id}
                                    task={task}
                                    columnId={col.id}
                                    onDragStart={handleDragStart}
                                    onClick={() => {
                                        setSelectedTask(task);
                                        setTempDesc(task.description);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL CREAR REQUERIMIENTO */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveNewTask}
            />

            {/* MODAL DETALLE DE TARJETA (ALCO PREMIUM) */}
            {selectedTask && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#f4f5f7] dark:bg-[#0b0b14] rounded-3xl w-full max-w-6xl my-auto shadow-2xl border border-slate-200 dark:border-white/5 animate-fade-in-up overflow-hidden">

                        {/* Header del Modal */}
                        <div className="p-10 pb-4 bg-white dark:bg-[#1a1a24] border-b dark:border-white/5">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-start gap-5">
                                    <div className="mt-2"><i className="fas fa-id-card text-slate-400 dark:text-slate-500 text-2xl"></i></div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{selectedTask.title}</h2>
                                        <p className="text-sm text-slate-500 font-bold">
                                            en la lista <span className="underline cursor-pointer hover:text-sky-600 transition-colors uppercase tracking-widest text-[10px]">{currentColumnTitle}</span>
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedTask(null); setActivePopover(null); }} className="size-12 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 text-3xl transition-all flex items-center justify-center">&times;</button>
                            </div>

                            {/* Acciones Rápidas Superiores */}
                            <div className="flex flex-wrap gap-2 ml-12 relative">
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"><PlusIcon className="scale-75" /> Añadir</button>

                                <div className="relative">
                                    <button
                                        ref={popoverAnchorRefs.labels}
                                        onClick={() => togglePopover('labels')}
                                        className={`flex items-center gap-2 px-5 py-2.5 ${activePopover === 'labels' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'} border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm`}
                                    >
                                        <i className="fas fa-tags scale-75"></i> Etiquetas
                                    </button>
                                    {activePopover === 'labels' && (
                                        <Popover title="Etiquetas Técnicas" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.labels}>
                                            <div className="space-y-2">
                                                {AVAILABLE_LABELS.map(label => {
                                                    const isSelected = selectedTask.labels.some(l => l.id === label.id);
                                                    return (
                                                        <button
                                                            key={label.id}
                                                            onClick={() => {
                                                                const newLabels = isSelected
                                                                    ? selectedTask.labels.filter(l => l.id !== label.id)
                                                                    : [...selectedTask.labels, label];
                                                                handleUpdateTask({ ...selectedTask, labels: newLabels });
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 text-sky-700' : 'bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-500'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-3 rounded-full" style={{ backgroundColor: label.color }} />
                                                                {label.name}
                                                            </div>
                                                            {isSelected && <i className="fas fa-check"></i>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Popover>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        ref={popoverAnchorRefs.dates}
                                        onClick={() => togglePopover('dates')}
                                        className={`flex items-center gap-2 px-5 py-2.5 ${activePopover === 'dates' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'} border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm`}
                                    >
                                        <i className="far fa-clock scale-75"></i> Fechas
                                    </button>
                                    {activePopover === 'dates' && (
                                        <Popover title="Fecha de Vencimiento" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.dates}>
                                            <input
                                                type="date"
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none uppercase"
                                                value={selectedTask.dueDate}
                                                onChange={e => handleUpdateTask({ ...selectedTask, dueDate: e.target.value })}
                                            />
                                        </Popover>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        ref={popoverAnchorRefs.checklist}
                                        onClick={() => togglePopover('checklist')}
                                        className={`flex items-center gap-2 px-5 py-2.5 ${activePopover === 'checklist' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'} border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm`}
                                    >
                                        <i className="far fa-check-square scale-75"></i> Checklist
                                    </button>
                                    {activePopover === 'checklist' && (
                                        <Popover title="Nueva Lista de Control" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.checklist}>
                                            <div className="space-y-3">
                                                <input
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none border dark:border-white/5"
                                                    placeholder="Título de la lista..."
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!selectedTask.checklist) handleUpdateTask({ ...selectedTask, checklist: [] });
                                                        setActivePopover(null);
                                                    }}
                                                    className="w-full py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Crear Lista
                                                </button>
                                            </div>
                                        </Popover>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        ref={popoverAnchorRefs.members}
                                        onClick={() => togglePopover('members')}
                                        className={`flex items-center gap-2 px-5 py-2.5 ${activePopover === 'members' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'} border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm`}
                                    >
                                        <i className="far fa-user scale-75"></i> Miembros
                                    </button>
                                    {activePopover === 'members' && (
                                        <Popover title="Miembros Técnicos" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.members}>
                                            <div className="space-y-2">
                                                {PROJECT_USERS.map(user => {
                                                    const isAssigned = selectedTask.assignedUsers.some(u => u.id === user.id);
                                                    return (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => {
                                                                const newUsers = isAssigned
                                                                    ? selectedTask.assignedUsers.filter(u => u.id !== user.id)
                                                                    : [...selectedTask.assignedUsers, user];
                                                                handleUpdateTask({ ...selectedTask, assignedUsers: newUsers });
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isAssigned ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 text-sky-700' : 'bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-500'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[9px]">{user.initials}</div>
                                                                Miembro: {user.initials}
                                                            </div>
                                                            {isAssigned && <i className="fas fa-check"></i>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Popover>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-y-auto max-h-[70vh] custom-scrollbar">

                            {/* Columna de Contenido Principal */}
                            <div className="lg:col-span-8 space-y-12">

                                {/* DESCRIPCIÓN */}
                                <section>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-5 text-slate-800 dark:text-white">
                                            <i className="fas fa-align-left text-xl text-slate-400"></i>
                                            <h4 className="text-lg font-black uppercase tracking-tighter">Descripción</h4>
                                        </div>
                                        {!isEditingDesc && (
                                            <button onClick={() => setIsEditingDesc(true)} className="px-6 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all">Editar</button>
                                        )}
                                    </div>
                                    <div className="ml-10">
                                        {isEditingDesc ? (
                                            <div className="space-y-3">
                                                <textarea
                                                    autoFocus
                                                    value={tempDesc}
                                                    onChange={e => setTempDesc(e.target.value)}
                                                    className="w-full p-6 bg-white dark:bg-[#1a1a24] border-2 border-sky-500/30 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-sky-500/10 outline-none shadow-inner"
                                                    rows={5}
                                                    placeholder="Añada un relato detallado del requerimiento..."
                                                />
                                                <div className="flex gap-3">
                                                    <button onClick={handleSaveDesc} className="px-6 py-2.5 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-600/20 active:scale-95 transition-all">Guardar</button>
                                                    <button onClick={() => { setIsEditingDesc(false); setTempDesc(selectedTask.description); }} className="px-6 py-2.5 bg-slate-200 dark:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-300">Cancelar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed bg-white dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm min-h-[40px] cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setIsEditingDesc(true)}>
                                                {selectedTask.description || <span className="opacity-40 italic">Haga clic para añadir una descripción técnica más detallada...</span>}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* CHECKLIST (Implementación Real) */}
                                {(selectedTask.checklist || []).length > 0 && (
                                    <section>
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-5 text-slate-800 dark:text-white">
                                                <i className="far fa-check-square text-xl text-slate-400"></i>
                                                <h4 className="text-lg font-black uppercase tracking-tighter">Checklist</h4>
                                            </div>
                                            <button onClick={() => handleUpdateTask({ ...selectedTask, checklist: [] })} className="px-6 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all">Eliminar</button>
                                        </div>
                                        <div className="ml-10 space-y-4">
                                            <div className="flex items-center gap-4 mb-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {Math.round((selectedTask.checklist?.filter(i => i.completed).length || 0) / (selectedTask.checklist?.length || 1) * 100)}%
                                                </span>
                                                <div className="flex-grow h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(selectedTask.checklist?.filter(i => i.completed).length || 0) / (selectedTask.checklist?.length || 1) * 100}%` }}></div>
                                                </div>
                                            </div>
                                            {selectedTask.checklist?.map(item => (
                                                <div key={item.id} className="flex items-center gap-4 group">
                                                    <button
                                                        onClick={() => toggleChecklistItem(item.id)}
                                                        className={`size-5 rounded border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700 hover:border-sky-500'}`}
                                                    >
                                                        {item.completed && <i className="fas fa-check text-[10px]"></i>}
                                                    </button>
                                                    <span className={`text-sm font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{item.text}</span>
                                                    <button
                                                        onClick={() => handleUpdateTask({ ...selectedTask, checklist: selectedTask.checklist?.filter(i => i.id !== item.id) })}
                                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all ml-auto"
                                                    >
                                                        <TrashIcon className="scale-75" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex gap-3 mt-4">
                                                <input
                                                    className="flex-grow p-3 bg-white dark:bg-slate-900 border dark:border-white/5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                                                    placeholder="Añadir un elemento..."
                                                    value={newChecklistItem}
                                                    onChange={e => setNewChecklistItem(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                                                />
                                                <button onClick={handleAddChecklistItem} className="px-6 py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Añadir</button>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ADJUNTOS */}
                                <section>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-5 text-slate-800 dark:text-white">
                                            <i className="fas fa-paperclip text-xl text-slate-400"></i>
                                            <h4 className="text-lg font-black uppercase tracking-tighter">Adjuntos</h4>
                                        </div>
                                        <button className="px-6 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all">Añadir</button>
                                    </div>

                                    <div className="ml-10 space-y-4">
                                        {selectedTask.attachments.length > 0 ? (
                                            selectedTask.attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-6 group bg-white dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-sky-500/30 transition-all">
                                                    <div className="w-32 h-24 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-white dark:border-white/10 shadow-md overflow-hidden flex-shrink-0">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter underline decoration-2 underline-offset-4 decoration-sky-500">SGC ARCHIVO</span>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate tracking-tight">{att.name}</h5>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Trazabilidad Técnica • {Math.round(att.size / 1024)} KB</p>
                                                        <div className="flex gap-5 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <button className="hover:text-sky-600 flex items-center gap-1"><i className="fas fa-external-link-alt text-[9px]"></i> Abrir</button>
                                                            <button
                                                                onClick={() => handleUpdateTask({ ...selectedTask, attachments: selectedTask.attachments.filter(a => a.id !== att.id) })}
                                                                className="hover:text-rose-500 flex items-center gap-1"
                                                            >
                                                                <TrashIcon className="scale-75" /> Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-14 border-4 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-center opacity-30 flex flex-col items-center gap-3">
                                                <PaperclipIcon className="text-4xl" />
                                                <p className="text-xs font-black uppercase tracking-widest">Sin archivos adjuntos en el registro</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* COMENTARIOS Y ACTIVIDAD */}
                                <section className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-5 text-slate-800 dark:text-white">
                                            <i className="far fa-list-alt text-xl text-slate-400"></i>
                                            <h4 className="text-lg font-black uppercase tracking-tighter">Comentarios y Actividad</h4>
                                        </div>
                                        <button className="px-6 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all">Mostrar detalles</button>
                                    </div>

                                    <div className="flex gap-5">
                                        <div className="size-11 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-lg shadow-rose-600/30">JM</div>
                                        <div className="flex-grow space-y-3">
                                            <textarea
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                className="w-full p-4 bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-sky-500/10 shadow-sm transition-all outline-none resize-none"
                                                rows={2}
                                                placeholder="Escribe un comentario..."
                                            />
                                            {commentText.trim() && (
                                                <button onClick={handlePostComment} className="px-8 py-2 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-600/20 active:scale-95 transition-all">Publicar</button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-8 ml-10">
                                        {selectedTask.comments?.slice().reverse().map(comment => (
                                            <div key={comment.id} className="flex gap-5 animate-fade-in">
                                                <div className="size-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                                                    {comment.author.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="space-y-2 flex-grow">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{comment.author}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{comment.date}</span>
                                                    </div>
                                                    <div className="bg-white dark:bg-white/[0.03] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                        {comment.text}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Barra Lateral de Acciones (Sidebar) */}
                            <div className="lg:col-span-4 space-y-10">
                                <section className="space-y-3">
                                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-5 px-1">Acciones de Tarjeta</h4>
                                    <div className="grid grid-cols-1 gap-2">

                                        <div className="relative">
                                            <button
                                                ref={popoverAnchorRefs.move}
                                                onClick={() => togglePopover('move')}
                                                className={`w-full flex items-center gap-4 px-5 py-3.5 ${activePopover === 'move' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'} rounded-xl text-[11px] font-black transition-all uppercase tracking-widest border border-transparent active:scale-95 group`}
                                            >
                                                <i className={`fas fa-arrow-right ${activePopover === 'move' ? 'text-white' : 'text-slate-400 group-hover:text-sky-600'} transition-colors`}></i> Mover
                                            </button>
                                            {activePopover === 'move' && (
                                                <Popover title="Mover Tarjeta" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.move}>
                                                    <div className="space-y-2">
                                                        {(Object.values(columns) as Column[]).map(col => (
                                                            <button
                                                                key={col.id}
                                                                disabled={col.id === currentColumnId}
                                                                onClick={() => moveTask(selectedTask.id, currentColumnId, col.id)}
                                                                className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${col.id === currentColumnId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/5' : 'hover:bg-sky-50 dark:hover:bg-sky-900/20 text-slate-500 hover:text-sky-700'}`}
                                                            >
                                                                Lista: {col.title}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </Popover>
                                            )}
                                        </div>

                                        <button onClick={handleCopy} className="flex items-center gap-4 px-5 py-3.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest border border-transparent active:scale-95 group">
                                            <i className="far fa-copy text-slate-400 group-hover:text-sky-600 transition-colors"></i> Copiar
                                        </button>
                                        <button onClick={() => addNotification({ type: 'success', title: 'Plantilla Creada', message: 'Registro guardado como base estratégica' })} className="flex items-center gap-4 px-5 py-3.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest border border-transparent active:scale-95 group">
                                            <i className="far fa-object-ungroup text-slate-400 group-hover:text-sky-600 transition-colors"></i> Crear plantilla
                                        </button>
                                        <div className="h-px bg-slate-300 dark:bg-white/10 my-4" />
                                        <button onClick={handleShare} className="flex items-center gap-4 px-5 py-3.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest border border-transparent active:scale-95 group">
                                            <i className="fas fa-share-alt text-slate-400 group-hover:text-sky-600 transition-colors"></i> Compartir
                                        </button>
                                        <button onClick={handleArchive} className="flex items-center gap-4 px-5 py-3.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest border border-transparent active:scale-95 group hover:text-rose-500">
                                            <i className="far fa-archive text-slate-400 group-hover:text-rose-500 transition-colors"></i> Archivar
                                        </button>
                                    </div>
                                </section>

                                {/* AI AGENT ASSISTANCE WIDGET */}
                                <div className="p-8 bg-[#1a1a24] dark:bg-black/40 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl border border-white/5">
                                    <RobotIcon className="absolute -right-10 -bottom-10 text-[10rem] opacity-5 pointer-events-none" />
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="size-10 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                                            <RobotIcon className="text-xl" />
                                        </div>
                                        <h5 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.3em]">Asistente Alco IA</h5>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed italic text-slate-300 opacity-90 relative z-10">
                                        "He detectado que esta perfilería requiere un análisis de espesor adicional según la norma NTC 2409."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
