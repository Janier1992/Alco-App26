/**
 * @file ProjectCard.tsx
 * @description Individual Kanban card component representing a task.
 * @module components/projects
 * @author Antigravity Architect
 */

import React from 'react';
import type { Task } from '../../types';
import { CalendarIcon, PaperclipIcon, CheckCircleIcon } from '../../constants';

interface ProjectCardProps {
    task: Task;
    columnId: string;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void;
}

/**
 * ProjectCard Component
 * Renders a task with its labels, title, assignees, and progress indicators.
 * 
 * @param {ProjectCardProps} props - Component properties.
 * @returns {JSX.Element} The rendered project card.
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ task, columnId, onClick, onDragStart }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id, columnId)}
            onClick={onClick}
            className="bg-white dark:bg-[#1a1a24] rounded-xl p-3 shadow-sm border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/30 transition-all group cursor-pointer mb-3"
        >
            {/* Labels Section */}
            <div className="flex flex-wrap gap-1 mb-3">
                {task.labels?.map(l => (
                    <div
                        key={l.id}
                        className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white shadow-sm flex items-center gap-1"
                        style={{ backgroundColor: l.color === 'red' ? '#ef4444' : l.color === 'blue' ? '#0ea5e9' : '#f59e0b' }}
                    >
                        {l.name}
                    </div>
                ))}
            </div>

            {/* Title and Assignees */}
            <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-snug group-hover:text-sky-500 transition-colors flex-1">
                    {task.title}
                </h3>
                <div className="flex -space-x-2 shrink-0 pt-0.5 ml-auto">
                    {task.assignedUsers?.slice(0, 3).map(user => (
                        <div
                            key={user.id}
                            className="size-6 rounded-full bg-sky-100 dark:bg-sky-500/20 border-2 border-white dark:border-[#1a1a24] flex items-center justify-center text-[10px] font-black text-sky-600 dark:text-sky-300 shadow-md"
                            title={user.initials}
                        >
                            {user.initials}
                        </div>
                    ))}
                    {task.assignedUsers && task.assignedUsers.length > 3 && (
                        <div className="size-6 rounded-full bg-slate-100 dark:bg-white/10 border-2 border-white dark:border-[#1a1a24] flex items-center justify-center text-[9px] font-bold text-slate-400 shadow-sm">
                            +{task.assignedUsers.length - 3}
                        </div>
                    )}
                </div>
            </div>

            {/* Metadata Footer (Due Date, Attachments, Checklist) */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    {task.dueDate && (
                        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${new Date(task.dueDate) < new Date() ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                            <CalendarIcon className="scale-75" /> {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                    )}
                    <div className="flex gap-2 text-slate-400">
                        {task.attachments?.length > 0 && (
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
            </div>
        </div>
    );
};
