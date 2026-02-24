import React, { useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { QRIcon, SearchIcon, CheckCircleIcon, XCircleIcon } from '../constants';
import type { ProductLot } from '../types';
import { supabase } from '../insforgeClient';
import { useNotification } from './NotificationSystem';

const Traceability: React.FC = () => {
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLot, setSelectedLot] = useState<ProductLot | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setLoading(true);
        setError('');
        setSelectedLot(null);

        try {
            // Search by lot_number (which corresponds to user visible ID)
            const { data, error } = await supabase
                .from('product_lots')
                .select(`
                    *,
                    history:product_lot_history(*)
                `)
                .ilike('lot_number', searchTerm.trim())
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const mappedLot: ProductLot = {
                    id: data.lot_number, // Using lot_number as the display ID
                    productName: data.product_name,
                    creationDate: new Date(data.production_date).toLocaleDateString(),
                    currentStage: data.status, // Assuming status maps to current stage like 'Liberado', etc.
                    history: (data.history || []).map((h: any) => ({
                        id: h.id,
                        stage: h.stage,
                        timestamp: new Date(h.timestamp).toLocaleString(),
                        details: h.details,
                        operator: h.operator,
                        status: h.status
                    })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                };

                setSelectedLot(mappedLot);
            } else {
                setError('No se encontró trazabilidad para el ID/Lote ingresado.');
            }

        } catch (err) {
            console.error(err);
            setError('Error de conexión al consultar el lote.');
            addNotification({ type: 'error', title: 'Error', message: 'Fallo en la consulta de trazabilidad.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <Breadcrumbs crumbs={[{ label: 'Producción', path: '/production/traceability' }, { label: 'Trazabilidad' }]} />
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">Consulta de Trazabilidad</h1>
                <p className="text-slate-500 dark:text-slate-400">Ingrese el ID de Lote o escanee el código QR de la etiqueta.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md mb-8">
                <form onSubmit={handleSearch} className="flex gap-4 items-center max-w-2xl">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <QRIcon />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 p-4 text-sm text-slate-900 bg-slate-50 rounded-lg border border-slate-300 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                            placeholder="Ej: LT-2024-001"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="px-6 py-4 bg-sky-700 hover:bg-sky-800 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-md disabled:opacity-50">
                        {loading ? <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div> : <SearchIcon />} Consultar
                    </button>
                </form>
                {error && <p className="mt-4 text-red-500 font-medium flex items-center gap-2"><XCircleIcon /> {error}</p>}
            </div>

            {selectedLot && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Info */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-xl flex flex-wrap gap-8 justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Lote ID</p>
                            <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{selectedLot.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Producto</p>
                            <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">{selectedLot.productName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Inicio Producción</p>
                            <p className="text-lg text-slate-700 dark:text-slate-300">{selectedLot.creationDate}</p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${selectedLot.history.some(h => h.status === 'NOK') ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {selectedLot.currentStage}
                            </span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative pl-8 border-l-2 border-slate-200 dark:border-slate-700 space-y-8 py-4">
                        {selectedLot.history.map((step, index) => (
                            <div key={step.id} className="relative">
                                {/* Dot */}
                                <div className={`absolute -left-[41px] w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${step.status === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{step.stage}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{step.timestamp}</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 mb-3">{step.details}</p>

                                    <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-sm">
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                            <i className="fas fa-user-hard-hat"></i> {step.operator}
                                        </div>
                                        {step.status === 'OK' ? (
                                            <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircleIcon /> Conforme</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 font-medium"><XCircleIcon /> No Conforme</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Traceability;
