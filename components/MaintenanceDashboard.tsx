
import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import Breadcrumbs from './Breadcrumbs';
import { MOCK_MAINT_KPIS } from '../constants';
import { WrenchIcon, DropIcon, ShieldCheckIcon } from '../constants';

const KPICard: React.FC<{ title: string; value: string | number; subtext?: string; icon: React.ReactNode; colorClass: string }> = ({ title, value, subtext, icon, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
        <div className={`p-4 rounded-full ${colorClass} bg-opacity-20 text-xl`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

const MaintenanceDashboard: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="mb-6">
                <Breadcrumbs crumbs={[{ label: 'Mantenimiento', path: '/maintenance/board' }, { label: 'Indicadores' }]} />
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-4">Indicadores Integrales</h1>
                <p className="text-slate-500 dark:text-slate-400">Visión unificada de Correctivos, Preventivos y Recursos Locativos.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title="MTTR (Correctivo)" 
                    value={`${MOCK_MAINT_KPIS.mttr[MOCK_MAINT_KPIS.mttr.length - 1].value}h`} 
                    subtext="Tiempo medio de reparación" 
                    icon={<WrenchIcon />}
                    colorClass="bg-red-500 text-red-600"
                />
                 <KPICard 
                    title="Cumplimiento Preventivo" 
                    value={`${MOCK_MAINT_KPIS.preventiveCompliance}%`} 
                    subtext="Plan mensual ejecutado" 
                    icon={<ShieldCheckIcon />}
                    colorClass="bg-green-500 text-green-600"
                />
                 <KPICard 
                    title="Consumo Agua (Locativo)" 
                    value={`${MOCK_MAINT_KPIS.waterConsumption.reduce((a,b) => a + b.value, 0)} m³`} 
                    subtext="Acumulado mes actual" 
                    icon={<DropIcon />}
                    colorClass="bg-blue-500 text-blue-600"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Corrective Maintenance Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <WrenchIcon /> Evolución MTTR (Horas)
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={MOCK_MAINT_KPIS.mttr}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Locative / Water Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <DropIcon /> Consumo de Agua Semanal (m³)
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={MOCK_MAINT_KPIS.waterConsumption}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Preventive Compliance Gauge (Simulated with RadialBar) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-2 flex flex-col md:flex-row items-center justify-around">
                    <div className="w-full md:w-1/2">
                         <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                            <ShieldCheckIcon /> Eficiencia Preventiva Global
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            El cumplimiento del plan de mantenimiento preventivo es crucial para reducir paradas no programadas y extender la vida útil de los activos.
                        </p>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                                <span>Planificado</span>
                                <span className="font-bold">45 Órdenes</span>
                             </div>
                             <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                                <span>Ejecutado</span>
                                <span className="font-bold text-green-500">40 Órdenes</span>
                             </div>
                        </div>
                    </div>
                    <div className="h-64 w-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart 
                                cx="50%" 
                                cy="50%" 
                                innerRadius="70%" 
                                outerRadius="100%" 
                                barSize={20} 
                                data={[{ name: 'Compliance', value: MOCK_MAINT_KPIS.preventiveCompliance, fill: '#10b981' }]} 
                                startAngle={180} 
                                endAngle={0}
                            >
                                <RadialBar background dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 text-center">
                            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{MOCK_MAINT_KPIS.preventiveCompliance}%</span>
                            <p className="text-xs text-slate-500">Cumplimiento</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MaintenanceDashboard;
