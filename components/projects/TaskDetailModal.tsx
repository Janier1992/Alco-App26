/**
 * @file TaskDetailModal.tsx
 * @description Detailed view and editor for a Kanban task, including checklist and activity log.
 * @module components/projects
 * @author Antigravity Architect
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Task, Label, Priority, ChecklistItem } from '../../types';
import {
    CalendarIcon, Bars3Icon, CheckCircleIcon, PaperclipIcon, PlusIcon,
    ImageIcon, FileAltIcon, UserCircleIcon, CameraIcon, SendIcon
} from '../../constants';
import { Popover } from '../shared/Popover';
import CameraModal from './CameraModal';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTaskFields: (taskId: string, updates: Partial<Task>) => Promise<void>;
    onToggleLabel: (task: Task, label: Label) => Promise<void>;
    onToggleMember: (task: Task, member: { user_id: string, user_initials: string }) => Promise<void>;
    onUploadAttachment: (taskId: string, file: File | Blob, fileName: string) => Promise<void>;
    onAddChecklistItem: (taskId: string, text: string) => Promise<void>;
    onToggleChecklistItem: (taskId: string, itemId: string, currentStatus: boolean) => Promise<void>;
    onRemoveChecklistItem: (taskId: string, itemId: string) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
    onArchiveTask: (taskId: string) => Promise<void>;
    onCopyTask: (task: Task) => void;
    onMoveTask: (taskId: string, sourceColId: string, destColId: string) => void;
    currentColumnTitle: string;
    availableLabels: Label[];
    availableColumns: { id: string, title: string }[];
    registroUsers: string[];
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    task,
    onClose,
    onUpdateTaskFields,
    onToggleLabel,
    onToggleMember,
    onUploadAttachment,
    onAddChecklistItem,
    onToggleChecklistItem,
    onRemoveChecklistItem,
    onDeleteTask,
    onArchiveTask,
    onCopyTask,
    onMoveTask,
    currentColumnTitle,
    availableLabels,
    availableColumns,
    registroUsers
}) => {
    // Local UI states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(task.title);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState(task.description || '');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [commentText, setCommentText] = useState('');
    const [activePopover, setActivePopover] = useState<'labels' | 'members' | 'dates' | 'move' | 'cover' | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const checklistInputRef = useRef<HTMLInputElement>(null);
    const popoverAnchorRefs = {
        labels: useRef<HTMLButtonElement>(null),
        members: useRef<HTMLButtonElement>(null),
        dates: useRef<HTMLButtonElement>(null),
        move: useRef<HTMLButtonElement>(null),
        cover: useRef<HTMLButtonElement>(null)
    };

    const handleSaveTitle = async () => {
        if (!tempTitle.trim()) return;
        await onUpdateTaskFields(task.id, { title: tempTitle });
        setIsEditingTitle(false);
    };

    const handleSaveDesc = async () => {
        await onUpdateTaskFields(task.id, { description: tempDesc });
        setIsEditingDesc(false);
    };

    const handleToggleChecklistItem = async (id: string) => {
        const item = task.checklist?.find(i => i.id === id);
        if (item) {
            await onToggleChecklistItem(task.id, id, item.completed);
        }
    };

    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim()) return;
        await onAddChecklistItem(task.id, newChecklistItem);
        setNewChecklistItem('');
    };

    const handlePhotoCapture = async (imageSrc: string) => {
        const base64Response = await fetch(imageSrc);
        const blob = await base64Response.blob();
        const fileName = `capture_${Date.now()}.jpg`;
        await onUploadAttachment(task.id, blob, fileName);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-10 pb-10" onClick={onClose}>
            <div className="w-full max-w-4xl bg-[#f4f5f7] dark:bg-[#1a1a24] rounded-sm shadow-2xl p-6 md:p-8 animate-fade-in relative min-h-[500px]" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                    &times;
                </button>

                {/* Header Section */}
                <div className="mb-8 pr-10">
                    <div className="flex items-start gap-4 mb-2">
                        <div className="pt-1.5 text-slate-700 dark:text-slate-300">
                            <FileAltIcon className="size-6" />
                        </div>
                        <div className="flex-1">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        className="w-full text-xl font-semibold bg-white dark:bg-[#22272b] border-2 border-[#388bff] rounded-sm px-2 py-1 outline-none text-[#172b4d] dark:text-[#b6c2cf] focus:shadow-[inset_0_0_0_2px_#388bff]"
                                        value={tempTitle}
                                        onChange={e => setTempTitle(e.target.value)}
                                        autoFocus
                                        onBlur={handleSaveTitle}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                                    />
                                </div>
                            ) : (
                                <h2
                                    className="text-xl font-semibold text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer hover:bg-[#091e420f] dark:hover:bg-[#a6c5e229] px-2 -ml-2 rounded-sm transition-colors py-1"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {task.title}
                                </h2>
                            )}
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 px-2 -ml-2">
                                en la lista <span className="font-bold underline cursor-pointer">{currentColumnTitle}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Grid: Content vs Sidebar */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_192px] gap-8">

                    {/* LEFT COLUMN: Main Content */}
                    <div className="space-y-8">

                        {/* Metadata Row (Members, Labels, Due Date) */}
                        <div className="flex flex-wrap gap-6 pl-10">
                            {/* Members */}
                            {task.assignedUsers && task.assignedUsers.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2">Miembros</h4>
                                    <div className="flex items-center gap-1">
                                        {task.assignedUsers.map(user => (
                                            <div key={user.id || user.user_id} className="size-8 rounded-full bg-[#e9ecef] dark:bg-[#1C2B41] flex items-center justify-center text-xs font-semibold text-[#172b4d] dark:text-[#b6c2cf] cursor-pointer hover:brightness-95" title={user.user_id}>
                                                {user.user_initials}
                                            </div>
                                        ))}
                                        <button
                                            ref={popoverAnchorRefs.members}
                                            onClick={() => setActivePopover('members')}
                                            className="size-8 rounded-full bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] flex items-center justify-center text-[#44546f] transition-colors"
                                        >
                                            <PlusIcon className="size-4" />
                                        </button>

                                        {/* Members Popover */}
                                        {activePopover === 'members' && (
                                            <Popover title="Miembros" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.members}>
                                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {registroUsers.map((userName, idx) => {
                                                        const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2);
                                                        const isAssigned = task.assignedUsers?.some(u => u.user_id === userName);
                                                        return (
                                                            <button
                                                                key={userName}
                                                                onClick={() => onToggleMember(task, { user_id: userName, user_initials: initials })}
                                                                className={`w-full p-2 rounded text-left text-xs font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 ${isAssigned ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700' : 'text-slate-700 dark:text-slate-300'}`}
                                                            >
                                                                {initials} <span className="flex-1 truncate">{userName}</span>
                                                                {isAssigned && <CheckCircleIcon className="size-3" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Labels */}
                            {task.labels && task.labels.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2">Etiquetas</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {task.labels.map(l => (
                                            <div
                                                key={l.id}
                                                className="h-8 px-3 min-w-[40px] rounded-sm flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:brightness-110 transition-all uppercase"
                                                style={{ backgroundColor: l.color === 'red' ? '#e34935' : l.color === 'blue' ? '#00a3bf' : '#f5cd47' }}
                                            >
                                                {l.name}
                                            </div>
                                        ))}
                                        <button
                                            ref={popoverAnchorRefs.labels}
                                            onClick={() => setActivePopover('labels')}
                                            className="h-8 w-8 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm flex items-center justify-center text-[#44546f] transition-colors"
                                        >
                                            <PlusIcon className="size-4" />
                                        </button>

                                        {/* Labels Popover */}
                                        {activePopover === 'labels' && (
                                            <Popover title="Etiquetas" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.labels}>
                                                <div className="space-y-1">
                                                    {availableLabels.map(label => (
                                                        <button
                                                            key={label.id}
                                                            onClick={() => onToggleLabel(task, label)}
                                                            className="w-full h-8 rounded relative hover:brightness-110 transition-all flex items-center px-2"
                                                            style={{ backgroundColor: label.color === 'red' ? '#ef4444' : label.color === 'blue' ? '#0ea5e9' : '#f59e0b' }}
                                                        >
                                                            <span className="text-xs font-bold text-white shadow-sm uppercase">{label.name}</span>
                                                            {task.labels?.find(l => l.name === label.name) && (
                                                                <div className="absolute right-2 text-white"><CheckCircleIcon className="size-4" /></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Due Date */}
                            {task.dueDate && (
                                <div>
                                    <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2">Vencimiento</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded-sm border-2 border-[#dfe1e6] dark:border-[#8c9bab] cursor-pointer"
                                            checked={task.checklist?.every(i => i.completed) || false} // Pseudo logic to check if done
                                        />
                                        <div className="flex items-center gap-2 px-2 py-1 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm cursor-pointer transition-colors">
                                            <span className="text-[#172b4d] dark:text-[#b6c2cf] text-sm">
                                                {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {new Date(task.dueDate) < new Date() && (
                                                <span className="px-1.5 py-[2px] bg-[#f87168] dark:bg-[#e34935] text-white text-[10px] font-bold rounded-sm uppercase tracking-wider leading-none">
                                                    Vencido
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center mb-3 group">
                                <div className="pt-0.5 mr-3 text-[#172b4d] dark:text-[#b6c2cf]">
                                    <Bars3Icon className="size-5" />
                                </div>
                                <h3 className="text-base font-semibold text-[#172b4d] dark:text-[#b6c2cf] flex-1">Descripción</h3>
                                {!isEditingDesc && task.description && (
                                    <button onClick={() => setIsEditingDesc(true)} className="px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-[#172b4d] dark:text-[#b6c2cf] text-sm font-semibold transition-colors">
                                        Editar
                                    </button>
                                )}
                            </div>
                            <div className="pl-[32px]">
                                {isEditingDesc ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full p-3 bg-white dark:bg-[#22272b] border-2 border-transparent focus:border-[#388bff] focus:shadow-[inset_0_0_0_2px_#388bff] rounded-sm min-h-[120px] text-sm text-[#172b4d] dark:text-[#b6c2cf] focus:outline-none resize-none"
                                            value={tempDesc}
                                            onChange={e => setTempDesc(e.target.value)}
                                            placeholder="Añadir una descripción más detallada..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2 items-center">
                                            <button onClick={handleSaveDesc} className="px-4 py-1.5 bg-[#0c66e4] text-white rounded-sm text-sm font-semibold hover:bg-[#0055cc] transition-colors">Guardar</button>
                                            <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 hover:bg-[#091e420f] dark:hover:bg-[#A6C5E233] rounded-sm text-[#172b4d] dark:text-[#b6c2cf] text-sm font-semibold transition-colors">Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => !task.description && setIsEditingDesc(true)}
                                        className={`prose prose-sm dark:prose-invert max-w-none text-[#172b4d] dark:text-[#b6c2cf] ${!task.description ? 'py-2 px-3 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm cursor-pointer transition-colors font-medium text-sm' : ''}`}
                                    >
                                        {task.description || "Añadir una descripción más detallada..."}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attachments */}
                        {task.attachments && task.attachments.length > 0 && (
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <PaperclipIcon className="size-6 text-slate-700 dark:text-slate-300" />
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Adjuntos</h3>
                                </div>
                                <div className="pl-10 space-y-3">
                                    {task.attachments.map((file, idx) => (
                                        <div key={idx} className="flex gap-3 hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded cursor-pointer group">
                                            <div className="w-24 h-16 bg-slate-200 justify-center items-center flex rounded text-slate-400 font-bold text-xs uppercase overflow-hidden">
                                                {file.type?.startsWith('image/') ? (
                                                    <img src={file.url} className="w-full h-full object-cover" alt="attachment" />
                                                ) : <span className="text-[10px]">{file.name.split('.').pop()}</span>}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{file.name}</h4>
                                                <p className="text-xs text-slate-500">Agregado el {new Date(task.createdAt || Date.now()).toLocaleDateString()}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-xs underline text-slate-500 hover:text-slate-800 cursor-pointer">Comentar</span>
                                                    <span className="text-xs underline text-slate-500 hover:text-slate-800 cursor-pointer">Eliminar</span>
                                                    <span className="text-xs underline text-slate-500 hover:text-slate-800 cursor-pointer">Editar</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 rounded text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                                        Añadir un adjunto
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Checklist */}
                        <div className="mt-8">
                            <div className="flex items-center mb-4">
                                <div className="pt-0.5 mr-3 text-[#172b4d] dark:text-[#b6c2cf]">
                                    <CheckCircleIcon className="size-5" />
                                </div>
                                <h3 className="text-base font-semibold text-[#172b4d] dark:text-[#b6c2cf] flex-1">Checklist</h3>
                                <button
                                    onClick={async () => {
                                        if (confirm('¿Eliminar Checklist?')) {
                                            for (const item of task.checklist || []) await onRemoveChecklistItem(task.id, item.id);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-[#172b4d] dark:text-[#b6c2cf] text-sm font-semibold transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                            <div className="pl-[32px] space-y-3">
                                {task.checklist && task.checklist.length > 0 && (
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[11px] font-medium w-8 text-[#44546f] dark:text-[#8c9bab]">{Math.round((task.checklist.filter(i => i.completed).length / task.checklist.length) * 100)}%</span>
                                        <div className="flex-1 h-2 bg-[#091e420f] dark:bg-[#A6C5E229] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#579dff] transition-all duration-300" style={{ width: `${(task.checklist.filter(i => i.completed).length / task.checklist.length) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {task.checklist?.map(item => (
                                        <div key={item.id} className="group flex items-start hover:bg-[#091e420f] dark:hover:bg-[#A6C5E229] rounded-md -ml-2 p-2">
                                            <input
                                                type="checkbox"
                                                checked={item.completed}
                                                onChange={() => handleToggleChecklistItem(item.id)}
                                                className="mt-[3px] mr-3 size-4 rounded-sm border-2 border-[#dfe1e6] dark:border-[#8c9bab] cursor-pointer shrink-0"
                                            />
                                            <span
                                                className={`text-sm flex-1 cursor-pointer transition-all pt-0.5 ${item.completed ? 'line-through text-[#44546f] dark:text-[#8c9bab]' : 'text-[#172b4d] dark:text-[#b6c2cf]'}`}
                                                onClick={() => handleToggleChecklistItem(item.id)}
                                            >
                                                {item.text}
                                            </span>
                                            <button
                                                onClick={() => onRemoveChecklistItem(task.id, item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-[#44546f] dark:text-[#8c9bab] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm transition-all"
                                                title="Eliminar elemento"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3">
                                    <div className={`transition-all`}>
                                        <input
                                            ref={checklistInputRef}
                                            className="w-full px-3 py-2 bg-white dark:bg-[#22272b] border-2 border-transparent focus:border-[#388bff] focus:shadow-[inset_0_0_0_2px_#388bff] shadow-sm rounded-sm outline-none text-sm text-[#172b4d] dark:text-[#b6c2cf] placeholder:text-[#44546f] transition-all"
                                            placeholder="Añadir un elemento..."
                                            value={newChecklistItem}
                                            onChange={e => setNewChecklistItem(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                                            onClick={(e) => {
                                                if (!newChecklistItem) {
                                                    // Optional: visual focus state wrapper if we want pure Trello styling where button becomes input
                                                }
                                            }}
                                        />
                                        <div className={`flex gap-2 mt-2 ${!newChecklistItem && 'hidden'}`}>
                                            <button onClick={handleAddChecklistItem} className="px-4 py-1.5 bg-[#0c66e4] text-white rounded-sm text-sm font-semibold hover:bg-[#0055cc]">Añadir</button>
                                            <button onClick={() => setNewChecklistItem('')} className="px-3 py-1.5 hover:bg-[#091e420f] dark:hover:bg-[#A6C5E233] rounded-sm text-[#172b4d] dark:text-[#b6c2cf] text-sm font-semibold">Cancelar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>


                    {/* RIGHT COLUMN: Sidebar Actions */}
                    <div className="flex flex-col gap-6">
                        {/* Add to card */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2">Añadir a la tarjeta</h4>

                            {/* Botón Miembros */}
                            <button
                                ref={popoverAnchorRefs.members}
                                className="relative flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                                onClick={() => setActivePopover('members')}
                            >
                                <UserCircleIcon className="size-4" /> Miembros
                            </button>

                            {/* Botón Etiquetas */}
                            <button
                                ref={popoverAnchorRefs.labels}
                                className="relative flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                                onClick={() => setActivePopover('labels')}
                            >
                                <span className="size-4 rounded-sm bg-slate-400" /> Etiquetas
                            </button>

                            {/* Botón Checklist */}
                            <button
                                onClick={() => checklistInputRef.current?.focus()}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                            >
                                <CheckCircleIcon className="size-4" /> Checklist
                            </button>

                            {/* Botón Fecha */}
                            <button
                                ref={popoverAnchorRefs.dates}
                                onClick={() => setActivePopover('dates')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                            >
                                <CalendarIcon className="size-4" /> Fechas
                            </button>

                            {/* Fechas Popover */}
                            {activePopover === 'dates' && (
                                <Popover title="Fechas" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.dates}>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha de vencimiento</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full text-sm p-2 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-300 outline-none focus:border-sky-500"
                                                value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}
                                                onChange={(e) => {
                                                    const dateVal = e.target.value;
                                                    if (dateVal) onUpdateTaskFields(task.id, { dueDate: new Date(dateVal).toISOString() });
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="w-full py-1.5 bg-sky-600 text-white rounded text-xs font-bold hover:brightness-110"
                                                onClick={() => setActivePopover(null)}
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                className="w-full py-1.5 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:brightness-95"
                                                onClick={() => onUpdateTaskFields(task.id, { dueDate: undefined })}
                                            >
                                                Quitar
                                            </button>
                                        </div>
                                    </div>
                                </Popover>
                            )}

                            {/* Botón Adjunto */}
                            <button onClick={() => attachmentInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left">
                                <PaperclipIcon className="size-4" /> Adjunto
                            </button>
                            <input type="file" ref={attachmentInputRef} className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onUploadAttachment(task.id, file, file.name);
                            }} />

                            {/* Botón Portada */}
                            <button
                                ref={popoverAnchorRefs.cover}
                                onClick={() => setActivePopover('cover')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                            >
                                <ImageIcon className="size-4" /> Portada
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mt-4 mb-2">Acciones</h4>

                            <button
                                ref={popoverAnchorRefs.move}
                                onClick={() => setActivePopover('move')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                            >
                                &rarr; Mover
                            </button>
                            <button
                                onClick={() => {
                                    onCopyTask(task);
                                    onClose();
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left"
                            >
                                Copiar
                            </button>
                            <button
                                onClick={() => onUpdateTaskFields(task.id, { is_template: !task.is_template })}
                                className={`flex items-center gap-2 px-3 py-1.5 ${task.is_template ? 'bg-[#e9f2ff] text-[#0c66e4] dark:bg-[#bcd6f0] dark:text-[#1d4f91]' : 'bg-[#091e420f] text-[#172b4d] dark:bg-[#A6C5E229] dark:text-[#b6c2cf]'} hover:opacity-80 rounded-sm text-sm font-semibold transition-colors text-left`}
                            >
                                Crear plantilla
                            </button>

                            <button
                                onClick={async () => {
                                    await onArchiveTask(task.id);
                                    onClose();
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] rounded-sm text-sm font-semibold text-[#172b4d] dark:text-[#b6c2cf] transition-colors text-left mt-2"
                            >
                                Archivar
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm('¿Seguro que deseas eliminar esta tarjeta permanentemente?')) {
                                        await onDeleteTask(task.id);
                                        onClose();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#ffeceb] hover:bg-[#fbd0ce] dark:bg-[#421d1d] dark:hover:bg-[#601a1a] rounded-sm text-sm font-semibold text-[#c9372c] dark:text-[#f87168] transition-colors text-left"
                            >
                                Eliminar
                            </button>
                        </div>

                    </div>

                    {activePopover === 'members' && (
                        <Popover title="Miembros" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.members}>
                            <div className="space-y-1">
                                <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2 uppercase">Miembros del equipo</h4>
                                {registroUsers.map(user => {
                                    const isAssigned = task.assignedUsers.some(u => u.user_id === user);
                                    return (
                                        <button
                                            key={user}
                                            onClick={() => onToggleMember(task, { user_id: user, user_initials: user.substring(0, 2).toUpperCase() })}
                                            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[#091e420f] dark:hover:bg-[#A6C5E229] rounded transition-colors"
                                        >
                                            <span className="text-sm font-medium text-[#172b4d] dark:text-[#b6c2cf]">{user}</span>
                                            {isAssigned && <CheckCircleIcon className="size-4 text-[#0c66e4]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </Popover>
                    )}

                    {activePopover === 'labels' && (
                        <Popover title="Etiquetas" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.labels}>
                            <div className="grid grid-cols-1 gap-2">
                                {availableLabels.map(label => (
                                    <button
                                        key={label.id}
                                        onClick={() => onToggleLabel(task, label)}
                                        className="w-full h-8 rounded relative hover:brightness-90 transition-all font-semibold"
                                        style={{ backgroundColor: label.color === 'red' ? '#ef4444' : label.color === 'blue' ? '#0ea5e9' : '#f59e0b' }}
                                    >
                                        <span className="text-[11px] font-black text-white shadow-sm uppercase tracking-wider">{label.name}</span>
                                        {task.labels?.find(l => l.name === label.name) && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white"><CheckCircleIcon className="size-4" /></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </Popover>
                    )}

                    {activePopover === 'move' && (
                        <Popover title="Mover tarjeta" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.move}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] block mb-1">Destino</label>
                                    <select
                                        className="w-full text-sm p-2 rounded bg-[#091e420f] dark:bg-[#A6C5E229] border-none text-[#172b4d] dark:text-[#b6c2cf] outline-none"
                                        onChange={(e) => {
                                            const destId = e.target.value;
                                            if (destId && destId !== task.column_id) {
                                                onMoveTask(task.id, task.column_id!, destId);
                                                setActivePopover(null);
                                                onClose();
                                            }
                                        }}
                                        defaultValue={task.column_id}
                                    >
                                        {availableColumns.map(col => (
                                            <option key={col.id} value={col.id}>{col.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </Popover>
                    )}

                    {activePopover === 'cover' && (
                        <Popover title="Portada" onClose={() => setActivePopover(null)} anchorEl={popoverAnchorRefs.cover}>
                            <div>
                                <h4 className="text-xs font-semibold text-[#44546f] dark:text-[#8c9bab] mb-2 uppercase">Colores</h4>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {['#4bce97', '#f5cd47', '#fea362', '#f87168', '#9f8fef', '#579dff', '#6cc3e0', '#60c6d2'].map(color => (
                                        <button
                                            key={color}
                                            className="h-8 rounded overflow-hidden relative"
                                            style={{ backgroundColor: color }}
                                            onClick={() => {
                                                onUpdateTaskFields(task.id, { cover_color: color });
                                                setActivePopover(null);
                                            }}
                                        >
                                            {task.cover_color === color && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><CheckCircleIcon className="size-4 text-white" /></div>}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        onUpdateTaskFields(task.id, { cover_color: undefined });
                                        setActivePopover(null);
                                    }}
                                    className="w-full py-1.5 bg-[#091e420f] dark:bg-[#A6C5E229] hover:bg-[#091e4224] dark:hover:bg-[#A6C5E233] text-[#172b4d] dark:text-[#b6c2cf] rounded text-sm font-semibold transition-colors"
                                >
                                    Quitar portada
                                </button>
                            </div>
                        </Popover>
                    )}

                </div>

                <CameraModal
                    isOpen={isCameraOpen}
                    onClose={() => setIsCameraOpen(false)}
                    onCapture={handlePhotoCapture}
                />
            </div>
        </div>
    );
};
