/**
 * @file Projects.tsx
 * @description Main container for the Project Management Kanban board.
 * @module components
 * @author Antigravity Architect
 */

import React, { useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { useProjectsBoard } from '../hooks/projects/useProjectsBoard';
import { ProjectCard } from './projects/ProjectCard';
import { TaskDetailModal } from './projects/TaskDetailModal';
import { CreateTaskModal } from './projects/CreateTaskModal';
import { AVAILABLE_LABELS, REGISTRO_USERS, PlusIcon } from '../constants';

/**
 * Projects Component
 * Orchestrates the Kanban board using specialized hooks and modular sub-components.
 */
const Projects: React.FC = () => {
    const {
        columns,
        loading,
        selectedTask,
        setSelectedTask,
        createTask,
        toggleLabel,
        toggleMember,
        moveTask,
        updateTaskFields,
        uploadAttachment
    } = useProjectsBoard('projects');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('sourceColId', sourceColId);
    };

    const handleDrop = (e: React.DragEvent, destColId: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        const sourceColId = e.dataTransfer.getData('sourceColId');
        moveTask(taskId, sourceColId, destColId);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0f0f1a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Tablero...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-x-auto bg-slate-50 dark:bg-[#0f0f1a]">
            {/* Header / Breadcrumbs */}
            <div className="p-4 md:p-8 flex justify-between items-center sticky left-0">
                <Breadcrumbs
                    items={[{ label: 'OPERACIONES', path: '/ops' }, { label: 'GESTIÓN PROYECTOS', path: '/ops/projects' }]}
                />
                <button
                    onClick={() => {
                        setTargetColumnId(Object.keys(columns)[0]); // Default to first col
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-sky-600/20 hover:brightness-110 active:scale-95 transition-all"
                >
                    <PlusIcon className="size-4" /> Nuevo Requerimiento
                </button>
            </div>

            {/* Kanban Board Container */}
            <div className="px-4 md:px-8 pb-10 flex gap-6 min-w-max h-[calc(100vh-140px)]">
                {Object.values(columns).map(col => (
                    <div
                        key={col.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, col.id)}
                        className="w-80 flex flex-col h-full rounded-3xl bg-slate-200/40 dark:bg-white/[0.03] p-4 border border-slate-200 dark:border-white/5"
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    {col.title}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-white/5 text-[10px] font-bold text-slate-400">
                                    {col.tasks.length}
                                </span>
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                            {col.tasks.map(task => (
                                <ProjectCard
                                    key={task.id}
                                    task={task}
                                    columnId={col.id}
                                    onDragStart={handleDragStart}
                                    onClick={() => setSelectedTask(task)}
                                />
                            ))}

                            {/* Add Task Button per Column */}
                            <button
                                onClick={() => {
                                    setTargetColumnId(col.id);
                                    setIsCreateModalOpen(true);
                                }}
                                className="w-full flex items-center gap-2 p-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all group border border-dashed border-slate-300 dark:border-white/10"
                            >
                                <PlusIcon className="size-4 group-hover:text-sky-500" />
                                <span className="text-xs font-bold group-hover:text-sky-500 transition-colors">Añada una tarjeta</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub-modals & Overlay Components */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTaskFields={updateTaskFields}
                    onToggleLabel={toggleLabel}
                    onToggleMember={toggleMember}
                    onUploadAttachment={uploadAttachment}
                    currentColumnTitle={columns[selectedTask.column_id || '']?.title || 'Tarea'}
                    availableLabels={AVAILABLE_LABELS}
                    registroUsers={REGISTRO_USERS}
                />
            )}

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={(title, priority, desc) => createTask(targetColumnId!, title, priority, desc)}
            />
        </div>
    );
};

export default Projects;
