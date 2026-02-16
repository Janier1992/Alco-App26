/**
 * @file CreateTaskModal.tsx
 * @description Modal component to create a new task with basic fields.
 * @module components/projects
 * @author Antigravity Architect
 */

import React, { useState } from 'react';
import type { Priority } from '../../types';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, priority: Priority, description: string) => Promise<void>;
}

/**
 * CreateTaskModal Component
 */
export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<Priority>('Media');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onCreate(title, priority, description);
        setTitle('');
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-[#1a1a24] rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-white/5 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">Nuevo Requerimiento</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título de la Tarea</label>
                        <input
                            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/50 text-sm"
                            placeholder="Nombre corto y descriptivo..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prioridad</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['Baja', 'Media', 'Alta', 'Crítica'] as Priority[]).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${priority === p ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</label>
                        <textarea
                            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/50 text-sm min-h-[100px] resize-none"
                            placeholder="Detalles adicionales..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="w-full py-4 bg-sky-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-sky-600/20 hover:brightness-110 active:scale-[0.98] transition-all">
                        Crear Requerimiento
                    </button>
                </form>
            </div>
        </div>
    );
};
