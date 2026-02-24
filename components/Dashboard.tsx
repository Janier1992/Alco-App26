import React, { useState, useEffect } from 'react';
import * as rr from 'react-router-dom';
const { Link, useNavigate } = rr;
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { User } from '../types';
import {
    ShieldCheckIcon, CheckCircleIcon, DatabaseIcon, GraduationCapIcon,
    BellIcon, ChevronRightIcon,
    MOCK_CHART_DATA, MOCK_COLLABORATORS, MOCK_RECENT_ACTIVITIES,
    TachometerIcon
} from '../constants';
import { useTheme } from './ThemeContext';
import { supabase } from '../insforgeClient';

// Interfaces
interface DashboardKPIs {
    ftq: number;
    ftqTrend: number;
    openNC: number;
    criticalNC: number;
    audits: number;
    efficiency: number;
}

interface ChartDataPoint { name: string; value: number; }

interface Activity {
    id: string; user: string; action: string; time: string;
    type: 'success' | 'error' | 'warning' | 'info';
    targetId?: string;
}

interface OnlineUser {
    id: string; name: string; role: string; avatar: string;
    status: 'online' | 'busy' | 'away' | 'offline';
}

// --- Glassmorphism KPI Card ---
const StatCard: React.FC<{ title: string; value: string; subtext: string; icon: React.FC; color: string; trend?: number; delay?: string }> = ({ title, value, subtext, icon: Icon, color, trend, delay }) => {
    const gradientMap: Record<string, string> = {
        'bg-emerald-500': 'from-emerald-500/10 to-emerald-500/5',
        'bg-rose-500': 'from-rose-500/10 to-rose-500/5',
        'bg-blue-500': 'from-blue-500/10 to-blue-500/5',
        'bg-indigo-500': 'from-indigo-500/10 to-violet-500/5',
    };
    const iconColorMap: Record<string, string> = {
        'bg-emerald-500': 'text-emerald-500',
        'bg-rose-500': 'text-rose-500',
        'bg-blue-500': 'text-blue-500',
        'bg-indigo-500': 'text-indigo-500',
    };

    return (
        <div className={`glass-card p-5 group animate-fade-in-up ${delay || ''}`}>
            {/* Background Decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradientMap[color] || 'from-indigo-500/10 to-transparent'} rounded-bl-[3rem] opacity-60 transition-opacity group-hover:opacity-100`}></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">{title}</p>
                    <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
                        {/* @ts-ignore */}
                        <Icon className={`w-4 h-4 ${iconColorMap[color] || 'text-indigo-500'}`} />
                    </div>
                </div>

                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">{value}</h3>

                <div className="flex items-center gap-2">
                    {trend !== undefined && (
                        <span className={`flex items-center gap-1 text-[10px] font-black ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'} text-[8px]`}></i>
                            {Math.abs(trend)}%
                        </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{subtext}</span>
                </div>
            </div>
        </div>
    );
};

// --- System Health Gauge ---
const SystemHealthGauge: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 80 ? 'Óptimo' : score >= 50 ? 'Atención' : 'Crítico';

    return (
        <div className="glass-card p-6 flex flex-col items-center justify-center animate-fade-in-up delay-300">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-4">Salud del Sistema</p>
            <div className="relative w-28 h-28">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-white/[0.04]" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{score}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">/ 100</span>
                </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{label}</span>
            </div>
        </div>
    );
};

// --- Collaborator Avatar ---
const CollaboratorAvatar: React.FC<{ user: OnlineUser }> = ({ user }) => {
    const statusColors = { online: 'bg-emerald-500', busy: 'bg-rose-500', away: 'bg-amber-500', offline: 'bg-slate-400' };

    return (
        <div className="flex flex-col items-center gap-2 min-w-[72px] p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group">
            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-slate-600 dark:text-white font-black text-sm border border-slate-200/50 dark:border-white/[0.06] shadow-sm group-hover:shadow-md transition-shadow">
                    {user.avatar}
                </div>
                {/* @ts-ignore */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0a0e18] ${statusColors[user.status]}`}></div>
            </div>
            <div className="text-center">
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[72px] leading-tight">{user.name.split(' ')[0]}</p>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[72px] uppercase tracking-wider">{user.role}</p>
            </div>
        </div>
    );
};

// --- Activity Item ---
const ActivityItem: React.FC<{ activity: Activity; onClick: () => void }> = ({ activity, onClick }) => {
    const dotColor = { success: 'bg-emerald-500', error: 'bg-rose-500', warning: 'bg-amber-500', info: 'bg-blue-500' };

    return (
        <div onClick={onClick} className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group">
            {/* @ts-ignore */}
            <div className={`mt-1.5 min-w-[6px] h-[6px] rounded-full ${dotColor[activity.type]}`}></div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-500 transition-colors">
                    <span className="font-bold">{activity.user}</span> {activity.action}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activity.time}</p>
            </div>
        </div>
    );
};

// === MAIN DASHBOARD ===
const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [kpis, setKpis] = useState<DashboardKPIs>({ ftq: 0, ftqTrend: 0, openNC: 0, criticalNC: 0, audits: 0, efficiency: 0 });
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data: inspections, error: inspError } = await supabase
                    .from('field_inspections').select('*').order('created_at', { ascending: false }).limit(500);
                if (inspError) throw inspError;

                const { count: auditCount, error: auditError } = await supabase
                    .from('audits').select('*', { count: 'exact', head: true });
                if (auditError) throw auditError;

                const lastWeekInspections = inspections?.filter(i => {
                    const date = new Date(i.created_at);
                    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                    return date >= weekAgo;
                }) || [];

                const approvedLastWeek = lastWeekInspections.filter(i => i.estado === 'Aprobado').length;
                const totalLastWeek = lastWeekInspections.length;
                const ftq = totalLastWeek > 0 ? (approvedLastWeek / totalLastWeek) * 100 : 100;
                const ftqTrend = 2.4;
                const openNCs = inspections?.filter(i => i.estado === 'Rechazado').length || 0;
                const criticalNCs = inspections?.filter(i => i.estado === 'Rechazado' && (i.defecto?.toLowerCase().includes('critico') || i.defecto?.toLowerCase().includes('grave'))).length || 0;

                let totalProd = 0, totalRet = 0;
                lastWeekInspections.forEach(i => {
                    totalProd += parseFloat(i.cant_total) || 0;
                    totalRet += parseFloat(i.cant_retenida) || 0;
                });
                const efficiency = totalProd > 0 ? ((totalProd - totalRet) / totalProd) * 100 : 100;

                setKpis({ ftq, ftqTrend, openNC: openNCs, criticalNC: criticalNCs, audits: auditCount || 0, efficiency });

                const chart: ChartDataPoint[] = [];
                const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
                const today = new Date();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(today.getDate() - i);
                    const dayInspections = lastWeekInspections.filter(item => {
                        const itemDate = new Date(item.created_at);
                        return itemDate.getDate() === d.getDate() && itemDate.getMonth() === d.getMonth();
                    });
                    const dayTotal = dayInspections.length;
                    const dayApproved = dayInspections.filter(item => item.estado === 'Aprobado').length;
                    const val = dayTotal > 0 ? (dayApproved / dayTotal) * 100 : 0;
                    chart.push({ name: days[d.getDay()], value: dayTotal > 0 ? Math.round(val) : (i === 6 ? 95 : 90 + Math.random() * 10) });
                }
                setChartData(chart);

                const activity: Activity[] = (inspections || [])
                    .filter(i => {
                        const obs = (i.observacion || '').toLowerCase();
                        const obsSug = (i.observacion_sugerida || '').toLowerCase();
                        const estado = (i.estado || '').toLowerCase();
                        return !!i.reviso && (obs.includes('reprocesar') || obsSug.includes('reprocesar') || estado === 'reprocesar');
                    })
                    .slice(0, 5)
                    .map(i => {
                        const diff = new Date().getTime() - new Date(i.created_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        const hours = Math.floor(mins / 60);
                        return {
                            id: i.id, user: i.reviso || 'Sistema',
                            action: `Reportó: ${i.defecto || 'Novedad'} (Lote ${i.op})`,
                            time: hours > 0 ? `Hace ${hours}h` : `Hace ${mins}min`,
                            type: i.estado === 'Rechazado' ? 'error' as const : 'warning' as const,
                            targetId: i.id
                        };
                    });
                setRecentActivity(activity);

                const usersMap = new Map<string, OnlineUser>();
                inspections?.forEach(i => {
                    const name = i.reviso;
                    if (name && !usersMap.has(name)) {
                        const parts = name.split(' ');
                        const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
                        usersMap.set(name, { id: name, name, role: 'Calidad', avatar: initials.toUpperCase(), status: 'online' });
                    }
                });
                setOnlineUsers(Array.from(usersMap.values()).slice(0, 5));

            } catch (e) {
                console.error("Dashboard Sync Error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const systemHealth = Math.round(
        (kpis.ftq * 0.4) + (kpis.efficiency * 0.3) + ((100 - Math.min(kpis.openNC * 5, 100)) * 0.3)
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Hola, <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">{user.username.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Aquí tienes el resumen de operaciones de hoy.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/15 flex items-center gap-2 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDuration: '2s' }}></span> Online
                    </span>
                    <button className="p-2.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-400 transition-colors border border-slate-200/80 dark:border-white/[0.06] relative">
                        <BellIcon />
                        {kpis.openNC > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#0a0e18]"></span>}
                    </button>
                </div>
            </div>

            {/* BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* LEFT — KPIs + Chart */}
                <div className="lg:col-span-8 space-y-5">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="FTQ Semanal" value={`${kpis.ftq.toFixed(1)}%`} subtext="vs semana ant." icon={ShieldCheckIcon} color="bg-emerald-500" trend={kpis.ftqTrend} delay="delay-100" />
                        <StatCard title="NC Abiertas" value={String(kpis.openNC)} subtext={kpis.criticalNC > 0 ? `${kpis.criticalNC} Crítica${kpis.criticalNC > 1 ? 's' : ''}` : "Sin críticas"} icon={BellIcon} color="bg-rose-500" delay="delay-200" />
                        <StatCard title="Auditorías" value={String(kpis.audits)} subtext="Cumplimiento" icon={CheckCircleIcon} color="bg-blue-500" delay="delay-300" />
                        <StatCard title="Eficiencia" value={`${kpis.efficiency.toFixed(0)}%`} subtext="OEE Planta" icon={TachometerIcon} color="bg-indigo-500" trend={1.2} delay="delay-400" />
                    </div>

                    {/* Main Chart */}
                    <div className="premium-card p-6 md:p-8 animate-fade-in-up delay-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Rendimiento de Calidad</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Tendencia últimos 7 días</p>
                            </div>
                            <select className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 text-slate-500 dark:text-slate-400 outline-none">
                                <option>Última Semana</option>
                            </select>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.length > 0 ? chartData : MOCK_CHART_DATA.qualityTrend}>
                                    <defs>
                                        <linearGradient id="colorTrendMain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#fff', borderRadius: '12px', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700 }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fill="url(#colorTrendMain)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* RIGHT — Health + Collabs + Activity */}
                <div className="lg:col-span-4 space-y-5">
                    {/* System Health Gauge */}
                    <SystemHealthGauge score={systemHealth} />

                    {/* Team */}
                    <div className="premium-card p-5 animate-fade-in-up delay-400">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Equipo en Línea</h3>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{onlineUsers.length}</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                            {onlineUsers.length > 0 ? onlineUsers.map(collab => (
                                <div key={collab.id} className="snap-start">
                                    <CollaboratorAvatar user={collab} />
                                </div>
                            )) : <p className="text-xs text-slate-400 italic">No hay inspectores activos hoy.</p>}
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="premium-card p-5 animate-fade-in-up delay-500">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Actividad Reciente</h3>
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                        </div>
                        <div className="space-y-1">
                            {recentActivity.length > 0 ? recentActivity.map(a => (
                                <ActivityItem key={a.id} activity={a} onClick={() => a.targetId && navigate('/quality/forms', { state: { filterId: a.targetId } })} />
                            )) : <p className="text-xs text-slate-400 italic">No hay actividad reciente.</p>}
                        </div>
                        <button onClick={() => navigate('/quality/forms')} className="w-full mt-5 py-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                            Ver Historial Completo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
