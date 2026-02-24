import React from 'react';

interface EmptyStateProps {
    icon: React.FC<{ className?: string }>;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, subtitle, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-6">
            <Icon className="text-3xl text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">{subtitle}</p>
        {actionLabel && onAction && (
            <button
                onClick={onAction}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

export default EmptyState;
