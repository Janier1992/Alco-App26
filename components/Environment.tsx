
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Breadcrumbs from './Breadcrumbs';
import { MOCK_WASTE_DATA } from '../constants';

const COLORS = ['#0ea5e9', '#ef4444', '#22c55e', '#64748b'];

const Environment: React.FC = () => {
    
    // Aggregate data for charts
    const dataByType = MOCK_WASTE_DATA.reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.type);
        if (existing) {
            existing.value += curr.quantityKg;
        } else {
            acc.push({ name: curr.type, value: curr.quantityKg });
        }
        return acc;
    }, [] as {name: string, value: number}[]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <Breadcrumbs crumbs={[{ label: 'Sostenibilidad', path: '/environment' }, { label: 'Gestión Ambiental' }]} />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">Dashboard Ambiental</h1>
                    <p className="text-slate-500">Control de residuos, emisiones y cumplimiento ISO 14001.</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    <i className="fas fa-plus mr-2"></i> Registrar Residuo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Cards */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
                    <p className="text-sm text-slate-500 mb-1">Total Residuos (Mes)</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">975 kg</p>
                    <p className="text-xs text-emerald-600 mt-1">▼ 5% vs mes anterior</p>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-sky-500">
                    <p className="text-sm text-slate-500 mb-1">% Valorización</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">85.1%</p>
                    <p className="text-xs text-slate-400 mt-1">Meta: >80%</p>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                    <p className="text-sm text-slate-500 mb-1">Residuos Peligrosos</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">25 kg</p>
                    <p className="text-xs text-slate-400 mt-1">Disp. final certificada</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Distribución por Tipo</h3>
                    <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {dataByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6">Histórico de Generación (kg)</h3>
                     <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    {name: 'Ene', val: 800}, {name: 'Feb', val: 950}, {name: 'Mar', val: 900},
                                    {name: 'Abr', val: 850}, {name: 'May', val: 1100}, {name: 'Jun', val: 975}
                                ]}
                                margin={{top: 5, right: 30, left: 20, bottom: 5}}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="val" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm overflow-x-auto">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Registro de Disposición</h3>
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Cantidad (kg)</th>
                            <th className="px-6 py-3">Método</th>
                            <th className="px-6 py-3">Certificado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_WASTE_DATA.map(item => (
                            <tr key={item.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4">{item.date}</td>
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.type}</td>
                                <td className="px-6 py-4">{item.quantityKg}</td>
                                <td className="px-6 py-4">{item.disposalMethod}</td>
                                <td className="px-6 py-4">
                                    {item.certificate ? (
                                        <span className="text-sky-600 hover:underline cursor-pointer"><i className="fas fa-file-contract"></i> {item.certificate}</span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Environment;
