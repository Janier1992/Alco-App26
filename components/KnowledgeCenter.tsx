
import React, { useState, useMemo } from 'react';
import * as rr from 'react-router-dom';
const { useLocation } = rr;
import Breadcrumbs from './Breadcrumbs';
import { 
    SearchIcon, PlusIcon, ChevronRightIcon, InfoCircleIcon, UserCircleIcon,
    CheckCircleIcon, SparklesIcon, SaveIcon, AREAS_PROCESO, GraduationCapIcon,
    RefreshIcon, ChartPieIcon
} from '../constants';
import { useNotification } from './NotificationSystem';

interface Lesson {
    id: string;
    title: string;
    category: 'Lección' | 'Recomendación' | 'Capacitación';
    author: string;
    date: string;
    views: number;
    content: string;
    solution: string;
    isoRef: string;
}

interface Competency {
    id: string;
    name: string;
    skills: { name: string; level: number }[]; // 0-4 (Beginner to Master)
}

const KnowledgeCenter: React.FC = () => {
    const location = useLocation();
    const isTrainingView = location.pathname.includes('/training');
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [lessons, setLessons] = useState<Lesson[]>([
        { 
            id: 'L1', title: 'Optimización de Perforación T1', category: 'Recomendación', author: 'INGENIERÍA PROYECTOS', date: '2024-07-25', views: 124,
            content: 'Se detectó que el ajuste de guías cada 200 ciclos mantiene el "bearing" en estado óptimo.',
            solution: 'Implementar checklist de limpieza cada 2 horas.',
            isoRef: 'ISO 9001 8.5.1'
        }
    ]);

    const competencies: Competency[] = [
        { id: 'C1', name: 'DIEGO DURANGO', skills: [{ name: 'Corte', level: 4 }, { name: 'Pintura', level: 2 }, { name: 'Normas ISO', level: 3 }] },
        { id: 'C2', name: 'JUAN PABLO LOPEZ', skills: [{ name: 'Corte', level: 3 }, { name: 'Pintura', level: 4 }, { name: 'Normas ISO', level: 2 }] },
        { id: 'C3', name: 'KELLER VILLA', skills: [{ name: 'Corte', level: 2 }, { name: 'Pintura', level: 1 }, { name: 'Normas ISO', level: 4 }] }
    ];

    const getLevelColor = (level: number) => {
        if (level >= 4) return 'bg-emerald-500 shadow-emerald-500/20';
        if (level >= 2) return 'bg-sky-500 shadow-sky-500/20';
        return 'bg-amber-500 shadow-amber-500/20';
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none uppercase transition-all";

    return (
        <div className="animate-fade-in space-y-10 pb-20">
            <Breadcrumbs crumbs={[{ label: 'G. CONOCIMIENTO', path: '/dashboard' }, { label: isTrainingView ? 'MATRIZ DE COMPETENCIAS' : 'LECCIONES APRENDIDAS' }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                <div className="space-y-4 max-w-4xl">
                    <h1 className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                        {isTrainingView ? 'Matriz' : 'Mejora'} <span className={isTrainingView ? 'text-sky-500' : 'text-amber-500'}>{isTrainingView ? 'Técnica' : 'Continua'}</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium italic leading-relaxed">
                        {isTrainingView ? '"Sección III: Evaluación de habilidades operativas y detección de brechas de entrenamiento ISO."' : '"Repositorio estratégico derivado del análisis de fallas en planta Alco."'}
                    </p>
                </div>
                {!isTrainingView && (
                    <button onClick={() => setIsAddModalOpen(true)} className="px-12 py-5 bg-amber-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:scale-105 transition-all flex items-center gap-3">
                        <PlusIcon /> Publicar Hallazgo
                    </button>
                )}
            </div>

            {isTrainingView ? (
                <div className="bg-white dark:bg-[#0f172a] rounded-[4rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden animate-fade-in-up">
                    <div className="p-10 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><GraduationCapIcon className="text-sky-600" /> Mapa de Talento Alco</h3>
                        <button className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-sky-600 transition-all"><RefreshIcon /></button>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b dark:border-slate-700">
                                <tr>
                                    <th className="px-10 py-6">Colaborador / Proceso</th>
                                    {competencies[0].skills.map(s => <th key={s.name} className="px-4 py-6 text-center">{s.name}</th>)}
                                    <th className="px-10 py-6 text-right">Promedio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {competencies.map(person => (
                                    <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-xs uppercase text-slate-800 dark:text-slate-100">{person.name}</p>
                                            <p className="text-[9px] text-sky-600 font-bold mt-1 tracking-widest uppercase">ID: {person.id}</p>
                                        </td>
                                        {person.skills.map(skill => (
                                            <td key={skill.name} className="px-4 py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex gap-0.5">
                                                        {[1,2,3,4].map(step => (
                                                            <div key={step} className={`size-3 rounded-full ${step <= skill.level ? getLevelColor(skill.level) : 'bg-slate-200 dark:bg-slate-800 opacity-20'}`} />
                                                        ))}
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Nivel {skill.level}</span>
                                                </div>
                                            </td>
                                        ))}
                                        <td className="px-10 py-8 text-right">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-full text-[10px] font-black">
                                                {Math.round(person.skills.reduce((a,b) => a + b.level, 0) / person.skills.length * 25)}% Mastery
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white dark:bg-[#0f172a] p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Estrategia de Aprendizaje</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30">
                                    <div className="p-3 bg-amber-600 text-white rounded-2xl"><SparklesIcon /></div>
                                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Lecciones Vivas</p>
                                </div>
                                <div className="p-8 bg-slate-950 rounded-[3rem] text-white">
                                    <p className="text-xs font-black text-sky-400 uppercase tracking-[0.2em] mb-4">ISO 9001:2015 7.1.6</p>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">"La organización debe determinar los conocimientos necesarios para la operación de sus procesos..."</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <div className="relative">
                            <input 
                                className="w-full pl-16 pr-8 py-6 bg-white dark:bg-[#0f172a] border-none rounded-[3rem] shadow-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" 
                                placeholder="Consultar Recomendaciones Técnicas..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-xl"><SearchIcon /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {lessons.map(lesson => (
                                <div key={lesson.id} onClick={() => setSelectedLesson(lesson)} className="bg-white dark:bg-[#0f172a] p-10 rounded-[4rem] border-2 border-transparent hover:border-amber-500/30 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden animate-fade-in">
                                    <div className="relative z-10 space-y-6">
                                        <span className="px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">{lesson.category}</span>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tighter group-hover:text-amber-600 transition-colors">{lesson.title}</h3>
                                        <div className="pt-8 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span>Ref: {lesson.isoRef}</span>
                                            <ChevronRightIcon />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeCenter;
