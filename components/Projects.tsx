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
import { supabase } from '../supabaseClient';
import BulkUploadButton from './BulkUploadButton';

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

    const [columns, setColumns] = useState<{ [key: string]: Column }>({});
    const [boardId, setBoardId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadRef = useRef(false);

    // Initial Data Fetch
    useEffect(() => {
        if (loadRef.current) return;
        loadRef.current = true;
        fetchBoardData();
    }, []);

    const fetchBoardData = async () => {
        try {
            setLoading(true);
            // 1. Get Board ID for 'projects'
            const { data: boardData, error: boardError } = await supabase
                .from('boards')
                .select('id')
                .eq('type', 'projects')
                .single();

            if (boardError || !boardData) {
                console.error("Board not found:", boardError);
                return;
            }

            setBoardId(boardData.id);

            // 2. Get Columns
            const { data: colsData, error: colsError } = await supabase
                .from('board_columns')
                .select('*')
                .eq('board_id', boardData.id)
                .order('position');

            if (colsError) throw colsError;

            // If no columns, create defaults
            let finalColumns = colsData || [];
            if (finalColumns.length === 0) {
                const defaults = ['Identificadas', 'Análisis (RCA)', 'Plan de Acción', 'Verificación'];
                for (let i = 0; i < defaults.length; i++) {
                    const { data, error } = await supabase.from('board_columns').insert({
                        board_id: boardData.id,
                        title: defaults[i],
                        position: i
                    }).select().single();
                    if (data) finalColumns.push(data);
                }
            }

            // 3. Get Tasks for this board's columns
            // We need to fetch tasks that belong to these columns.
            // A simpler way is to fetch tasks where column_id is in our list of column IDs.
            const colIds = finalColumns.map(c => c.id);
            const { data: tasksData, error: tasksError } = await supabase
                .from('board_tasks')
                .select(`
                    *,
                    labels:task_labels(*),
                    assignedUsers:task_assignees(*),
                    checklist:task_checklists(*),
                    attachments:task_attachments(*),
                    comments:task_comments(*)
                `)
                .in('column_id', colIds)
                .order('position');

            if (tasksError) throw tasksError;

            // 4. Map to Frontend Structure
            const newColumnsState: { [key: string]: Column } = {};
            finalColumns.forEach(col => {
                const colTasks = tasksData?.filter(t => t.column_id === col.id).map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description || '',
                    priority: t.priority as Priority,
                    dueDate: t.due_date,
                    // Map joined tables
                    labels: t.labels || [],
                    assignedUsers: t.assignedUsers?.map((u: any) => ({
                        id: u.user_id || u.id, // Handle if we have user_id or just an id
                        initials: u.user_initials || '??'
                    })) || [],
                    checklist: t.checklist || [],
                    attachments: t.attachments || [],
                    comments: t.comments?.map((c: any) => ({
                        id: c.id,
                        author: c.author_name || 'Desconocido',
                        text: c.content,
                        date: new Date(c.created_at).toLocaleDateString()
                    })) || [],
                    assetId: t.asset_id,
                    type: t.maintenance_type
                })) || [];

                newColumnsState[col.id] = {
                    id: col.id,
                    title: col.title,
                    tasks: colTasks
                };
            });

            setColumns(newColumnsState);

        } catch (error) {
            console.error(error);
            addNotification({ type: 'error', title: 'Error de Conexión', message: 'No se pudieron cargar los datos del tablero.' });
        } finally {
            setLoading(false);
        }
    };

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

    const moveTask = async (taskId: string, sourceColId: string, destColId: string) => {
        if (sourceColId === destColId) return;
        const sourceCol = columns[sourceColId];
        const destCol = columns[destColId];
        const taskToMove = sourceCol.tasks.find(t => t.id === taskId);

        if (taskToMove) {
            // Optimistic Update
            setColumns({
                ...columns,
                [sourceColId]: { ...sourceCol, tasks: sourceCol.tasks.filter(t => t.id !== taskId) },
                [destColId]: { ...destCol, tasks: [...destCol.tasks, taskToMove] }
            });

            // DB Update
            await supabase.from('board_tasks').update({ column_id: destColId }).eq('id', taskId);

            addNotification({ type: 'info', title: 'Tarea Movida', message: `Ubicación actualizada: ${destCol.title}` });
            if (selectedTask?.id === taskId) {
                // Keep modal open but update context if needed? actually we don't need to do anything here
            }
        }
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        // Optimistic
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

        // DB Update
        await supabase.from('board_tasks').update({
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            due_date: updatedTask.dueDate
        }).eq('id', updatedTask.id);
    };

    // --- Actions Panel Functions ---

    const handleArchive = async () => {
        if (!selectedTask) return;
        // Optimistic
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            newColumns[colId].tasks = newColumns[colId].tasks.filter(t => t.id !== selectedTask.id);
        }
        setColumns(newColumns);

        // DB
        await supabase.from('board_tasks').delete().eq('id', selectedTask.id);

        setSelectedTask(null);
        addNotification({ type: 'error', title: 'Registro Archivado', message: 'La tarea ha sido eliminada permanentemente.' });
    };

    const handleCopy = async () => {
        if (!selectedTask) return;
        const colId = Object.keys(columns).find(k => columns[k].tasks.some(t => t.id === selectedTask.id));
        if (!colId) return;

        const { data } = await supabase.from('board_tasks').insert({
            column_id: colId,
            title: `${selectedTask.title} (Copia)`,
            description: selectedTask.description,
            priority: selectedTask.priority,
            due_date: selectedTask.dueDate
        }).select().single();

        if (data) {
            const newTask: Task = {
                ...selectedTask,
                id: data.id,
                title: data.title,
                labels: [],
                checklist: [],
                comments: [],
                attachments: []
            };
            setColumns({
                ...columns,
                [colId]: { ...columns[colId], tasks: [...columns[colId].tasks, newTask] }
            });
            addNotification({ type: 'success', title: 'Tarea Duplicada', message: 'Se ha creado una copia técnica del registro.' });
        }
    };

    const handleShare = () => {
        if (!selectedTask) return;
        navigator.clipboard.writeText(`${window.location.origin}/#/ops/projects?taskId=${selectedTask.id}`);
        addNotification({ type: 'info', title: 'Enlace Copiado', message: 'Trazabilidad digital disponible en el portapapeles.' });
    };

    const handlePostComment = async () => {
        if (!selectedTask || !commentText.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();

        const { data } = await supabase.from('task_comments').insert({
            task_id: selectedTask.id,
            content: commentText,
            author_id: user?.id,
            author_name: user?.user_metadata?.full_name || 'Usuario'
        }).select().single();

        if (data) {
            const newComment: TaskComment = {
                id: data.id,
                author: data.author_name,
                text: data.content,
                date: new Date(data.created_at).toLocaleDateString()
            };

            const updatedTask = {
                ...selectedTask,
                comments: [...(selectedTask.comments || []), newComment]
            };
            setSelectedTask(updatedTask);
            // Updating columns state for consistency
            const newColumns = { ...columns };
            for (const colId in newColumns) {
                const idx = newColumns[colId].tasks.findIndex(t => t.id === selectedTask.id);
                if (idx !== -1) { newColumns[colId].tasks[idx] = updatedTask; break; }
            }
            setColumns(newColumns);
        }
        setCommentText('');
    };

    const handleSaveDesc = async () => {
        if (!selectedTask) return;
        await supabase.from('board_tasks').update({ description: tempDesc }).eq('id', selectedTask.id);

        const updatedTask = { ...selectedTask, description: tempDesc };
        setSelectedTask(updatedTask);
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            const idx = newColumns[colId].tasks.findIndex(t => t.id === selectedTask.id);
            if (idx !== -1) { newColumns[colId].tasks[idx] = updatedTask; break; }
        }
        setColumns(newColumns);
        setIsEditingDesc(false);
    };

    const handleSaveNewTask = async (title: string, priority: Priority, description: string) => {
        if (!boardId) return;
        const firstColId = Object.keys(columns)[0];
        if (!firstColId) return;

        const { data } = await supabase.from('board_tasks').insert({
            column_id: firstColId,
            title,
            priority,
            description,
            due_date: new Date().toISOString().split('T')[0]
        }).select().single();

        if (data) {
            const newTask: Task = {
                id: data.id,
                title: data.title,
                priority: data.priority as Priority,
                description: data.description,
                dueDate: data.due_date,
                labels: [],
                assignedUsers: [],
                attachments: [],
                comments: [],
                checklist: []
            };

            setColumns({
                ...columns,
                [firstColId]: {
                    ...columns[firstColId],
                    tasks: [...columns[firstColId].tasks, newTask]
                }
            });

            setIsCreateModalOpen(false);
            addNotification({
                type: 'success',
                title: 'REQUERIMIENTO CREADO',
                message: `El registro "${title}" ha sido incorporado a la lista.`
            });
        }
    };

    // --- Checklist Functions ---

    const handleAddChecklistItem = async () => {
        if (!selectedTask || !newChecklistItem.trim()) return;

        const { data } = await supabase.from('task_checklists').insert({
            task_id: selectedTask.id,
            text: newChecklistItem,
            completed: false
        }).select().single();

        if (data) {
            const newItem: ChecklistItem = { id: data.id, text: data.text, completed: data.completed };
            const updatedTask = { ...selectedTask, checklist: [...(selectedTask.checklist || []), newItem] };
            setSelectedTask(updatedTask);
            const newColumns = { ...columns };
            for (const colId in newColumns) {
                const idx = newColumns[colId].tasks.findIndex(t => t.id === selectedTask.id);
                if (idx !== -1) { newColumns[colId].tasks[idx] = updatedTask; break; }
            }
            setColumns(newColumns);
        }
        setNewChecklistItem('');
    };

    const toggleChecklistItem = async (id: string) => {
        if (!selectedTask) return;
        const item = selectedTask.checklist?.find(i => i.id === id);
        if (!item) return;

        const newCompleted = !item.completed;
        await supabase.from('task_checklists').update({ completed: newCompleted }).eq('id', id);

        const newChecklist = selectedTask.checklist?.map(i =>
            i.id === id ? { ...i, completed: newCompleted } : i
        );
        const updatedTask = { ...selectedTask, checklist: newChecklist };
        setSelectedTask(updatedTask);
        const newColumns = { ...columns };
        for (const colId in newColumns) {
            const idx = newColumns[colId].tasks.findIndex(t => t.id === selectedTask.id);
            if (idx !== -1) { newColumns[colId].tasks[idx] = updatedTask; break; }
        }
        setColumns(newColumns);
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

    if (loading) {
        return <div className="h-full flex items-center justify-center"><RobotIcon className="text-6xl text-slate-300 animate-bounce" /></div>;
    }

    return (
        <div className="flex flex-col h-full gap-8 animate-fade-in pb-10">
            <div className="flex flex-col gap-2">
                <Breadcrumbs crumbs={[{ label: 'Operaciones', path: '/dashboard' }, { label: 'Gestión de Proyectos' }]} />
                <div className="flex flex-wrap justify-between items-center gap-6">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                        Tablero <span className="text-sky-600">Estratégico Alco</span>
                    </h1>
                    <div className="flex gap-4">
                        <BulkUploadButton
                            tableName="board_tasks"
                            label="Importar Proyectos"
                            onUploadComplete={fetchBoardData}
                            mapping={(row: any) => {
                                const firstColId = Object.keys(columns)[0];
                                if (!boardId || !firstColId) {
                                    console.error("Board info missing for upload");
                                    return row;
                                }
                                return {
                                    column_id: firstColId,
                                    title: row.Title || row.title || row.Titulo || 'Proyecto Importado',
                                    description: row.Description || row.description || row.Descripcion || '',
                                    priority: row.Priority || row.priority || row.Prioridad || 'Media',
                                    due_date: row.DueDate || row.due_date || row.FechaLimite || new Date().toISOString().split('T')[0]
                                };
                            }}
                        />
                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-8 h-14 bg-sky-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-sky-600/20 active:scale-95">
                            <PlusIcon /> Nuevo Requerimiento
                        </button>
                    </div>
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

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-sm flex justify-end" onClick={() => setSelectedTask(null)}>
                    <div className="w-full max-w-4xl bg-white dark:bg-[#1a1a24] h-full shadow-2xl p-8 overflow-y-auto animate-slide-in-right border-l border-slate-200 dark:border-white/5" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex-1 mr-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        {currentColumnTitle}
                                    </span>
                                    {selectedTask.dueDate && (
                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                                            <CalendarIcon className="size-3" /> Due {selectedTask.dueDate}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                                    {selectedTask.title}
                                </h2>
                                <p className="text-xs text-slate-400 font-mono">ID: {selectedTask.id}</p>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="size-10 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
                                &times;
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-10">

                                {/* Description */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Bars3Icon /> Descripción Técnica
                                        </h3>
                                        {!isEditingDesc && (
                                            <button onClick={() => setIsEditingDesc(true)} className="text-xs font-bold text-sky-600 hover:text-sky-500 transition-colors">
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDesc ? (
                                        <div className="space-y-3">
                                            <textarea
                                                className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl min-h-[150px] text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500/50 outline-none resize-none"
                                                value={tempDesc}
                                                onChange={e => setTempDesc(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleSaveDesc} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider">Guardar</button>
                                                <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase tracking-wider">Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => setIsEditingDesc(true)} className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-300 cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                            {selectedTask.description || <span className="italic opacity-50">Sin descripción detallada...</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Checklist */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircleIcon /> Checklist de Calidad
                                        </h3>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Progress Bar */}
                                        {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                                            <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                                                <div
                                                    className="h-full bg-sky-500 transition-all duration-500"
                                                    style={{ width: `${(selectedTask.checklist.filter(i => i.completed).length / selectedTask.checklist.length) * 100}%` }}
                                                />
                                            </div>
                                        )}

                                        {selectedTask.checklist?.map(item => (
                                            <div key={item.id} className="group flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-sky-500/20 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={item.completed}
                                                    onChange={() => toggleChecklistItem(item.id)}
                                                    className="size-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className={`text-sm font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {item.text}
                                                </span>
                                            </div>
                                        ))}

                                        <div className="flex gap-2 mt-4">
                                            <input
                                                className="flex-1 bg-transparent border-b border-slate-200 dark:border-white/10 py-2 text-sm focus:border-sky-500 outline-none transition-colors"
                                                placeholder="Añadir ítem..."
                                                value={newChecklistItem}
                                                onChange={e => setNewChecklistItem(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                                            />
                                            <button onClick={handleAddChecklistItem} className="text-slate-400 hover:text-sky-500">
                                                <PlusIcon />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        Bitácora de Actividad
                                    </h3>

                                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex gap-4">
                                        <div className="size-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-xs">YO</div>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                className="w-full bg-transparent text-sm outline-none resize-none h-10 focus:h-20 transition-all placeholder:text-slate-400"
                                                placeholder="Escribe una actualización..."
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                            />
                                            <div className="flex justify-between items-center">
                                                <button className="text-slate-400 hover:text-sky-500"><PaperclipIcon className="size-4" /></button>
                                                <button
                                                    onClick={handlePostComment}
                                                    disabled={!commentText.trim()}
                                                    className="px-4 py-1.5 bg-sky-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-sky-700 transition-colors"
                                                >
                                                    Publicar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {selectedTask.comments?.map(comment => (
                                            <div key={comment.id} className="flex gap-4 animate-fade-in">
                                                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                    {comment.author ? comment.author.substring(0, 2).toUpperCase() : '??'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{comment.author}</span>
                                                        <span className="text-[10px] text-slate-400">{comment.date}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-tr-xl rounded-b-xl">
                                                        {comment.text}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Actions */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Añadir a la tarjeta</h4>
                                    <div className="flex flex-col gap-2">
                                        <button ref={popoverAnchorRefs.labels} onClick={() => togglePopover('labels')} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <span className="size-4 rounded bg-emerald-400" /> Etiquetas
                                        </button>
                                        <button ref={popoverAnchorRefs.members} onClick={() => togglePopover('members')} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <UserCircleIcon className="size-4" /> Miembros
                                        </button>
                                        <button ref={popoverAnchorRefs.checklist} onClick={() => togglePopover('checklist')} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <CheckCircleIcon className="size-4" /> Checklist
                                        </button>
                                        <button ref={popoverAnchorRefs.dates} onClick={() => togglePopover('dates')} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <CalendarIcon className="size-4" /> Fechas
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <PaperclipIcon className="size-4" /> Adjuntos
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Acciones</h4>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <FolderOpenIcon className="size-4" /> Copiar
                                        </button>
                                        <button onClick={handleShare} className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all text-left">
                                            <SendIcon className="size-4" /> Compartir
                                        </button>
                                        <button onClick={handleArchive} className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 transition-all text-left mt-4 border border-transparent hover:border-rose-200 dark:hover:border-rose-800">
                                            <TrashIcon className="size-4" /> Archivar
                                        </button>
                                    </div>
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
