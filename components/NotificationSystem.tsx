
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { InfoCircleIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '../constants';

interface Notification {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
}

interface NotificationContextType {
    addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const newNotification = { ...notification, id: Date.now() };
        setNotifications(prev => [...prev, newNotification]);
        setTimeout(() => {
            removeNotification(newNotification.id);
        }, 5000);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

const ICONS = {
    info: <InfoCircleIcon />,
    success: <CheckCircleIcon />,
    warning: <ExclamationTriangleIcon />,
    error: <XCircleIcon />,
};

const TYPE_CONFIG = {
    info: {
        bg: 'bg-white/90 dark:bg-[#111827]/90',
        border: 'border-indigo-500/30',
        iconBg: 'bg-indigo-500/10',
        iconColor: 'text-indigo-500',
        progressBg: 'bg-indigo-500',
    },
    success: {
        bg: 'bg-white/90 dark:bg-[#111827]/90',
        border: 'border-emerald-500/30',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-500',
        progressBg: 'bg-emerald-500',
    },
    warning: {
        bg: 'bg-white/90 dark:bg-[#111827]/90',
        border: 'border-amber-500/30',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
        progressBg: 'bg-amber-500',
    },
    error: {
        bg: 'bg-white/90 dark:bg-[#111827]/90',
        border: 'border-rose-500/30',
        iconBg: 'bg-rose-500/10',
        iconColor: 'text-rose-500',
        progressBg: 'bg-rose-500',
    },
};

const NotificationToast: React.FC<{ notification: Notification; onRemove: (id: number) => void }> = ({ notification, onRemove }) => {
    const [exiting, setExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const config = TYPE_CONFIG[notification.type];

    useEffect(() => {
        const startTime = Date.now();
        const duration = 5000;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 50);

        const timer = setTimeout(() => {
            setExiting(true);
        }, 4700);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, []);

    const handleRemove = () => {
        setExiting(true);
        setTimeout(() => onRemove(notification.id), 300);
    };

    return (
        <div
            className={`w-full max-w-sm rounded-2xl overflow-hidden transition-all duration-300 ease-in-out backdrop-blur-xl border shadow-2xl
                ${config.bg} ${config.border}
                ${exiting ? 'opacity-0 translate-x-full scale-90' : 'opacity-100 translate-x-0 scale-100'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconColor} text-lg`}>
                    {ICONS[notification.type]}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                    <p className="font-black text-[10px] uppercase tracking-widest text-slate-800 dark:text-white mb-0.5">
                        {notification.title}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
                        {notification.message}
                    </p>
                </div>

                {/* Close */}
                <button
                    onClick={handleRemove}
                    className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                    aria-label="Cerrar notificación"
                >
                    <i className="fas fa-times text-[10px]"></i>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-[2px] w-full bg-slate-100 dark:bg-white/[0.04]">
                <div
                    className={`h-full ${config.progressBg} transition-[width] duration-75 ease-linear rounded-full`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

const NotificationContainer: React.FC<{ notifications: Notification[]; onRemove: (id: number) => void }> = ({ notifications, onRemove }) => {
    return (
        <div className="fixed top-6 right-6 z-[2500] space-y-3 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className="pointer-events-auto animate-slide-in-right">
                    <NotificationToast notification={n} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
};
