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
        uploadAttachment,
        addChecklistItem,
        toggleChecklistItem,
        removeChecklistItem,
        deleteTask,
        archiveTask,
        copyTask
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
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0e18]">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Tablero...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-x-auto bg-slate-50 dark:bg-[#0a0e18]">
            {/* Header / Breadcrumbs */}
            <div className="p-4 md:p-8 flex justify-between items-center sticky left-0">
                <Breadcrumbs
                    crumbs={[{ label: 'OPERACIONES', path: '/ops' }, { label: 'GESTIÓN PROYECTOS', path: '/ops/projects' }]}
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
                        className="w-[272px] shrink-0 flex flex-col max-h-full rounded-xl bg-[#f1f2f4] dark:bg-[#101204] text-[#172b4d] dark:text-slate-300 shadow-sm"
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-3 py-2.5 mb-1 cursor-grab">
                            <h3 className="text-sm font-semibold text-[#172b4d] dark:text-slate-200">
                                {col.title}
                            </h3>
                            <button className="p-1.5 rounded text-slate-500 hover:bg-slate-300 dark:hover:bg-white/10 transition-colors">
                                <span className="font-bold text-xs tracking-widest leading-none">...</span>
                            </button>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-1 space-y-2">
                            {col.tasks.map(task => (
                                <ProjectCard
                                    key={task.id}
                                    task={task}
                                    columnId={col.id}
                                    onDragStart={handleDragStart}
                                    onClick={() => setSelectedTask(task)}
                                    // New Props for Quick Actions
                                    onToggleLabel={toggleLabel}
                                    onToggleMember={toggleMember}
                                    onUpdateTaskFields={updateTaskFields}
                                    availableLabels={AVAILABLE_LABELS}
                                    registroUsers={REGISTRO_USERS}
                                />
                            ))}
                        </div>

                        {/* Add Task Button per Column */}
                        <div className="px-2 pt-1 pb-2">
                            <button
                                onClick={() => {
                                    setTargetColumnId(col.id);
                                    setIsCreateModalOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-[#44546f] dark:text-slate-400 hover:bg-[#091e4224] dark:hover:bg-[#a6c5e229] hover:text-[#172b4d] dark:hover:text-slate-200 rounded-lg transition-colors text-sm font-medium"
                            >
                                <PlusIcon className="size-4" />
                                <span>Añada una tarjeta</span>
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
                    onAddChecklistItem={addChecklistItem}
                    onToggleChecklistItem={toggleChecklistItem}
                    onRemoveChecklistItem={removeChecklistItem}
                    onDeleteTask={deleteTask}
                    onArchiveTask={archiveTask}
                    onCopyTask={copyTask}
                    onMoveTask={moveTask}
                    availableColumns={Object.values(columns)}
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
