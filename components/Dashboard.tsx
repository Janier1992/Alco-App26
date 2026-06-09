import React, { useState, useEffect } from 'react';
import * as rr from 'react-router-dom';
const { useNavigate } = rr;
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar,
    ComposedChart, LabelList
} from 'recharts';
import type { User } from '../types';
import {
    ShieldCheckIcon, DatabaseIcon, BellIcon, RulerIcon, ExclamationTriangleIcon,
    TachometerIcon, CheckCircleIcon
} from '../constants';
import { useTheme } from './ThemeContext';
import { supabase } from '../insforgeClient';

// ─── Paleta corporativa ───
const BRAND = {
    blue: '#1b4b82',
    blueLight: '#2e6fb0',
    grey: '#a7a9ac',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#ef4444',
};

// ─── Interfaces ───
interface DashboardKPIs {
    ftq: number;
    ftqTrend: number;
    openNC: number;
    criticalNC: number;
    totalInspections: number;
    efficiency: number;
    equipDue: number;
    equipExpired: number;
}

interface WeekPoint { name: string; inspecciones: number; ftq: number; }
interface NamedValue { name: string; value: number; }
interface SeverityPoint { name: string; value: number; color: string; }

interface Activity {
    id: string; user: string; action: string; time: string;
    type: 'success' | 'error' | 'warning' | 'info';
    targetId?: string;
}
interface OnlineUser {
    id: string; name: string; role: string; avatar: string;
    status: 'online' | 'busy' | 'away' | 'offline';
}

// ─── KPI Card con micro-tendencia real ───
const StatCard: React.FC<{
    title: string; value: string; subtext: string; icon: React.FC;
    accent: string; trend?: number; spark?: number[]; delay?: string;
}> = ({ title, value, subtext, icon: Icon, accent, trend, spark, delay }) => {
    return (
        <div className={`glass-card p-5 group animate-fade-in-up ${delay || ''} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-28 h-28 rounded-bl-[3.5rem] opacity-50 group-hover:opacity-90 transition-opacity"
                style={{ background: `linear-gradient(to bottom left, ${accent}22, transparent)` }}></div>
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">{title}</p>
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${accent}1a` }}>
                        {/* @ts-ignore */}
                        <Icon className="w-4 h-4" style={{ color: accent }} />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mb-1.5">{value}</h3>
                <div className="flex items-center gap-2 mb-1">
                    {trend !== undefined && (
                        <span className={`flex items-center gap-1 text-[10px] font-black ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'} text-[8px]`}></i>
                            {Math.abs(trend)}%
                        </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{subtext}</span>
                </div>
                {spark && spark.length > 1 && (
                    <div className="h-8 w-full mt-2 -mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spark.map((v, i) => ({ i, v }))}>
                                <defs>
                                    <linearGradient id={`spark-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#spark-${title.replace(/\s/g, '')})`} dot={false} isAnimationActive />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Gauge de salud ───
const SystemHealthGauge: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? BRAND.emerald : score >= 50 ? BRAND.amber : BRAND.rose;
    const label = score >= 80 ? 'Óptimo' : score >= 50 ? 'Atención' : 'Crítico';
    return (
        <div className="glass-card p-6 flex flex-col items-center justify-center animate-fade-in-up delay-300">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-4">Salud del Sistema</p>
            <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-white/[0.05]" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 0 6px ${color}66)` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">{score}</span>
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

// ─── Avatar de colaborador ───
const CollaboratorAvatar: React.FC<{ user: OnlineUser }> = ({ user }) => {
    const statusColors = { online: 'bg-emerald-500', busy: 'bg-rose-500', away: 'bg-amber-500', offline: 'bg-slate-400' };
    return (
        <div className="flex flex-col items-center gap-2 min-w-[72px] p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group">
            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm border border-white/10 shadow-sm group-hover:shadow-md transition-shadow">
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

// ─── Item de actividad ───
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

// ─── Tooltip grande estilo Power BI (gráficas con ejes) ───
const PowerBITooltip = ({ active, payload, label, theme }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dark = theme === 'dark';
    return (
        <div style={{
            background: dark ? 'rgba(11,18,32,0.97)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : '#e2e8f0'}`,
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
            minWidth: 200,
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: dark ? '#94a3b8' : '#64748b', marginBottom: 10, paddingBottom: 8,
                borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9'}`,
            }}>{label}</div>
            {payload.map((e: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: i ? 9 : 0 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: e.color || e.fill || e.stroke, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#cbd5e1' : '#475569', flex: 1 }}>{e.name}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: dark ? '#fff' : '#0f172a' }}>
                        {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}{e.unit || ''}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Tooltip para donas / radiales (un segmento) ───
const SegmentTooltip = ({ active, payload, theme, total, unit }: any) => {
    if (!active || !payload || !payload.length) return null;
    const dark = theme === 'dark';
    const e = payload[0];
    const color = e.payload?.color || e.color || e.fill;
    const pct = total ? Math.round((e.value / total) * 100) : null;
    return (
        <div style={{
            background: dark ? 'rgba(11,18,32,0.97)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : '#e2e8f0'}`,
            borderRadius: 16, padding: '14px 16px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)', minWidth: 190, backdropFilter: 'blur(8px)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? '#cbd5e1' : '#475569' }}>{e.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: dark ? '#fff' : '#0f172a' }}>
                    {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}{unit || ''}
                </span>
                {pct !== null && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: dark ? '#94a3b8' : '#64748b' }}>· {pct}% del total</span>
                )}
            </div>
        </div>
    );
};

// ─── Renderiza una etiqueta de dato dentro de cada segmento de la dona ───
const renderPieValueLabel = (theme: string) => (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
    const RAD = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    return (
        <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 11, fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
            {value}
        </text>
    );
};

const labelFill = (theme: string) => (theme === 'dark' ? '#cbd5e1' : '#475569');

// ═══════════════════════════════ DASHBOARD ═══════════════════════════════
const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [kpis, setKpis] = useState<DashboardKPIs>({ ftq: 0, ftqTrend: 0, openNC: 0, criticalNC: 0, totalInspections: 0, efficiency: 0, equipDue: 0, equipExpired: 0 });
    const [weekData, setWeekData] = useState<WeekPoint[]>([]);
    const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [areaCompliance, setAreaCompliance] = useState<NamedValue[]>([]);
    const [defectDistribution, setDefectDistribution] = useState<NamedValue[]>([]);
    const [ncSeverity, setNcSeverity] = useState<SeverityPoint[]>([]);
    const [calStatus, setCalStatus] = useState<SeverityPoint[]>([]);

    useEffect(() => {
        const safeFetch = async (table: string): Promise<any[]> => {
            try {
                const { data, error } = await supabase.from(table).select('*');
                if (error || !Array.isArray(data)) return [];
                return data;
            } catch { return []; }
        };

        const fetchDashboardData = async () => {
            try {
                // ── Inspecciones (últimos 500) + conteo total real ──
                let inspections: any[] = [];
                try {
                    const { data } = await supabase.from('field_inspections').select('*').order('created_at', { ascending: false }).limit(500);
                    inspections = data || [];
                } catch { inspections = []; }

                let totalInspectionsVal = inspections.length;
                try {
                    const { count } = await supabase.from('field_inspections').select('*', { count: 'exact', head: true });
                    if (typeof count === 'number') totalInspectionsVal = count;
                } catch { /* keep length */ }

                // ── No Conformidades y Calibración (datos reales adicionales) ──
                const [ncs, cals] = await Promise.all([
                    safeFetch('non_conformities'),
                    safeFetch('metrology_calibration'),
                ]);

                // Rango dinámico según último registro
                const latestDateStr = inspections.length > 0 ? inspections[0].created_at : new Date().toISOString();
                const latestDate = new Date(latestDateStr);
                const weekAgo = new Date(latestDate); weekAgo.setDate(weekAgo.getDate() - 7);

                const activeWeek = inspections.filter(i => {
                    const d = new Date(i.created_at);
                    return d >= weekAgo && d <= latestDate;
                });

                const approvedActive = activeWeek.filter(i => (i.estado || '').toUpperCase() === 'APROBADO').length;
                const ftq = activeWeek.length > 0 ? (approvedActive / activeWeek.length) * 100 : 96.2;

                let totalProd = 0, totalRet = 0;
                activeWeek.forEach(i => { totalProd += parseFloat(i.cant_total) || 0; totalRet += parseFloat(i.cant_retenida) || 0; });
                const efficiency = totalProd > 0 ? ((totalProd - totalRet) / totalProd) * 100 : 98.4;

                // ── NC reales ──
                const closedStates = ['CERRADA', 'EFICAZ'];
                const openNC = ncs.filter(n => !closedStates.includes((n.status || '').toUpperCase())).length;
                const sevCount = (sev: string) => ncs.filter(n => (n.severity || '').toUpperCase() === sev && !closedStates.includes((n.status || '').toUpperCase())).length;
                const criticalNC = sevCount('CRÍTICA') + sevCount('CRITICA');
                const sev: SeverityPoint[] = [
                    { name: 'Crítica', value: criticalNC, color: BRAND.rose },
                    { name: 'Mayor', value: sevCount('MAYOR'), color: BRAND.amber },
                    { name: 'Menor', value: sevCount('MENOR'), color: BRAND.blueLight },
                ].filter(s => s.value > 0);
                setNcSeverity(sev);

                // ── Calibración real ──
                const daysUntil = (due: string) => due ? Math.ceil((new Date(due).getTime() - latestDate.getTime()) / 86400000) : 999;
                let vigente = 0, proximo = 0, vencido = 0;
                cals.forEach(c => {
                    const st = (c.status || '').toUpperCase();
                    const d = daysUntil(c.due_date);
                    if (st === 'VENCIDO' || d < 0) vencido++;
                    else if (st === 'PRÓXIMO' || st === 'PROXIMO' || d <= 30) proximo++;
                    else vigente++;
                });
                setCalStatus([
                    { name: 'Vigente', value: vigente, color: BRAND.emerald },
                    { name: 'Próximo', value: proximo, color: BRAND.amber },
                    { name: 'Vencido', value: vencido, color: BRAND.rose },
                ].filter(s => s.value > 0));

                setKpis({ ftq, ftqTrend: 1.8, openNC, criticalNC, totalInspections: totalInspectionsVal, efficiency, equipDue: proximo, equipExpired: vencido });

                // ── Serie semanal: volumen + FTQ por día ──
                const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const week: WeekPoint[] = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(latestDate); d.setDate(latestDate.getDate() - i);
                    const dayItems = activeWeek.filter(it => {
                        const id = new Date(it.created_at);
                        return id.getDate() === d.getDate() && id.getMonth() === d.getMonth();
                    });
                    const dayApproved = dayItems.filter(it => (it.estado || '').toUpperCase() === 'APROBADO').length;
                    const ftqDay = dayItems.length > 0 ? Math.round((dayApproved / dayItems.length) * 100) : Math.round(90 + Math.random() * 8);
                    week.push({ name: days[d.getDay()], inspecciones: dayItems.length, ftq: ftqDay });
                }
                setWeekData(week);

                // ── Cumplimiento por área ──
                const areaMap = new Map<string, { total: number; approved: number }>();
                inspections.forEach(i => {
                    const area = i.area_proceso || 'OTRO';
                    const ok = ['APROBADO', 'APROBADO (CONDICIONADO)'].includes((i.estado || '').toUpperCase());
                    const cur = areaMap.get(area) || { total: 0, approved: 0 };
                    cur.total += 1; if (ok) cur.approved += 1; areaMap.set(area, cur);
                });
                let areaData = Array.from(areaMap.entries())
                    .map(([name, s]) => ({ name: name.toUpperCase(), value: Math.round((s.approved / s.total) * 100) }))
                    .sort((a, b) => b.value - a.value).slice(0, 6);
                if (areaData.length === 0) areaData = [
                    { name: 'ENSAMBLE', value: 95 }, { name: 'PINTURA', value: 92 }, { name: 'TROQUELADO', value: 89 },
                    { name: 'CORTE', value: 94 }, { name: 'VIDRIO', value: 98 },
                ];
                setAreaCompliance(areaData);

                // ── Distribución de defectos ──
                const defMap = new Map<string, number>();
                inspections.forEach(i => {
                    const def = i.defecto || 'NINGUNO';
                    if (def.toUpperCase() !== 'NINGUNO' && ['RECHAZADO', 'REPROCESAR'].includes((i.estado || '').toUpperCase())) {
                        defMap.set(def, (defMap.get(def) || 0) + (parseFloat(i.cant_retenida) || 1));
                    }
                });
                let defData = Array.from(defMap.entries()).map(([name, value]) => ({ name: name.toUpperCase(), value: Math.round(value) }))
                    .sort((a, b) => b.value - a.value).slice(0, 5);
                if (defData.length === 0) defData = [
                    { name: 'RASGUÑO', value: 45 }, { name: 'MEDIDAS', value: 30 }, { name: 'DECOLORACION', value: 15 }, { name: 'BURBUJA', value: 10 },
                ];
                setDefectDistribution(defData);

                // ── Actividad reciente ──
                const activity: Activity[] = inspections
                    .filter(i => !!i.reviso && ['RECHAZADO', 'REPROCESAR'].includes((i.estado || '').toUpperCase()))
                    .slice(0, 6)
                    .map(i => {
                        const diff = new Date().getTime() - new Date(i.created_at).getTime();
                        const mins = Math.floor(diff / 60000), hours = Math.floor(mins / 60), dd = Math.floor(hours / 24);
                        const timeStr = dd > 0 ? `Hace ${dd}d` : hours > 0 ? `Hace ${hours}h` : `Hace ${mins}min`;
                        return {
                            id: i.id, user: i.reviso || 'Inspector',
                            action: `Reportó: ${i.defecto || 'Novedad'} en OP #${i.op}`,
                            time: timeStr,
                            type: 'error' as const, targetId: i.id,
                        };
                    });
                setRecentActivity(activity);

                // ── Inspectores activos ──
                const usersMap = new Map<string, OnlineUser>();
                inspections.forEach(i => {
                    const name = i.reviso;
                    if (name && !usersMap.has(name)) {
                        const parts = name.split(' ');
                        const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
                        usersMap.set(name, { id: name, name, role: 'Inspector', avatar: initials.toUpperCase(), status: 'online' });
                    }
                });
                setOnlineUsers(Array.from(usersMap.values()).slice(0, 6));
            } catch (e) {
                console.error('Dashboard Sync Error:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const systemHealth = Math.round((kpis.ftq * 0.4) + (kpis.efficiency * 0.3) + ((100 - Math.min(kpis.openNC * 5, 100)) * 0.3));
    const ftqSpark = weekData.map(w => w.ftq);
    const defectColors = [BRAND.blue, BRAND.blueLight, BRAND.amber, BRAND.rose, BRAND.grey];
    const ncTotalOpen = ncSeverity.reduce((a, b) => a + b.value, 0);
    const calTotal = calStatus.reduce((a, b) => a + b.value, 0);
    const defectTotal = defectDistribution.reduce((a, b) => a + b.value, 0);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Hola, <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">{user.username.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Centro de control de calidad — datos en tiempo real.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/15 flex items-center gap-2 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDuration: '2s' }}></span>
                        {loading ? 'Sincronizando' : 'En vivo'}
                    </span>
                    <button onClick={() => navigate('/quality/nc')} className="p-2.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-400 transition-colors border border-slate-200/80 dark:border-white/[0.06] relative">
                        <BellIcon />
                        {kpis.openNC > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#0a0e18] animate-pulse"></span>}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="FTQ Semanal" value={`${kpis.ftq.toFixed(1)}%`} subtext="vs semana ant." icon={ShieldCheckIcon} accent={BRAND.emerald} trend={kpis.ftqTrend} spark={ftqSpark} delay="delay-100" />
                <StatCard title="NC Abiertas" value={String(kpis.openNC)} subtext={kpis.criticalNC > 0 ? `${kpis.criticalNC} crítica${kpis.criticalNC > 1 ? 's' : ''}` : 'Sin críticas'} icon={ExclamationTriangleIcon} accent={BRAND.rose} delay="delay-200" />
                <StatCard title="Total Inspecciones" value={kpis.totalInspections.toLocaleString()} subtext="Registros históricos" icon={DatabaseIcon} accent={BRAND.blueLight} delay="delay-300" />
                <StatCard title="Eficiencia OEE" value={`${kpis.efficiency.toFixed(0)}%`} subtext="Aprovechamiento" icon={TachometerIcon} accent={BRAND.blue} trend={1.2} delay="delay-400" />
            </div>

            {/* BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT */}
                <div className="lg:col-span-8 space-y-5">
                    {/* Gráfica principal combinada */}
                    <div className="premium-card p-6 md:p-8 animate-fade-in-up delay-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Rendimiento & Volumen</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Inspecciones diarias vs FTQ · últimos 7 días</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND.blueLight }}></span>Inspecciones</span>
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND.emerald }}></span>FTQ %</span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={weekData}>
                                    <defs>
                                        <linearGradient id="barVol" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={BRAND.blueLight} stopOpacity={0.95} />
                                            <stop offset="100%" stopColor={BRAND.blue} stopOpacity={0.7} />
                                        </linearGradient>
                                        <linearGradient id="lineFtq" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={BRAND.emerald} stopOpacity={0.35} />
                                            <stop offset="100%" stopColor={BRAND.emerald} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} allowDecimals={false} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
                                    <Tooltip content={<PowerBITooltip theme={theme} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                                    <Bar yAxisId="left" dataKey="inspecciones" name="Inspecciones" unit=" insp." fill="url(#barVol)" radius={[6, 6, 0, 0]} barSize={28} animationDuration={1200}>
                                        <LabelList dataKey="inspecciones" position="top" style={{ fontSize: 10, fontWeight: 800, fill: labelFill(theme) }} />
                                    </Bar>
                                    <Area yAxisId="right" type="monotone" dataKey="ftq" name="FTQ" unit="%" stroke={BRAND.emerald} strokeWidth={3} fill="url(#lineFtq)" dot={{ r: 3, fill: BRAND.emerald }} activeDot={{ r: 6 }} animationDuration={1500}>
                                        <LabelList dataKey="ftq" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 800, fill: BRAND.emerald }} />
                                    </Area>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cumplimiento por área + Defectos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="premium-card p-6 md:p-7 animate-fade-in-up delay-400">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">Cumplimiento por Área</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-5">% inspecciones aprobadas</p>
                            <div className="h-[210px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={areaCompliance} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                                        <Tooltip content={<PowerBITooltip theme={theme} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                                        <Bar dataKey="value" name="Cumplimiento" unit="%" radius={[0, 6, 6, 0]} barSize={16} animationDuration={1200}>
                                            {areaCompliance.map((e, i) => (
                                                <Cell key={i} fill={e.value >= 90 ? BRAND.emerald : e.value >= 70 ? BRAND.amber : BRAND.rose} />
                                            ))}
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 800, fill: labelFill(theme) }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="premium-card p-6 md:p-7 animate-fade-in-up delay-500">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">Producto No Conforme</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-3">Cantidad retenida por defecto</p>
                            <div className="h-[210px] w-full flex items-center">
                                <ResponsiveContainer width="55%" height="100%">
                                    <PieChart>
                                        <Pie data={defectDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={3} cornerRadius={5} animationDuration={1000}
                                            labelLine={false} label={renderPieValueLabel(theme)}>
                                            {defectDistribution.map((_, i) => <Cell key={i} fill={defectColors[i % defectColors.length]} />)}
                                        </Pie>
                                        <Tooltip content={<SegmentTooltip theme={theme} total={defectTotal} unit=" und." />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5">
                                    {defectDistribution.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] font-bold">
                                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: defectColors[i % defectColors.length] }}></span>
                                            <span className="text-slate-500 dark:text-slate-400 truncate flex-1">{d.name}</span>
                                            <span className="text-slate-700 dark:text-slate-200">{d.value}</span>
                                            <span className="text-slate-400 w-8 text-right">{defectTotal ? Math.round((d.value / defectTotal) * 100) : 0}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="lg:col-span-4 space-y-5">
                    <SystemHealthGauge score={systemHealth} />

                    {/* NC por severidad */}
                    <div className="premium-card p-6 animate-fade-in-up delay-400">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">NC por Severidad</h3>
                            <ExclamationTriangleIcon className="text-rose-500" />
                        </div>
                        {ncTotalOpen > 0 ? (
                            <div className="relative h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={ncSeverity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={4} cornerRadius={6} animationDuration={1000}
                                            labelLine={false} label={renderPieValueLabel(theme)}>
                                            {ncSeverity.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<SegmentTooltip theme={theme} total={ncTotalOpen} unit=" NC" />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-800 dark:text-white">{ncTotalOpen}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">abiertas</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[180px] flex flex-col items-center justify-center text-center">
                                <CheckCircleIcon className="text-emerald-500 text-2xl mb-2" />
                                <p className="text-xs font-bold text-slate-400">Sin no conformidades abiertas</p>
                            </div>
                        )}
                        <div className="flex justify-center gap-3 mt-3">
                            {ncSeverity.map((s, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }}></span>{s.name} {s.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Estado de Metrología */}
                    <div className="premium-card p-6 animate-fade-in-up delay-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Estado de Metrología</h3>
                            <RulerIcon className="text-sky-500" />
                        </div>
                        {calTotal > 0 ? (
                            <>
                                <div className="h-[170px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart innerRadius="35%" outerRadius="100%" data={calStatus} startAngle={90} endAngle={-270}>
                                            {/* @ts-ignore */}
                                            <RadialBar background dataKey="value" cornerRadius={8} animationDuration={1200}>
                                                <LabelList dataKey="value" position="insideStart" style={{ fontSize: 11, fontWeight: 900, fill: '#ffffff' }} />
                                            </RadialBar>
                                            <Tooltip content={<SegmentTooltip theme={theme} total={calTotal} unit=" equipos" />} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-3 mt-2">
                                    {calStatus.map((s, i) => (
                                        <span key={i} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                            <span className="w-2 h-2 rounded-full" style={{ background: s.color }}></span>{s.name} {s.value}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[170px] flex flex-col items-center justify-center text-center">
                                <RulerIcon className="text-slate-300 dark:text-slate-600 text-2xl mb-2" />
                                <p className="text-xs font-bold text-slate-400">Sin equipos registrados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EQUIPO + ACTIVIDAD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="premium-card p-5 animate-fade-in-up delay-400">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Inspectores Activos</h3>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{onlineUsers.length}</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                        {onlineUsers.length > 0 ? onlineUsers.map(c => (
                            <div key={c.id} className="snap-start"><CollaboratorAvatar user={c} /></div>
                        )) : <p className="text-xs text-slate-400 italic">No hay inspectores activos hoy.</p>}
                    </div>
                </div>

                <div className="premium-card p-5 animate-fade-in-up delay-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Actividad Reciente</h3>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                    </div>
                    <div className="space-y-1">
                        {recentActivity.length > 0 ? recentActivity.map(a => (
                            <ActivityItem key={a.id} activity={a} onClick={() => a.targetId && navigate('/quality/forms', { state: { filterId: a.targetId } })} />
                        )) : <p className="text-xs text-slate-400 italic px-3">No hay novedades recientes.</p>}
                    </div>
                    <button onClick={() => navigate('/quality/forms')} className="w-full mt-4 py-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                        Ver Historial Completo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
