
import React from 'react';

const PageLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-white/90 dark:bg-[#060a14]/90 backdrop-blur-xl flex flex-col items-center justify-center z-[9999] animate-fade-in">
            {/* Logo Animation */}
            <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <i className="fas fa-layer-group text-white text-xl"></i>
                </div>
                {/* Pulsing ring */}
                <div className="absolute -inset-3 border-2 border-indigo-500/20 rounded-[1.4rem] animate-ping opacity-40" style={{ animationDuration: '2s' }}></div>
                <div className="absolute -inset-6 border border-indigo-500/10 rounded-[1.8rem] animate-ping opacity-20" style={{ animationDuration: '2.5s' }}></div>
            </div>

            {/* Loading Text */}
            <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                    Cargando módulo
                </p>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
