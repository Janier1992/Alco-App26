
import React from 'react';
import { RefreshIcon } from '../constants';

const PageLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-white/80 dark:bg-[#0b0b14]/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] animate-fade-in">
            <div className="relative">
                <div className="size-24 rounded-[2rem] bg-rose-600/10 flex items-center justify-center animate-pulse">
                    <RefreshIcon className="size-10 text-rose-600 animate-spin" />
                </div>
                <div className="absolute -inset-4 border-2 border-rose-600/20 rounded-[2.5rem] animate-ping opacity-20"></div>
            </div>
            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 animate-pulse">
                Sincronizando con el cerebro de InsForge...
            </p>
        </div>
    );
};

export default PageLoader;
