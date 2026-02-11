
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_CHART_DATA, TrashIcon, EditIcon, PlusIcon, CheckCircleIcon, ExclamationTriangleIcon, RefreshIcon, SaveIcon } from '../constants';
import Breadcrumbs from './Breadcrumbs';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationSystem';

interface KpiTarget {
    id: string;
    kpi: string;
    target: string;
    status: 'Conforme' | 'Crítico' | 'Alerta';
}

const Indicators: React.FC = () => {
    const { theme } = useTheme();
    const { addNotification } = useNotification();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const axisColor = theme === 'dark' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';

    const [targets, setTargets] = useState<KpiTarget[]>([
        { id: '1', kpi: 'Eficiencia de Corte', target: '98%', status: 'Conforme' },
        { id: '2', kpi: 'Rechazos de Pintura', target: '< 2%', status: 'Alerta' },
        { id: '3', kpi: 'Aprovechamiento Cristal', target: '92%', status: 'Crítico' }
    ]);

    const handleDeleteTarget = (id: string) => {
        if (confirm('¿Eliminar este umbral de control?')) {
            setTargets(prev => prev.filter(t => t.id !== id));
            addNotification({ type: 'error', title: 'UMBRAL ELIMINADO', message: 'El indicador ha sido removido del tablero de control.' });
        }
    };

    const handleAddTarget = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const newTarget: KpiTarget = {
            id: Date.now().toString(),
            kpi: formData.get('kpi') as string,
            target: formData.get('target') as string,
            status: formData.get('status') as any
        };
        setTargets([newTarget, ...targets]);
        setIsAddModalOpen(false);
        addNotification({ type: 'success', title: 'UMBRAL ESTABLECIDO', message: `Nueva meta para ${newTarget.kpi} incorporada.` });
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none uppercase transition-all";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'DASHBOARDS', path: '/dashboard' }, { label: 'KPIs ESTRATÉGICOS' }]} />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Dashboards <span className="text-sky-600">Estratégicos</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest italic">Performance Operativo en Tiempo Real - Alco Proyectos</p>
                </div>
                <div className="flex gap-2 p-1.5 bg-white dark:bg-alco-surface rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                    <button className="px-6 py-2 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-600/20">Planta 1</button>
                    <button className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase hover:text-sky-600 transition-colors">Planta 2</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                    { l: 'OEE Global', v: '94.2%', t: '▲ 2.1%', c: 'text-emerald-500', bc: 'border-emerald-500' },
                    { l: 'Tasa de Defectos', v: '1.4%', t: '▼ 0.3%', c: 'text-rose-500', bc: 'border-rose-500' },
                    { l: 'Eficiencia Cristal', v: '88.5%', t: '▲ 4.2%', c: 'text-sky-500', bc: 'border-sky-500' },
                    { l: 'Cierre de CAPAs', v: '100%', t: 'ESTABLE', c: 'text-indigo-500', bc: 'border-indigo-500' }
                 ].map((stat, i) => (
                    <div key={i} className={`bg-white dark:bg-alco-surface p-8 rounded-[2.5rem] shadow-sm border-l-8 ${stat.bc} transition-all hover:shadow-xl hover:-translate-y-1`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.l}</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{stat.v}</p>
                        <p className={`text-[10px] font-black ${stat.c} uppercase mt-2`}>{stat.t} vs mes anterior</p>
                    </div>
                 ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white dark:bg-alco-surface p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-center mb-10">
                        <div><h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3"><RefreshIcon className="text-sky-600" /> Deriva de Conformidad Semanal</h3></div>
                        <div className="flex gap-2"><span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase">LIVE FEED</span></div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MOCK_CHART_DATA.qualityTrend}>
                                <defs><linearGradient id="colorInd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="name" stroke={axisColor} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis domain={[90, 100]} stroke={axisColor} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorInd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-alco-surface p-8 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-white/5 flex flex-col transition-all">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black uppercase tracking-tighter">Umbrales de Control</h3>
                        <button onClick={() => setIsAddModalOpen(true)} className="size-10 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-xl flex items-center justify-center hover:bg-sky-600 hover:text-white transition-all shadow-sm"><PlusIcon /></button>
                    </div>
                    <div className="space-y-4 flex-grow custom-scrollbar overflow-y-auto">
                        {targets.map(t => (
                            <div key={t.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center group animate-fade-in">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t.kpi}</p>
                                    <p className="text-lg font-black text-slate-800 dark:text-white tracking-tighter">Meta: {t.target}</p>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'Conforme' ? 'bg-emerald-100 text-emerald-700' : t.status === 'Crítico' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                                </div>
                                <button onClick={() => handleDeleteTarget(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-all"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[2500] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white dark:bg-[#0b0b14] rounded-[4rem] max-w-lg w-full p-12 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-white/5 relative overflow-hidden my-auto">
                        <div className="flex justify-between items-start mb-10">
                            <div><h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Nuevo <span className="text-sky-600">Umbral</span></h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Parámetro de Calidad Alco</p></div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleAddTarget} className="space-y-6">
                            <div><label className={labelStyles}>Nombre del KPI</label><input required name="kpi" className={inputStyles} placeholder="EJ: MERMA ALUMINIO" /></div>
                            <div><label className={labelStyles}>Valor Meta</label><input required name="target" className={inputStyles} placeholder="EJ: < 3%" /></div>
                            <div><label className={labelStyles}>Estatus Inicial</label><select name="status" className={inputStyles}><option>Conforme</option><option>Alerta</option><option>Crítico</option></select></div>
                            <button type="submit" className="w-full py-5 bg-sky-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"><SaveIcon /> Guardar Parámetro</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Indicators;
