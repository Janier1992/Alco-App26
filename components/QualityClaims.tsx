
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Breadcrumbs from './Breadcrumbs';
import { 
    RobotIcon, PlusIcon, SaveIcon, TrashIcon, EditIcon,
    RefreshIcon, UserShieldIcon, ViewIcon
} from '../constants';
import type { QualityDocument } from '../types';
import { useNotification } from './NotificationSystem';
import ReactMarkdown from 'react-markdown';

const QualityClaims: React.FC = () => {
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
    const [documents, setDocuments] = useState<QualityDocument[]>(() => {
        const saved = localStorage.getItem('alco_claims_v3');
        return saved ? JSON.parse(saved) : [];
    });

    const [formData, setFormData] = useState<Partial<QualityDocument>>({
        docType: 'Informe Técnico de Obra', client: '', project: '', subject: '', priority: 'Media', status: 'Recibido', description: '', assignedTo: 'Ingeniería Calidad'
    });

    useEffect(() => {
        localStorage.setItem('alco_claims_v3', JSON.stringify(documents));
    }, [documents]);

    const handleGenerateAI = async () => {
        if (!formData.description) return addNotification({ type: 'warning', title: 'SIN CONTEXTO', message: 'Describa el problema para redactar el informe.' });
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Actúa como Director de Calidad de AlcoSAS. Redacta un ${formData.docType} formal para el cliente ${formData.client} en la obra ${formData.project}. Descripción: "${formData.description}". Cita NTC 2409 y estándares Qualicoat. Propón 3 recomendaciones técnicas. Usa Markdown profesional.`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setFormData(prev => ({ ...prev, officialContent: response.text }));
            addNotification({ type: 'success', title: 'REDACCIÓN IA COMPLETA', message: 'Informe técnico generado con éxito.' });
        } catch (e) {
            addNotification({ type: 'error', title: 'FALLO TÉCNICO', message: 'No se pudo conectar con los motores de redacción.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const id = formData.id || `CL-${Date.now()}`;
        const newDoc = { ...formData, id, date: formData.date || new Date().toISOString().split('T')[0] } as QualityDocument;
        if (formData.id) {
            setDocuments(prev => prev.map(d => d.id === formData.id ? newDoc : d));
        } else {
            setDocuments([newDoc, ...documents]);
        }
        setViewMode('list');
        addNotification({ type: 'success', title: 'GESTIÓN GUARDADA', message: `Registro ${id} actualizado en base de datos.` });
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta gestión de reclamo?')) {
            setDocuments(prev => prev.filter(d => d.id !== id));
            addNotification({ type: 'error', title: 'ELIMINADO', message: 'Registro purgado del sistema.' });
        }
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none transition-all uppercase";

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'CALIDAD', path: '/dashboard' }, { label: 'GESTIÓN DE RECLAMOS' }]} />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Gestión de <span className="text-sky-600">Reclamos</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest flex items-center gap-2"><UserShieldIcon /> Automatización de Informes Post-Venta Alco</p>
                </div>
                {viewMode === 'list' && (
                    <button onClick={() => { setFormData({ docType: 'Informe Técnico de Obra', client: '', project: '', description: '', status: 'Recibido' }); setViewMode('editor'); }} className="px-8 py-4 bg-sky-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 flex items-center gap-2">
                        <PlusIcon /> Nueva Gestión
                    </button>
                )}
            </div>

            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-8 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Bitácora de Reclamaciones</h3>
                        <input className="px-4 py-2 border rounded-xl text-xs font-bold w-64 dark:bg-slate-900 outline-none" placeholder="FILTRAR CLIENTE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50/50">
                                <tr><th className="px-8 py-6">ID / Documento</th><th className="px-4 py-6">Cliente / Obra</th><th className="px-4 py-6 text-center">Estado</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {documents.filter(d => d.client.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                        <td className="px-8 py-6"><p className="font-black text-xs uppercase">{d.id}</p><p className="text-[9px] text-sky-600 uppercase font-bold">{d.docType}</p></td>
                                        <td className="px-4 py-6"><p className="font-black text-xs uppercase">{d.client}</p><p className="text-[9px] text-slate-400 uppercase font-bold">{d.project}</p></td>
                                        <td className="px-4 py-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${d.status === 'Cerrado' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{d.status}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right flex justify-end gap-2">
                                            <button onClick={() => { setFormData(d); setViewMode('editor'); }} className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all"><EditIcon /></button>
                                            <button onClick={() => handleDelete(d.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-xl">
                        <h2 className="text-2xl font-black uppercase mb-8 tracking-tighter">Editor de Concepto Técnico</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Tipo de Comunicación</label><select className={inputStyles} value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value as any})}><option>Informe Técnico de Obra</option><option>Comunicado Oficial Post-Venta</option></select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Cliente</label><input required className={inputStyles} value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Obra / Proyecto</label><input required className={inputStyles} value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} /></div>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Relato del Hallazgo</label><textarea required rows={5} className={`${inputStyles} normal-case`} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describa la discusión técnica aquí..." /></div>
                            <div className="flex gap-4 pt-4 border-t dark:border-slate-700">
                                <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-xs uppercase">Cancelar</button>
                                <button type="submit" className="flex-[2] py-5 bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase shadow-xl">Guardar en Registro</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-slate-900 rounded-[3.5rem] p-10 flex flex-col shadow-2xl overflow-hidden min-h-[600px]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><RobotIcon className="text-sky-400" /> Redacción Automatizada</h3>
                            <button onClick={handleGenerateAI} disabled={isGenerating} className="px-6 py-3 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
                                {isGenerating ? <RefreshIcon className="animate-spin" /> : <i className="fas fa-magic" />} Generar Concepto Pro
                            </button>
                        </div>
                        <div className="flex-grow bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-y-auto prose prose-invert prose-sm">
                            {formData.officialContent ? <ReactMarkdown>{formData.officialContent}</ReactMarkdown> : <div className="h-full flex flex-col items-center justify-center opacity-20"><ViewIcon className="text-6xl mb-4" /><p className="text-xs font-black uppercase tracking-widest text-center">Haga clic en 'Generar Concepto Pro' para redactar el informe técnico basado en su relato.</p></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityClaims;
