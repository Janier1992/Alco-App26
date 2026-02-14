import React, { useState, useEffect } from 'react';
import { supabase } from '../insforgeClient';
import { useNotification } from './NotificationSystem';
import Breadcrumbs from './Breadcrumbs';
import {
    CogIcon, PlusIcon, TrashIcon, SaveIcon, RefreshIcon,
    DatabaseIcon, UserCircleIcon, ClipboardListIcon, WrenchIcon
} from '../constants';

interface MasterDataItem {
    id: string;
    category: string;
    label: string;
    value: string;
    is_active: boolean;
}

const CATEGORIES = [
    { id: 'AREAS_PROCESO', label: 'Áreas de Proceso', icon: ClipboardListIcon },
    { id: 'DEFECTO_TYPES', label: 'Tipos de Defecto', icon: WrenchIcon },
    { id: 'OPERARIO_RESPONSABLES', label: 'Operarios / Responsables', icon: UserCircleIcon },
    { id: 'REGISTRO_USERS', label: 'Usuarios de Registro', icon: CogIcon }
];

const AdminSettings: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');

    useEffect(() => {
        fetchItems();
    }, [activeCategory]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('master_data')
                .select('*')
                .eq('category', activeCategory)
                .order('label', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist yet
                    setItems([]);
                } else {
                    throw error;
                }
            } else {
                setItems(data || []);
            }
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR DE CARGA', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemLabel.trim()) return;

        try {
            const val = newItemLabel.trim().toUpperCase();
            const { error } = await supabase
                .from('master_data')
                .insert([{
                    category: activeCategory,
                    label: val,
                    value: val,
                    is_active: true
                }]);

            if (error) throw error;

            setNewItemLabel('');
            fetchItems();
            addNotification({ type: 'success', title: 'REGISTRO GUARDADO', message: `"${val}" se ha añadido a la lista.` });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL GUARDAR', message: error.message });
        }
    };

    const handleDeleteItem = async (id: string, label: string) => {
        if (!confirm(`¿Desea eliminar permanentemente "${label}"?`)) return;
        try {
            const { error } = await supabase
                .from('master_data')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchItems();
            addNotification({ type: 'success', title: 'REGISTRO ELIMINADO', message: 'La entrada ha sido borrada.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL ELIMINAR', message: error.message });
        }
    };

    const inputStyles = "w-full p-4 bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 uppercase transition-all";

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <Breadcrumbs crumbs={[{ label: 'Sistema', path: '/dashboard' }, { label: 'CONFIGURACIÓN' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Ajustes del <span className="text-sky-600">Sistema</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 italic">
                        <CogIcon className="text-sky-600" /> Gestión Centralizada de Datos Maestros y Tablas de Referencia
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navegación de Categorías */}
                <div className="lg:col-span-4 space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Directorios Maestros</h3>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all border ${activeCategory === cat.id
                                ? 'bg-sky-600 text-white border-sky-500 shadow-xl shadow-sky-600/20 scale-[1.02]'
                                : 'bg-white dark:bg-alco-surface text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <cat.icon className={activeCategory === cat.id ? 'text-white' : 'text-sky-500'} />
                            <span className="text-xs font-black uppercase tracking-tight">{cat.label}</span>
                        </button>
                    ))}

                    <div className="mt-10 p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest">
                            <DatabaseIcon className="scale-75" /> Nota Técnica
                        </div>
                        <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 font-bold leading-relaxed">
                            Los cambios realizados aquí afectan globalmente a los menús de selección en los módulos de Inspección, No Conformidades y Metrología.
                        </p>
                    </div>
                </div>

                {/* Editor de Items */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-alco-surface rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden animate-fade-in">
                        <div className="p-8 border-b dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <form onSubmit={handleAddItem} className="flex gap-4">
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        className={inputStyles}
                                        placeholder={`NUEVO ELEMENTO PARA ${CATEGORIES.find(c => c.id === activeCategory)?.label}...`}
                                        value={newItemLabel}
                                        onChange={e => setNewItemLabel(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-8 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <PlusIcon /> Añadir
                                </button>
                            </form>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                    <RefreshIcon className="animate-spin text-sky-600 size-10" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Consultando Base de Datos...</p>
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-20">
                                    <DatabaseIcon className="mx-auto text-4xl text-slate-200 dark:text-slate-800 mb-4" />
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">No se han encontrado registros</p>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-2">La tabla `master_data` podría no estar inicializada.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {items.map(item => (
                                        <div key={item.id} className="group p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-sky-500/50 transition-all">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.label}</span>
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.label)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                            >
                                                <TrashIcon className="scale-75" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border-t dark:border-white/5 text-right font-black text-[9px] text-slate-400 uppercase tracking-widest">
                            Total de registros: {items.length}
                        </div>
                    </div>

                    {/* Botón de Migración Inicial (Demo) */}
                    {items.length === 0 && !loading && (
                        <div className="mt-8 p-8 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] text-center space-y-6">
                            <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                                Parece que no hay datos maestros cargados. Puede poblar la base de datos con los valores predeterminados de la App.
                            </p>
                            <button
                                onClick={async () => {
                                    // Mock migration logic - in a real app this would call a set of inserts
                                    addNotification({ type: 'info', title: 'IMPORTACIÓN', message: 'Iniciando carga de valores predeterminados...' });
                                }}
                                className="px-10 py-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                <SaveIcon className="inline mr-2" /> Poblar Datos Predeterminados
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
