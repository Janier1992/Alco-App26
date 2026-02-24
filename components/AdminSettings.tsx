import React, { useState, useEffect } from 'react';
import { supabase } from '../insforgeClient';
import { useNotification } from './NotificationSystem';
import { useConfirmDialog } from './ConfirmDialog';
import Breadcrumbs from './Breadcrumbs';
import EmptyState from './EmptyState';
import {
    CogIcon, PlusIcon, TrashIcon, SaveIcon, RefreshIcon,
    DatabaseIcon, UserCircleIcon, ClipboardListIcon, WrenchIcon, SearchIcon
} from '../constants';

interface MasterDataItem {
    id: string;
    category: string;
    label: string;
    value: string;
    is_active: boolean;
}

const CATEGORIES = [
    { id: 'AREAS_PROCESO', label: 'Áreas de Proceso', icon: ClipboardListIcon, desc: 'Zonas productivas de la planta' },
    { id: 'DEFECTO_TYPES', label: 'Tipos de Defecto', icon: WrenchIcon, desc: 'Catálogo de defectos para inspección' },
    { id: 'OPERARIO_RESPONSABLES', label: 'Operarios / Responsables', icon: UserCircleIcon, desc: 'Personal autorizado para registro' },
    { id: 'REGISTRO_USERS', label: 'Usuarios de Registro', icon: CogIcon, desc: 'Cuentas de acceso al sistema' }
];

const AdminSettings: React.FC = () => {
    const { addNotification } = useNotification();
    const { confirm } = useConfirmDialog();
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { fetchItems(); }, [activeCategory]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('master_data').select('*')
                .eq('category', activeCategory)
                .order('label', { ascending: true });
            if (error) {
                if (error.code === '42P01') { setItems([]); } else { throw error; }
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
            const { error } = await supabase.from('master_data').insert([{
                category: activeCategory, label: val, value: val, is_active: true
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
        const confirmed = await confirm({
            title: 'Eliminar registro',
            message: `¿Desea eliminar permanentemente "${label}"? Este cambio afectará los formularios de inspección.`,
            variant: 'danger',
            confirmLabel: 'Eliminar',
            icon: 'fa-trash-alt'
        });
        if (!confirmed) return;
        try {
            const { error } = await supabase.from('master_data').delete().eq('id', id);
            if (error) throw error;
            fetchItems();
            addNotification({ type: 'success', title: 'REGISTRO ELIMINADO', message: 'La entrada ha sido borrada.' });
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR AL ELIMINAR', message: error.message });
        }
    };

    const handleToggleActive = async (item: MasterDataItem) => {
        try {
            const { error } = await supabase.from('master_data').update({ is_active: !item.is_active }).eq('id', item.id);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
        } catch (error: any) {
            addNotification({ type: 'error', title: 'ERROR', message: error.message });
        }
    };

    const filteredItems = items.filter(i => i.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const activeCat = CATEGORIES.find(c => c.id === activeCategory);

    const inputStyles = "w-full p-4 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/40 uppercase transition-all";

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <Breadcrumbs crumbs={[{ label: 'Sistema', path: '/dashboard' }, { label: 'CONFIGURACIÓN' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Ajustes del <span className="text-indigo-500">Sistema</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 italic">
                        <CogIcon className="text-indigo-500" /> Gestión Centralizada de Datos Maestros y Tablas de Referencia
                    </p>
                </div>
                <button onClick={() => fetchItems()} className="p-4 premium-card text-slate-400 hover:text-indigo-500 transition-all">
                    <RefreshIcon />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Category Navigation */}
                <div className="lg:col-span-4 space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Directorios Maestros</h3>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                            className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all border ${activeCategory === cat.id
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500/50 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                                : 'bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <cat.icon className={activeCategory === cat.id ? 'text-white' : 'text-indigo-500'} />
                            <div className="text-left">
                                <span className="text-xs font-black uppercase tracking-tight block">{cat.label}</span>
                                <span className={`text-[9px] font-medium ${activeCategory === cat.id ? 'text-white/70' : 'text-slate-400'}`}>{cat.desc}</span>
                            </div>
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

                {/* Items Editor */}
                <div className="lg:col-span-8">
                    <div className="premium-card overflow-hidden animate-fade-in">
                        {/* Add Form + Search */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
                            <form onSubmit={handleAddItem} className="flex gap-3">
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        className={inputStyles}
                                        placeholder={`NUEVO ELEMENTO PARA ${activeCat?.label}...`}
                                        value={newItemLabel}
                                        onChange={e => setNewItemLabel(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2">
                                    <PlusIcon /> Añadir
                                </button>
                            </form>
                            {items.length > 5 && (
                                <div className="relative">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/40 uppercase"
                                        placeholder="FILTRAR REGISTROS..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Items List */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                    <RefreshIcon className="animate-spin text-indigo-500 size-10" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Consultando Base de Datos...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <EmptyState icon={DatabaseIcon} title="Sin registros" subtitle={searchTerm ? `No hay coincidencias para "${searchTerm}"` : 'La tabla `master_data` podría no estar inicializada.'} />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredItems.map(item => (
                                        <div key={item.id} className={`group p-4 rounded-2xl flex items-center justify-between transition-all border ${item.is_active
                                            ? 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:border-indigo-500/30'
                                            : 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-100/50 dark:border-white/[0.03] opacity-50'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => handleToggleActive(item)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${item.is_active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <span className={`absolute top-0.5 ${item.is_active ? 'left-5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow transition-all`}></span>
                                                </button>
                                                <span className={`text-xs font-bold uppercase tracking-tight ${item.is_active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{item.label}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteItem(item.id, item.label)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <TrashIcon className="scale-75" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {filteredItems.filter(i => i.is_active).length} activos / {items.length} total
                            </span>
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{activeCat?.label}</span>
                        </div>
                    </div>

                    {/* Initial Migration */}
                    {items.length === 0 && !loading && (
                        <div className="mt-8 p-8 border-2 border-dashed border-slate-200 dark:border-white/[0.06] rounded-[2.5rem] text-center space-y-6">
                            <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed">
                                Parece que no hay datos maestros cargados. Puede poblar la base de datos con los valores predeterminados de la App.
                            </p>
                            <button
                                onClick={async () => {
                                    addNotification({ type: 'info', title: 'IMPORTACIÓN', message: 'Iniciando carga de valores predeterminados...' });
                                }}
                                className="px-10 py-5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
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
