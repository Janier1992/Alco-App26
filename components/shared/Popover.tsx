import React, { useRef, useEffect } from 'react';

export interface PopoverProps {
    title: string;
    onClose: () => void;
    anchorEl: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
}

export const Popover: React.FC<PopoverProps> = ({ title, onClose, anchorEl, children }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                anchorEl.current && !anchorEl.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorEl]);

    if (!anchorEl.current) return null;

    return (
        <div ref={popoverRef} className="absolute z-[2500] w-72 bg-white dark:bg-[#1a1a24] shadow-2xl rounded-2xl border border-slate-200 dark:border-white/10 p-4 animate-fade-in mt-2 right-0 md:left-0 md:right-auto">
            <div className="flex justify-between items-center mb-4 border-b dark:border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-rose-500">&times;</button>
            </div>
            {children}
        </div>
    );
};
