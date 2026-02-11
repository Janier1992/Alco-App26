


import React, { useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { WrenchIcon, DropIcon, ShieldCheckIcon, CameraIcon, SaveIcon } from '../constants';
import { useNotification } from './NotificationSystem';
import type { MaintenanceType } from '../types';

const MaintenanceForms: React.FC = () => {
    const { addNotification } = useNotification();
    const [formType, setFormType] = useState<MaintenanceType>('Correctivo');
    
    // Corrective State
    const [correctiveData, setCorrectiveData] = useState({ asset: '', issue: '', priority: 'Media', description: '' });
    
    // Locative State
    const [locativeData, setLocativeData] = useState({ zone: '', waterReading: '', status: 'OK', observation: '' });
    
    // Preventive State
    const [preventiveData, setPreventiveData] = useState({ equipment: '', checklist1: false, checklist2: false, checklist3: false, notes: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Submission Logic
        addNotification({
            type: 'success',
            title: 'Registro Exitoso',
            message: `Se ha guardado el formulario de Mantenimiento ${formType}.`
        });
        
        // Reset Forms
        if(formType === 'Correctivo') setCorrectiveData({ asset: '', issue: '', priority: 'Media', description: '' });
        // FIX: Changed 'Locative' to 'Locativo' to match MaintenanceType definition.
        if(formType === 'Locativo') setLocativeData({ zone: '', waterReading: '', status: 'OK', observation: '' });
        if(formType === 'Preventivo') setPreventiveData({ equipment: '', checklist1: false, checklist2: false, checklist3: false, notes: '' });
    };

    const inputStyles = "w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors placeholder:text-slate-400";
    const labelStyles = "font-medium text-slate-700 dark:text-slate-300 block mb-2 text-sm";

    return (
        <div className="max-w-4xl mx-auto">
            <Breadcrumbs crumbs={[{ label: 'Mantenimiento', path: '/maintenance/board' }, { label: 'Inspecciones' }]} />
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-4 mb-6">Registro de Mantenimiento</h1>

            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <button 
                    onClick={() => setFormType('Correctivo')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formType === 'Correctivo' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <WrenchIcon />
                    <span className="font-bold">Correctivo (OT)</span>
                </button>
                <button 
                    onClick={() => setFormType('Locativo')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formType === 'Locativo' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <DropIcon />
                    <span className="font-bold">Locativo / Agua</span>
                </button>
                <button 
                    onClick={() => setFormType('Preventivo')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${formType === 'Preventivo' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                    <ShieldCheckIcon />
                    <span className="font-bold">Preventivo</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                {/* Correctivo Form */}
                {formType === 'Correctivo' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800/30 mb-6">
                            <h3 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                <i className="fas fa-exclamation-circle"></i> Reporte de Avería
                            </h3>
                            <p className="text-sm text-red-600 dark:text-red-400">Este formulario generará una Orden de Trabajo (OT) en el tablero Kanban.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Activo / Equipo</label>
                                <input required type="text" className={inputStyles} placeholder="Ej: Compresor C-1" value={correctiveData.asset} onChange={e => setCorrectiveData({...correctiveData, asset: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelStyles}>Prioridad</label>
                                <select className={inputStyles} value={correctiveData.priority} onChange={e => setCorrectiveData({...correctiveData, priority: e.target.value})}>
                                    <option>Baja</option>
                                    <option>Media</option>
                                    <option>Alta</option>
                                    <option>Crítica</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={labelStyles}>Problema Detectado (Título)</label>
                            <input required type="text" className={inputStyles} placeholder="Ej: Fuga de aceite en pistón" value={correctiveData.issue} onChange={e => setCorrectiveData({...correctiveData, issue: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyles}>Descripción Detallada</label>
                            <textarea className={`${inputStyles} min-h-[120px]`} placeholder="Describa los síntomas, ruidos extraños o códigos de error..." value={correctiveData.description} onChange={e => setCorrectiveData({...correctiveData, description: e.target.value})}></textarea>
                        </div>
                    </div>
                )}

                {/* Locativo Form */}
                {formType === 'Locativo' && (
                    <div className="space-y-6 animate-fade-in">
                         <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 mb-6">
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                <i className="fas fa-tint"></i> Inspección de Recursos
                            </h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Registro de consumo de agua y estado de instalaciones.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelStyles}>Zona Locativa</label>
                                <select className={inputStyles} value={locativeData.zone} onChange={e => setLocativeData({...locativeData, zone: e.target.value})}>
                                    <option value="">Seleccione Zona...</option>
                                    <option>Baños Planta 1</option>
                                    <option>Cocina / Cafetería</option>
                                    <option>Zona de Lavado</option>
                                    <option>Medidor General</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelStyles}>Lectura Medidor Agua (m³)</label>
                                <input type="number" className={inputStyles} placeholder="0.00" value={locativeData.waterReading} onChange={e => setLocativeData({...locativeData, waterReading: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className={labelStyles}>Estado General</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 flex-1">
                                    <input type="radio" name="locStatus" value="OK" checked={locativeData.status === 'OK'} onChange={() => setLocativeData({...locativeData, status: 'OK'})} className="w-5 h-5 text-sky-600" />
                                    <span className="text-slate-700 dark:text-slate-200 font-medium">Conforme (Limpio/Funcional)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 flex-1">
                                    <input type="radio" name="locStatus" value="NOK" checked={locativeData.status === 'NOK'} onChange={() => setLocativeData({...locativeData, status: 'NOK'})} className="w-5 h-5 text-red-600" />
                                    <span className="text-slate-700 dark:text-slate-200 font-medium">No Conforme (Fugas/Suciedad)</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className={labelStyles}>Observaciones</label>
                            <textarea className={`${inputStyles} min-h-[100px]`} value={locativeData.observation} onChange={e => setLocativeData({...locativeData, observation: e.target.value})}></textarea>
                        </div>
                    </div>
                )}

                {/* Preventivo Form */}
                {formType === 'Preventivo' && (
                    <div className="space-y-6 animate-fade-in">
                         <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800/30 mb-6">
                            <h3 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                                <i className="fas fa-clipboard-check"></i> Checklist Preventivo
                            </h3>
                            <p className="text-sm text-green-600 dark:text-green-400">Ejecución de rutina de mantenimiento programada.</p>
                        </div>
                        <div>
                            <label className={labelStyles}>Equipo a Inspeccionar</label>
                            <select className={inputStyles} value={preventiveData.equipment} onChange={e => setPreventiveData({...preventiveData, equipment: e.target.value})}>
                                <option value="">Seleccione Equipo...</option>
                                <option>Troqueladora Hidráulica T1</option>
                                <option>Sierra Doble Cabezal</option>
                                <option>Compresor de Tornillo</option>
                            </select>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Puntos de Control</h4>
                            <label className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <input type="checkbox" className="w-6 h-6 text-sky-600 rounded focus:ring-sky-500" checked={preventiveData.checklist1} onChange={e => setPreventiveData({...preventiveData, checklist1: e.target.checked})} />
                                <span className="text-slate-700 dark:text-slate-300">Nivel de aceite hidráulico y lubricación</span>
                            </label>
                             <label className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <input type="checkbox" className="w-6 h-6 text-sky-600 rounded focus:ring-sky-500" checked={preventiveData.checklist2} onChange={e => setPreventiveData({...preventiveData, checklist2: e.target.checked})} />
                                <span className="text-slate-700 dark:text-slate-300">Limpieza de filtros de aire y ventilación</span>
                            </label>
                             <label className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <input type="checkbox" className="w-6 h-6 text-sky-600 rounded focus:ring-sky-500" checked={preventiveData.checklist3} onChange={e => setPreventiveData({...preventiveData, checklist3: e.target.checked})} />
                                <span className="text-slate-700 dark:text-slate-300">Verificación de paradas de emergencia y sensores</span>
                            </label>
                        </div>
                         <div>
                            <label className={labelStyles}>Notas del Técnico</label>
                            <textarea className={`${inputStyles} min-h-[100px]`} value={preventiveData.notes} onChange={e => setPreventiveData({...preventiveData, notes: e.target.value})}></textarea>
                        </div>
                    </div>
                )}

                {/* Common Actions */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-4">
                    <button type="button" className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
                        <CameraIcon /> Adjuntar Foto
                    </button>
                    <button type="submit" className="px-8 py-3 bg-sky-700 text-white rounded-lg font-bold hover:bg-sky-600 transition-all shadow-lg flex items-center justify-center gap-2">
                        <SaveIcon /> Registrar Mantenimiento
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceForms;
