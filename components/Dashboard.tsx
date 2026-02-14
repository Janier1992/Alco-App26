import React from 'react';
import * as rr from 'react-router-dom';
const { Link } = rr;
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { User } from '../types';
import {
    ShieldCheckIcon, CheckCircleIcon, DatabaseIcon, GraduationCapIcon,
    BellIcon, ChevronRightIcon,
    MOCK_CHART_DATA, MOCK_COLLABORATORS, MOCK_RECENT_ACTIVITIES,
    TachometerIcon
} from '../constants';
import { useTheme } from './ThemeContext';

const StatCard: React.FC<{ title: string; value: string; subtext: string; icon: React.FC; color: string }> = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="premium-card p-6 group hover:-translate-y-1 transition-all duration-300 shadow-sm relative overflow-hidden">
        <div className={`absolute top-4 right-4 p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100 transition-transform group-hover:scale-110`}>
            {/* @ts-ignore */}
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
            <span className={`w-1.5 h-1.5 rounded-full ${color}`}></span> {subtext}
        </p>
    </div>
);

const CollaboratorAvatar: React.FC<{ user: typeof MOCK_COLLABORATORS[0] }> = ({ user }) => {
    const statusColors = {
        online: 'bg-emerald-500',
        busy: 'bg-rose-500',
        away: 'bg-amber-500',
        offline: 'bg-slate-400'
    };

    return (
        <div className="flex flex-col items-center gap-2 min-w-[80px] p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all transition-colors cursor-pointer">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-slate-600 dark:text-white font-black text-sm border border-white dark:border-white/10 shadow-md">
                    {user.avatar}
                </div>
                {/* @ts-ignore */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0b0b14] shadow-sm ${statusColors[user.status]}`}></div>
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black text-slate-700 dark:text-slate-100 truncate max-w-[80px] leading-tight uppercase tracking-tight">{user.name.split(' ')[0]}</p>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[80px] uppercase tracking-widest">{user.role}</p>
            </div>
        </div>
    );
};

const ActivityItem: React.FC<{ activity: typeof MOCK_RECENT_ACTIVITIES[0] }> = ({ activity }) => {
    const typeStyles = {
        success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };

    return (
        <div className="flex gap-4 items-start p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-default">

            <div className={`mt-1 min-w-[8px] h-2 rounded-full ${activity.type === 'success' ? 'bg-emerald-500' : activity.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    <span className="text-slate-500 dark:text-slate-400 font-normal">{activity.user}</span> {activity.action}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activity.time}</p>
            </div>
            {/* @ts-ignore */}
            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${typeStyles[activity.type]}`}>
                {activity.type}
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { theme } = useTheme();

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* HEADER & WELCOME */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Hola, <span className="text-[#5d5fef]">{user.username.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Aquí tienes el resumen de operaciones de hoy.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Operativo
                    </span>
                    <button className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-400 transition-colors border border-slate-200 dark:border-white/5 relative">
                        <BellIcon />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#0f172a]"></span>
                    </button>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN (STATS & CHART) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="FTQ Semanal" value="98.2%" subtext="+2.4% vs semana ant." icon={ShieldCheckIcon} color="bg-emerald-500" />
                        <StatCard title="NC Abiertas" value="3" subtext="1 Crítica pendiente" icon={BellIcon} color="bg-rose-500" />
                        <StatCard title="Auditorías" value="12" subtext="Cumplimiento 100%" icon={CheckCircleIcon} color="bg-blue-500" />
                        <StatCard title="Eficiencia" value="94%" subtext="OEE Planta General" icon={TachometerIcon} color="bg-[#5d5fef]" />
                    </div>

                    {/* MAIN CHART */}
                    <div className="premium-card p-6 md:p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Rendimiento de Calidad</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Tendencia de los últimos 7 días</p>
                            </div>
                            <select className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 text-slate-600 dark:text-slate-300 outline-none">
                                <option>Última Semana</option>
                                <option>Último Mes</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_CHART_DATA.qualityTrend}>
                                    <defs>
                                        <linearGradient id="colorTrendMain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#5d5fef" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#5d5fef" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                                    <YAxis hide domain={[80, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0b0b14' : '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#5d5fef" strokeWidth={4} fill="url(#colorTrendMain)" animationDuration={2000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (ACTIVITY & COLLABS) */}
                <div className="lg:col-span-4 space-y-8">

                    {/* COLLABORATORS */}
                    <div className="premium-card p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipo en Línea</h3>
                            <button className="text-[#5d5fef] text-[10px] font-black uppercase tracking-widest hover:underline">Ver Todos</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
                            {MOCK_COLLABORATORS.map(collab => (
                                <div key={collab.id} className="snap-start">
                                    <CollaboratorAvatar user={collab} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ACTIVITY FEED */}
                    <div className="premium-card p-6 shadow-sm flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actividad Reciente</h3>
                            <div className="w-2 h-2 rounded-full bg-[#5d5fef] animate-ping"></div>
                        </div>
                        <div className="space-y-2">
                            {MOCK_RECENT_ACTIVITIES.map(bg => (
                                <ActivityItem key={bg.id} activity={bg} />
                            ))}
                        </div>
                        <button className="w-full mt-8 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            Ver Historial Completo
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
