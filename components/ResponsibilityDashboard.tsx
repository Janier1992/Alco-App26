
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Pie, PieChart } from 'recharts';
import Breadcrumbs from './Breadcrumbs';
import { ShieldCheckIcon, UserCircleIcon, CheckCircleIcon, XCircleIcon } from '../constants';
import { useTheme } from './ThemeContext';

// Local Mock Data for Responsibility Metrics
const PERFORMANCE_DATA = [
    { name: 'Juan Perez', tasks: 45, defects: 2, score: 98 },
    { name: 'Maria R.', tasks: 38, defects: 0, score: 100 },
    { name: 'Carlos Ruiz', tasks: 52, defects: 5, score: 92 },
    { name: 'Ana Lopez', tasks: 41, defects: 1, score: 97 },
    { name: 'Pedro G.', tasks: 30, defects: 3, score: 88 },
];

const SIGNATURE_LOGS = [
    { id: 1, task: 'Corte Lote 204', signer: 'Juan Perez', role: 'Operario', date: '2024-07-20 08:30', status: 'Approved' },
    { id: 2, task: 'Calibración Sierra', signer: 'Carlos Ruiz', role: 'Supervisor', date: '2024-07-20 09:15', status: 'Approved' },
    { id: 3, task: 'Liberación Lote 205', signer: 'Maria Rodriguez', role: 'Calidad', date: '2024-07-20 10:00', status: 'Rejected' },
    { id: 4, task: 'Mantenimiento T1', signer: 'Pedro Gomez', role: 'Técnico', date: '2024-07-20 11:30', status: 'Approved' },
];

const ResponsibilityDashboard: React.FC = () => {
    const { theme } = useTheme();
    const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
    const tooltipStyle = {
      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
      border: `1px solid ${gridColor}`,
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <Breadcrumbs crumbs={[{ label: 'Calidad', path: '/quality' }, { label: 'Responsabilidad' }]} />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2 flex items-center gap-2">
                        <ShieldCheckIcon /> Tablero de Responsabilidad
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Monitoreo de desempeño individual y cultura de autogestión.
                    </p>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-green-500">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase">Nivel de Autocontrol</h3>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">94%</p>
                    <p className="text-xs text-green-600 mt-1">Tareas validadas por operario antes de Calidad.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-sky-500">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase">Firmas Digitales</h3>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">1,240</p>
                    <p className="text-xs text-sky-600 mt-1">Registros de responsabilidad este mes.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-purple-500">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase">Líder del Mes</h3>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">MR</div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">Maria Rodriguez</p>
                            <p className="text-xs text-slate-500">100 Puntos de Calidad</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6">Desempeño por Operario (Score Calidad)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={PERFORMANCE_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" domain={[0, 100]} stroke={axisColor} />
                                <YAxis dataKey="name" type="category" stroke={axisColor} width={80} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={tooltipStyle} />
                                <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                    {PERFORMANCE_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score === 100 ? '#10b981' : entry.score >= 90 ? '#3b82f6' : '#f59e0b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Últimas Firmas de Responsabilidad</h3>
                    <div className="overflow-y-auto h-72 pr-2 space-y-3">
                        {SIGNATURE_LOGS.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-full text-slate-500 dark:text-slate-300">
                                        <UserCircleIcon />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.signer}</p>
                                        <p className="text-xs text-slate-500">{log.role} • {log.task}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${log.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {log.status === 'Approved' ? 'Aprobado' : 'Rechazado'}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">{log.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResponsibilityDashboard;
