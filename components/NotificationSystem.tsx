
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
        }, 5000); // Auto-dismiss after 5 seconds
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

const TYPE_CLASSES = {
    info: 'bg-white dark:bg-sky-900/50 border-sky-500 text-sky-800 dark:text-sky-200 shadow-[0_10px_30px_rgba(14,165,233,0.1)]',
    success: 'bg-white dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200 shadow-[0_10px_30px_rgba(34,197,94,0.1)]',
    warning: 'bg-white dark:bg-yellow-900/50 border-yellow-500 text-yellow-800 dark:text-yellow-200 shadow-[0_10px_30px_rgba(234,179,8,0.1)]',
    error: 'bg-white dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200 shadow-[0_10px_30px_rgba(239,68,68,0.1)]',
};

const NotificationToast: React.FC<{ notification: Notification; onRemove: (id: number) => void }> = ({ notification, onRemove }) => {
    const [exiting, setExiting] = useState(false);
    
    useEffect(() => {
        // Set a shorter timeout to trigger the exit animation before removal
        const timer = setTimeout(() => {
            setExiting(true);
        }, 4700);
        return () => clearTimeout(timer);
    }, []);

    const handleRemove = () => {
        setExiting(true);
        // Allow time for animation before removing from state
        setTimeout(() => onRemove(notification.id), 300);
    }

    const baseClasses = 'w-full max-w-sm rounded-[1.5rem] p-5 border-l-4 flex items-start gap-4 transition-all duration-300 ease-in-out border dark:border-transparent';
    const animationClasses = exiting ? 'opacity-0 translate-x-full scale-90' : 'opacity-100 translate-x-0 scale-100';
    
    return (
        <div className={`${baseClasses} ${TYPE_CLASSES[notification.type]} ${animationClasses}`} role="alert" aria-live="assertive">
            <div className="flex-shrink-0 text-2xl pt-0.5">{ICONS[notification.type]}</div>
            <div className="flex-grow space-y-1">
                <p className="font-black text-xs uppercase tracking-widest">{notification.title}</p>
                <p className="text-sm font-medium opacity-80 leading-snug">{notification.message}</p>
            </div>
            <button onClick={handleRemove} className="flex-shrink-0 text-xl opacity-40 hover:opacity-100 transition-opacity" aria-label="Cerrar notificación">&times;</button>
        </div>
    );
};


const NotificationContainer: React.FC<{ notifications: Notification[]; onRemove: (id: number) => void }> = ({ notifications, onRemove }) => {
    return (
        <div className="fixed top-6 right-6 z-[2500] space-y-4 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className="pointer-events-auto">
                    <NotificationToast notification={n} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
};
