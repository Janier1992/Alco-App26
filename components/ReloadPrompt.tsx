
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div className="fixed bottom-0 right-0 m-6 p-6 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-white max-w-sm animate-fade-in-up">
                    <div className="mb-4">
                        {offlineReady ? (
                            <span className="flex items-center gap-2">
                                <i className="fas fa-check-circle text-emerald-400"></i>
                                App lista para trabajar sin conexión.
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <i className="fas fa-sparkles text-amber-400"></i>
                                Nueva versión disponible.
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                        {needRefresh && (
                            <button
                                className="px-4 py-2 bg-emerald-500 text-slate-900 font-bold rounded hover:bg-emerald-400 transition-colors text-sm"
                                onClick={() => updateServiceWorker(true)}
                            >
                                Actualizar
                            </button>
                        )}
                        <button
                            className="px-4 py-2 bg-slate-700 text-slate-300 font-bold rounded hover:bg-slate-600 transition-colors text-sm"
                            onClick={close}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReloadPrompt;
