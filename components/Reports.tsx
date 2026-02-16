
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line,
    PieChart, Pie
} from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    MOCK_CHART_DATA, FileAltIcon, ChartLineIcon, RefreshIcon,
    RobotIcon, CheckCircleIcon, ExclamationTriangleIcon,
    ClipboardCheckIcon, DownloadIcon, SearchIcon,
    ChevronRightIcon, InfoCircleIcon
} from '../constants';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationSystem';
import Breadcrumbs from './Breadcrumbs';
import ReactMarkdown from 'react-markdown';

const ReportGenerator: React.FC = () => {
    const { theme } = useTheme();
    const { addNotification } = useNotification();
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportParams, setReportParams] = useState({
        reportType: '',
        dateRange: 'last30',
        area: 'all'
    });

    // Estado del Reporte Generado (Data de BI)
    const [biData, setBiData] = useState<any>(null);

    const axisColor = theme === 'dark' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';

    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportParams.reportType) return addNotification({ type: 'warning', title: 'REPORTE INCOMPLETO', message: 'Seleccione un tipo de análisis estratégico.' });

        setIsGenerating(true);
        addNotification({ type: 'info', title: 'PROCESANDO BI', message: 'Sincronizando KPIs de Calidad, Auditorías y CAPA...' });

        try {
            // Recopilación simulada de data de todos los módulos para el prompt
            const mockContext = {
                ncs: Math.floor(Math.random() * 40),
                calibVenc: Math.floor(Math.random() * 5),
                oee: (Math.random() * 10 + 85).toFixed(1),
                topProcess: reportParams.area === 'all' ? 'Pintura' : reportParams.area
            };

            const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Actúa como Director de Calidad de Alco Proyectos. Genera un reporte BI para el periodo: ${reportParams.dateRange}. 
            Tipo: ${reportParams.reportType}. Datos: NCs Activas: ${mockContext.ncs}, Calibraciones Vencidas: ${mockContext.calibVenc}, OEE: ${mockContext.oee}%. 
            Análisis específico para el área: ${reportParams.area === 'all' ? 'PLANTA GENERAL' : reportParams.area}.
            Estructura: 1. Resumen Gerencial, 2. Análisis de Riesgos en Proceso ${mockContext.topProcess}, 3. Tres Recomendaciones de Mejora Continua (CAPA) enfocadas en Calidad ISO 9001. Usa Markdown profesional. Responde SIEMPRE en Español (ESTRICTAMENTE).`;

            const response = await model.generateContent(prompt);
            const text = response.response.text();

            setBiData({
                analysis: text,
                kpis: mockContext,
                timestamp: new Date().toLocaleString(),
                trends: MOCK_CHART_DATA.qualityTrend.map(d => ({ ...d, value: d.value + (Math.random() * 5 - 2.5) }))
            });

            addNotification({ type: 'success', title: 'INTELIGENCIA GENERADA', message: 'El reporte estratégico está listo para revisión gerencial.' });
        } catch (error) {
            addNotification({ type: 'error', title: 'FALLO EN MOTORES BI', message: 'No se pudo procesar el análisis inteligente.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const inputStyles = "w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-sky-500 outline-none";
    const labelStyles = "text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2 mb-2 block";

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'BI & ANALÍTICA', path: '/dashboard' }, { label: 'GENERADOR DE REPORTES' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Business <span className="text-sky-600">Intelligence</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest flex items-center gap-2"><ChartLineIcon /> Consolidación Estratégica de Planta</p>
                </div>
            </div>

            <form onSubmit={handleGenerateReport} className="bg-white dark:bg-slate-800/40 p-10 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
                <div>
                    <label className={labelStyles}>Tipo de Reporte</label>
                    <select value={reportParams.reportType} onChange={e => setReportParams(p => ({ ...p, reportType: e.target.value }))} required className={inputStyles}>
                        <option value="">SELECCIONE...</option>
                        <option value="calidad">Análisis de Calidad ISO 9001</option>
                        <option value="auditoria">Resumen de Auditorías</option>
                        <option value="metrologia">Balance de Metrología</option>
                        <option value="operativo">Desempeño Operativo Planta</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyles}>Rango de Datos</label>
                    <select value={reportParams.dateRange} onChange={e => setReportParams(p => ({ ...p, dateRange: e.target.value }))} className={inputStyles}>
                        <option value="last30">Últimos 30 días</option>
                        <option value="last90">Último Trimestre</option>
                        <option value="year">Anual Consolidado</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyles}>Área de Interés</label>
                    <select value={reportParams.area} onChange={e => setReportParams(p => ({ ...p, area: e.target.value }))} className={inputStyles}>
                        <option value="all">Toda la Planta</option>
                        <option value="CORTE DE">Corte de Perfilería</option>
                        <option value="PINTURA">Planta Pintura</option>
                        <option value="ENSAMBLE">Ensamble Fachada</option>
                        <option value="FELPA / EMPAQUE">Felpa / Empaque</option>
                    </select>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isGenerating}
                        className={`w - full py - 4 rounded - 2xl font - black text - [11px] uppercase tracking - widest transition - all shadow - xl flex items - center justify - center gap - 3 ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-sky-600 text-white hover:scale-105 active:scale-95 shadow-sky-600/20'} `}
                    >
                        {isGenerating ? <RefreshIcon className="animate-spin" /> : <ChartLineIcon />}
                        {isGenerating ? 'PROCESANDO...' : 'GENERAR REPORTE'}
                    </button>
                </div>
            </form>

            {biData && (
                <div className="animate-fade-in-up space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-l-8 border-rose-500 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">NCs Detectadas</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{biData.kpis.ncs}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-l-8 border-emerald-500 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">OEE Global</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{biData.kpis.oee}%</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-l-8 border-amber-500 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vencimientos Prox.</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{biData.kpis.calibVenc}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border-l-8 border-sky-500 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eficacia CAPA</p>
                            <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">94.2%</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-12 rounded-[4rem] shadow-xl border border-slate-100 dark:border-slate-700">
                            <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 flex items-center gap-4 text-sky-600"><RobotIcon /> Análisis Estratégico IA</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed"><ReactMarkdown>{biData.analysis}</ReactMarkdown></div>
                            <div className="mt-12 pt-8 border-t dark:border-slate-700 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Reporte generado el: {biData.timestamp}</span>
                                <button onClick={() => window.print()} className="flex items-center gap-2 hover:text-sky-600 transition-colors"><DownloadIcon /> Exportar Copia Controlada PDF</button>
                            </div>
                        </div>
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                                <ChartLineIcon className="absolute -right-8 -bottom-8 text-9xl opacity-5 group-hover:scale-110 transition-transform" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 mb-6">Tendencia de Calidad</h4>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={biData.trends}>
                                            <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} fill="#0ea5e9" fillOpacity={0.1} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mt-6 uppercase text-center italic">"La curva indica una mejora del 2.4% en el cumplimiento FTQ"</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportGenerator;
