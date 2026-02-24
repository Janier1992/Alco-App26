
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: string;
}

interface ConfirmDialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirmDialog = (): ConfirmDialogContextType => {
    const context = useContext(ConfirmDialogContext);
    if (!context) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
    return context;
};

export const ConfirmDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ isOpen: true, options, resolve });
        });
    }, []);

    const handleConfirm = () => {
        state.resolve?.(true);
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    const handleCancel = () => {
        state.resolve?.(false);
        setState(prev => ({ ...prev, isOpen: false, resolve: null }));
    };

    const variantConfig = {
        danger: {
            iconBg: 'bg-rose-500/10',
            iconColor: 'text-rose-500',
            defaultIcon: 'fa-trash-alt',
            buttonBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
        },
        warning: {
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-500',
            defaultIcon: 'fa-exclamation-triangle',
            buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
        },
        info: {
            iconBg: 'bg-indigo-500/10',
            iconColor: 'text-indigo-500',
            defaultIcon: 'fa-info-circle',
            buttonBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20',
        },
    };

    const variant = state.options.variant || 'danger';
    const config = variantConfig[variant];

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {state.isOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 animate-fade-in">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCancel}></div>

                    {/* Dialog */}
                    <div className="relative w-full max-w-[400px] bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/[0.06] animate-scale-in overflow-hidden">
                        {/* Top accent line */}
                        <div className={`h-1 w-full ${variant === 'danger' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : variant === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}></div>

                        <div className="p-6">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center mx-auto mb-4`}>
                                <i className={`fas ${state.options.icon || config.defaultIcon} ${config.iconColor} text-lg`}></i>
                            </div>

                            {/* Content */}
                            <h3 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide mb-2">
                                {state.options.title}
                            </h3>
                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
                                {state.options.message}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all border border-slate-200/80 dark:border-white/[0.06]"
                                >
                                    {state.options.cancelLabel || 'Cancelar'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${config.buttonBg}`}
                                >
                                    {state.options.confirmLabel || 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
};

export default ConfirmDialogProvider;
