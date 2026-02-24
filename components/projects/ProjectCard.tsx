/**
 * @file ProjectCard.tsx
 * @description Individual Kanban card component representing a task with quick actions (Trello-style).
 * @module components/projects
 * @author Antigravity Architect
 */

import React, { useState, useRef } from 'react';
import type { Task, Label } from '../../types';
import {
    CalendarIcon, PaperclipIcon, CheckCircleIcon,
    PencilSquareIcon, UserCircleIcon, TagIcon, ClockIcon
} from '../../constants';
import { Popover } from '../shared/Popover';

interface ProjectCardProps {
    task: Task;
    columnId: string;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void;
    // Quick Actions Handlers
    onToggleLabel: (task: Task, label: Label) => Promise<void>;
    onToggleMember: (task: Task, member: { user_id: string, user_initials: string }) => Promise<void>;
    onUpdateTaskFields: (taskId: string, updates: Partial<Task>) => Promise<void>;
    availableLabels: Label[];
    registroUsers: string[];
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
    task,
    columnId,
    onClick,
    onDragStart,
    onToggleLabel,
    onToggleMember,
    onUpdateTaskFields,
    availableLabels,
    registroUsers
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [activePopover, setActivePopover] = useState<'labels' | 'members' | 'dates' | null>(null);
    const quickActionRef = useRef<HTMLButtonElement>(null);

    // Cover Image Logic
    const coverImage = task.attachments?.find(a => a.type?.startsWith('image/'))?.url;

    // Quick Actions
    const handleQuickActionClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening modal
        setActivePopover('labels'); // Default to labels, or maybe a menu first? For now lets open Labels directly as "Edit" usually implies properties
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id, columnId)}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative bg-white dark:bg-[#22272b] rounded-lg shadow-[0_1px_1px_#091e4240,0_0_1px_#091e424f] hover:bg-[#f1f2f4] dark:hover:bg-[#2c333a] cursor-pointer mb-2 select-none border border-transparent dark:border-white/5"
        >
            {/* Quick Edit Button (Trello Style Pencil) */}
            <button
                ref={quickActionRef}
                onClick={handleQuickActionClick}
                className={`absolute top-2 right-2 z-20 p-1.5 rounded bg-slate-100/80 dark:bg-[#1a1a24]/80 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-sky-600 transition-all ${isHovered || activePopover ? 'opacity-100' : 'opacity-0'}`}
            >
                <PencilSquareIcon className="size-3.5" />
            </button>

            {/* Content Container */}
            <div className="flex flex-col">
                {/* Cover Image */}
                {coverImage && (
                    <div className="h-32 w-full rounded-t-lg overflow-hidden mb-2 relative">
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                )}

                <div className={`flex flex-col ${coverImage ? 'p-3 pt-0' : 'p-3'}`}>
                    {/* Labels Bar */}
                    <div className="flex flex-wrap gap-1 mb-2 min-h-[6px]">
                        {task.labels?.map(l => (
                            <div
                                key={l.id}
                                className="h-2 w-8 rounded-full transition-all hover:brightness-110"
                                style={{ backgroundColor: l.color === 'red' ? '#ef4444' : l.color === 'blue' ? '#0ea5e9' : '#f59e0b' }}
                                title={l.name}
                            />
                        ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-medium text-[#172b4d] dark:text-[#b6c2cf] mb-3 leading-snug pr-6">
                        {task.title}
                    </h3>

                    {/* Footer / Badges */}
                    <div className="flex items-end justify-between">
                        <div className="flex items-center gap-3 text-slate-400">
                            {/* Due Date Badge */}
                            {task.dueDate && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${new Date(task.dueDate) < new Date() ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                    <ClockIcon className="size-3" />
                                    <span>{new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                </div>
                            )}

                            {/* Attachments Badge */}
                            {task.attachments?.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px]">
                                    <PaperclipIcon className="size-3" />
                                    <span>{task.attachments.length}</span>
                                </div>
                            )}

                            {/* Checklist Badge */}
                            {task.checklist && task.checklist.length > 0 && (
                                <div className={`flex items-center gap-1 text-[10px] ${task.checklist.every(i => i.completed) ? 'text-emerald-500' : ''}`}>
                                    <CheckCircleIcon className="size-3" />
                                    <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
                                </div>
                            )}
                        </div>

                        {/* Members */}
                        <div className="flex -space-x-1.5">
                            {task.assignedUsers?.map(user => (
                                <div
                                    key={user.id || user.user_id}
                                    className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 border dark:border-[#1a1a24] flex items-center justify-center text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase shadow-sm"
                                    title={user.user_id}
                                >
                                    {user.user_initials}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Popover - Only showing Labels for this iteration to keep it clean, expand later */}
            {activePopover === 'labels' && (
                <div onClick={e => e.stopPropagation()}>
                    <Popover
                        title="Etiquetas Rápidas"
                        onClose={() => setActivePopover(null)}
                        anchorEl={quickActionRef}
                    >
                        <div className="grid grid-cols-1 gap-2">
                            {availableLabels.map(label => (
                                <button
                                    key={label.id}
                                    onClick={() => onToggleLabel(task, label)}
                                    className="w-full h-8 rounded relative hover:brightness-90 transition-all"
                                    style={{ backgroundColor: label.color === 'red' ? '#ef4444' : label.color === 'blue' ? '#0ea5e9' : '#f59e0b' }}
                                >
                                    <span className="text-[10px] font-black text-white shadow-sm uppercase tracking-wider">{label.name}</span>
                                    {task.labels?.find(l => l.name === label.name) && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white"><CheckCircleIcon className="size-4" /></div>
                                    )}
                                </button>
                            ))}
                            <div className="border-t dark:border-white/10 pt-2 mt-2">
                                <button className="w-full text-left text-[10px] font-bold text-slate-400 hover:text-sky-500" onClick={() => onClick()}>
                                    &rarr; Abrir tarjeta para más acciones
                                </button>
                            </div>
                        </div>
                    </Popover>
                </div>
            )}
        </div>
    );
};
