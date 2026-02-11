
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Breadcrumbs from './Breadcrumbs';
import { 
    RobotIcon, ImageIcon, MovieIcon, MagicIcon, 
    UploadIcon, DownloadIcon, RefreshIcon, 
    ChevronRightIcon, InfoCircleIcon, SparklesIcon,
    CameraIcon, TrashIcon
} from '../constants';
import { useNotification } from './NotificationSystem';

const CreativeStudio: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    // Image Gen State
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [imageAspect, setImageAspect] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Video Gen State
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
    const [videoSourceImage, setVideoSourceImage] = useState<{data: string, mime: string} | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [videoStatus, setVideoStatus] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && window.aistudio.hasSelectedApiKey) {
                const selected = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(selected);
            }
            setIsCheckingKey(false);
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && window.aistudio.openSelectKey) {
            await window.aistudio.openSelectKey();
            setHasApiKey(true); // Assume success as per race condition rules
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setVideoSourceImage({ data: base64, mime: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) return;
        setIsGeneratingImage(true);
        setGeneratedImage(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: imagePrompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: imageAspect,
                        imageSize: imageSize
                    }
                }
            });

            const parts = response.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
                    addNotification({ type: 'success', title: 'IMAGEN GENERADA', message: 'La visualización de alta resolución está lista.' });
                    break;
                }
            }
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) {
                setHasApiKey(false);
            }
            addNotification({ type: 'error', title: 'FALLO TÉCNICO', message: 'Error al generar imagen. Verifique su API Key.' });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!videoSourceImage) {
            addNotification({ type: 'warning', title: 'FALTA IMAGEN', message: 'Cargue una foto base para animar con Veo.' });
            return;
        }
        setIsGeneratingVideo(true);
        setGeneratedVideoUrl(null);
        setVideoStatus('Iniciando motores Veo...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: videoPrompt || 'Cinematic movement, slow dolly zoom, architectural lighting.',
                image: {
                    imageBytes: videoSourceImage.data,
                    mimeType: videoSourceImage.mime
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: videoAspect
                }
            });

            setVideoStatus('Renderizando fotogramas... (Puede tardar 2-3 min)');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                setGeneratedVideoUrl(`${downloadLink}&key=${process.env.API_KEY}`);
                addNotification({ type: 'success', title: 'VIDEO FINALIZADO', message: 'La animación Veo se ha completado.' });
            }
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) {
                setHasApiKey(false);
            }
            addNotification({ type: 'error', title: 'ERROR DE VEO', message: 'Fallo en la generación de video.' });
        } finally {
            setIsGeneratingVideo(false);
            setVideoStatus('');
        }
    };

    const inputStyles = "w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none transition-all uppercase";
    const labelStyles = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1";

    if (isCheckingKey) return <div className="flex h-screen items-center justify-center"><RefreshIcon className="animate-spin text-sky-600 text-4xl" /></div>;

    if (!hasApiKey) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-12 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-white/5 max-w-2xl text-center space-y-8">
                    <div className="size-24 bg-sky-100 dark:bg-sky-900/30 rounded-[2rem] flex items-center justify-center text-sky-600 text-5xl mx-auto shadow-lg">
                        <MagicIcon />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Acceso al <span className="text-sky-600">Estudio Creativo</span></h2>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Para utilizar los modelos avanzados **Gemini 3 Pro Image** y **Veo 3.1 Video**, es necesario seleccionar su propia API Key con facturación activa.
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-slate-700 text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <InfoCircleIcon /> Información Importante
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            Asegúrese de tener un proyecto de Google Cloud con facturación configurada. Consulte la <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold underline">documentación de facturación</a> para más detalles.
                        </p>
                    </div>
                    <button 
                        onClick={handleSelectKey}
                        className="w-full py-5 bg-sky-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Configurar API Key Personal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <Breadcrumbs crumbs={[{ label: 'CREATIVIDAD', path: '/dashboard' }, { label: 'ESTUDIO AI AVANZADO' }]} />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Estudio <span className="text-sky-600">Creativo AI</span></h1>
                    <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest flex items-center gap-2">
                        <RobotIcon className="text-sky-600" /> Generación Visual de Alto Rendimiento
                    </p>
                </div>
                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] border dark:border-slate-700">
                    <button 
                        onClick={() => setActiveTab('image')} 
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'image' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Imágenes Pro
                    </button>
                    <button 
                        onClick={() => setActiveTab('video')} 
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'video' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Animación Veo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* PANEL DE CONFIGURACIÓN */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <i className="fas fa-sliders-h text-sky-600"></i> Parámetros
                        </h3>
                        
                        <div className="space-y-6">
                            {activeTab === 'image' ? (
                                <>
                                    <div>
                                        <label className={labelStyles}>Resolución de Salida</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['1K', '2K', '4K'] as const).map(size => (
                                                <button 
                                                    key={size}
                                                    onClick={() => setImageSize(size)}
                                                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${imageSize === size ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-600' : 'border-slate-100 dark:border-slate-700 text-slate-400'}`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyles}>Relación de Aspecto</label>
                                        <select className={inputStyles} value={imageAspect} onChange={e => setImageAspect(e.target.value as any)}>
                                            <option value="1:1">1:1 (CUADRADO)</option>
                                            <option value="16:9">16:9 (LANDSCAPE)</option>
                                            <option value="9:16">9:16 (PORTRAIT)</option>
                                            <option value="4:3">4:3 (STANDARD)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className={labelStyles}>Formato de Video</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['16:9', '9:16'] as const).map(asp => (
                                                <button 
                                                    key={asp}
                                                    onClick={() => setVideoAspect(asp)}
                                                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${videoAspect === asp ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-600' : 'border-slate-100 dark:border-slate-700 text-slate-400'}`}
                                                >
                                                    {asp}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed dark:border-slate-700 text-center relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        {videoSourceImage ? (
                                            <div className="relative">
                                                <img src={`data:${videoSourceImage.mime};base64,${videoSourceImage.data}`} className="h-32 w-full object-cover rounded-xl" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                                    <RefreshIcon className="text-white text-2xl" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <UploadIcon className="text-3xl text-slate-300 mb-2 mx-auto" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Cargar Foto Base</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-950 p-8 rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
                         <div className="absolute -right-10 -bottom-10 opacity-10">
                            <MagicIcon className="text-[10rem] text-sky-500" />
                         </div>
                         <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-sky-400">Poder Pro Directo</h4>
                         <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic relative z-10">
                            "Generando visualizaciones hiper-realistas para renders de fachadas, materiales y presentaciones de alto impacto."
                         </p>
                    </div>
                </div>

                {/* PANEL DE CANVAS / RESULTADO */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                {activeTab === 'image' ? <ImageIcon className="text-emerald-500" /> : <MovieIcon className="text-sky-500" />} 
                                Workspace Creativo
                            </h3>
                            {activeTab === 'video' && videoStatus && (
                                <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest animate-pulse">{videoStatus}</span>
                            )}
                        </div>

                        <div className="flex-grow p-10 flex items-center justify-center bg-slate-100 dark:bg-black/20">
                            {activeTab === 'image' ? (
                                generatedImage ? (
                                    <div className="relative group animate-fade-in">
                                        <img src={generatedImage} className="max-h-[500px] rounded-3xl shadow-2xl border-4 border-white dark:border-slate-800" alt="Generated" />
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <a href={generatedImage} download="alco-ai-gen.png" className="size-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                                                <DownloadIcon />
                                            </a>
                                        </div>
                                    </div>
                                ) : isGeneratingImage ? (
                                    <div className="text-center space-y-6">
                                        <div className="size-24 border-8 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Gemini 3 Pro Imaginando...</p>
                                    </div>
                                ) : (
                                    <div className="text-center opacity-20">
                                        <ImageIcon className="text-8xl mb-6 mx-auto" />
                                        <p className="text-sm font-black uppercase tracking-widest">Ingrese un prompt para comenzar</p>
                                    </div>
                                )
                            ) : (
                                generatedVideoUrl ? (
                                    <div className="relative group animate-fade-in w-full max-w-2xl">
                                        <video controls src={generatedVideoUrl} className="w-full rounded-3xl shadow-2xl border-4 border-white dark:border-slate-800" />
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all z-10">
                                            <a href={generatedVideoUrl} download="alco-video-gen.mp4" className="size-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                                                <DownloadIcon />
                                            </a>
                                        </div>
                                    </div>
                                ) : isGeneratingVideo ? (
                                    <div className="text-center space-y-8 w-full max-w-md">
                                        <div className="relative size-32 mx-auto">
                                            <div className="absolute inset-0 border-8 border-slate-200 rounded-full"></div>
                                            <div className="absolute inset-0 border-8 border-sky-500 rounded-full animate-spin border-t-transparent"></div>
                                            <MovieIcon className="absolute inset-0 m-auto text-3xl text-sky-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{videoStatus}</p>
                                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full bg-sky-500 animate-progress"></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center opacity-20">
                                        <MovieIcon className="text-8xl mb-6 mx-auto" />
                                        <p className="text-sm font-black uppercase tracking-widest">Cargue imagen y prompt para animar</p>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="p-8 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                            <div className="flex gap-4">
                                <div className="flex-grow relative">
                                    <textarea 
                                        className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none h-[80px] custom-scrollbar"
                                        placeholder={activeTab === 'image' ? "Describa la imagen técnica o conceptual... (ej: Modern glass skyscraper façade, evening blue hour lighting, 8k hyper-realistic)" : "Describa el movimiento de la cámara o escena... (ej: Slow cinematic fly-through towards the entrance)"}
                                        value={activeTab === 'image' ? imagePrompt : videoPrompt}
                                        onChange={e => activeTab === 'image' ? setImagePrompt(e.target.value) : setVideoPrompt(e.target.value)}
                                    />
                                    <div className="absolute right-6 bottom-6 flex items-center gap-2 text-slate-300">
                                        <span className="text-[10px] font-black uppercase tracking-widest">AI Engine Activo</span>
                                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <button 
                                    onClick={activeTab === 'image' ? handleGenerateImage : handleGenerateVideo}
                                    disabled={isGeneratingImage || isGeneratingVideo}
                                    className={`px-10 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3 ${activeTab === 'image' ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20' : 'bg-sky-600 text-white shadow-sky-600/20'} disabled:opacity-50`}
                                >
                                    {isGeneratingImage || isGeneratingVideo ? <RefreshIcon className="animate-spin" /> : <MagicIcon />}
                                    Generar {activeTab === 'image' ? 'Visual' : 'Animación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 120s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(19, 236, 109, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CreativeStudio;
