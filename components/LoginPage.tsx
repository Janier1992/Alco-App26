
import React, { useState, useEffect } from 'react';
import { supabase } from '../insforgeClient';
import type { User } from '../types';
import { VALID_USERS } from '../users';

import { usePWAInstall } from '../hooks/usePWAInstall';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0, clientX: 0, clientY: 0 });

    const { isInstallable, promptInstall } = usePWAInstall();

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const w = window.innerWidth;
            const h = window.innerHeight;
            // Normalize values from -0.5 to 0.5
            const x = (clientX / w) - 0.5;
            const y = (clientY / h) - 0.5;
            setMousePos({ x, y, clientX, clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (view === 'login') {
                let sessionUser: User | null = null;

                try {
                    const { data, error: authError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });

                    if (authError) throw authError;

                    if (data.user) {
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', data.user.id)
                            .single();

                        if (profileError && profileError.code !== 'PGRST116') {
                            console.error('Profile fetch error:', profileError);
                        }

                        sessionUser = {
                            id: data.user.id,
                            email: data.user.email || '',
                            username: profile?.full_name || data.user.email?.split('@')[0] || 'Usuario',
                            role: profile?.role || 'user',
                        };
                    }
                } catch (err: any) {
                    console.warn("Autenticación remota no disponible. Iniciando fallback local:", err);
                    
                    // Fallback a los usuarios locales definidos
                    const foundUser = VALID_USERS.find(
                        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
                    );

                    if (foundUser) {
                        const { password: _, ...userWithoutPassword } = foundUser;
                        sessionUser = userWithoutPassword;
                        console.log("Sesión de desarrollo local iniciada para:", sessionUser.username);
                    } else {
                        throw new Error('Credenciales inválidas. Intento remoto y local fallidos.');
                    }
                }

                if (sessionUser) {
                    onLogin(sessionUser);
                }
            } else {
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: username,
                        },
                        emailRedirectTo: window.location.origin
                    }
                });

                if (authError) throw authError;

                if (data.user && data.accessToken) {
                    const appUser: User = {
                        id: data.user.id,
                        email: data.user.email || '',
                        username: username,
                        role: 'user',
                    };
                    onLogin(appUser);
                } else if (data.user && !data.accessToken) {
                    setError('Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta antes de iniciar sesión.');
                    setLoading(false);
                    return;
                }
            }
        } catch (err: any) {
            let msg = err.message || 'Ocurrió un error al autenticar.';
            const isUserExists = msg.toLowerCase().includes('already exists') || 
                                 msg.toLowerCase().includes('already registered') || 
                                 msg.toLowerCase().includes('usuario ya existe');
            
            if (isUserExists) {
                msg = 'Este usuario ya se encuentra registrado en la plataforma. Por favor, dirígete a tu correo electrónico para confirmar tu registro.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#060a14] text-slate-200 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Animated Mesh Gradient Background with floating orbital light auras and Quality Assurance particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Smooth fluid shifting atmospheric gas-glow auroras */}
                <div className="absolute w-[650px] h-[650px] top-[-20%] left-[-15%] bg-indigo-600/10 rounded-full blur-[140px] animate-float-glow-1"></div>
                <div className="absolute w-[550px] h-[550px] bottom-[-20%] right-[-15%] bg-violet-600/10 rounded-full blur-[140px] animate-float-glow-2"></div>
                <div className="absolute w-[450px] h-[450px] top-[30%] left-[45%] -translate-x-1/2 bg-emerald-500/5 rounded-full blur-[120px] animate-float-glow-3"></div>
                
                {/* Interactive cursor follow spotlight */}
                <div 
                    className="absolute rounded-full bg-gradient-to-r from-indigo-500/10 via-violet-550/5 to-emerald-500/5 blur-[120px] transition-all duration-300 ease-out opacity-80"
                    style={{
                        left: `${mousePos.clientX - 250}px`,
                        top: `${mousePos.clientY - 250}px`,
                        width: '500px',
                        height: '500px',
                        transform: 'translate3d(0, 0, 0)',
                        visibility: mousePos.clientX === 0 ? 'hidden' : 'visible'
                    }}
                ></div>

                {/* Slow spinning design mesh gradients */}
                <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-indigo-500/5 to-violet-500/5 blur-[80px] animate-spin" style={{ animationDuration: '40s' }}></div>
                <div className="absolute bottom-[30%] right-[30%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-violet-500/5 to-emerald-500/5 blur-[90px] animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}></div>
                
                {/* Micro Grid Lines (illuminates as spotlight moves over it) */}
                <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

                {/* Floating Quality Assurance (Aseguramiento de Calidad) Representative Telemetry Cards with 3D Parallax */}
                
                {/* 1. Shield Check - Top Right (Garantía ISO) */}
                <div 
                    className="hidden lg:flex absolute top-[12%] right-[18%] z-10 select-none pointer-events-auto transition-transform duration-300 ease-out flex-col items-center group/card"
                    style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)` }}
                >
                    <div className="animate-drift-1 flex flex-col items-center">
                        <div className="relative p-5 bg-[#080d1a]/85 backdrop-blur-xl rounded-2.5xl border border-white/[0.08] shadow-2xl group-hover/card:border-indigo-500/40 group-hover/card:shadow-indigo-500/20 group-hover/card:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-w-[125px]">
                            {/* Tech spin ring behind icon */}
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-indigo-500/20 animate-spin-slow pointer-events-none group-hover/card:border-indigo-500/40 transition-colors"></div>
                            {/* Pulse status indicator */}
                            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            
                            <div className="relative text-indigo-400 group-hover/card:text-indigo-300 group-hover/card:rotate-3 transition-all duration-300">
                                <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 text-indigo-200">Garantía ISO</span>
                            <span className="text-[6px] font-mono text-emerald-400 mt-1.5 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 group-hover/card:bg-emerald-500/20 transition-all">[PASS: 99.8%]</span>
                        </div>
                    </div>
                </div>

                {/* 2. Document Checkmark List - Mid Left (Acreditación SGC) */}
                <div 
                    className="hidden lg:flex absolute top-[38%] left-[8%] z-10 select-none pointer-events-auto transition-transform duration-300 ease-out flex-col items-center group/card"
                    style={{ transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -25}px)` }}
                >
                    <div className="animate-drift-2 flex flex-col items-center">
                        <div className="relative p-5 bg-[#080d1a]/85 backdrop-blur-xl rounded-2.5xl border border-white/[0.08] shadow-2xl group-hover/card:border-violet-500/40 group-hover/card:shadow-violet-500/20 group-hover/card:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-w-[125px]">
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-violet-500/20 animate-spin-reverse pointer-events-none group-hover/card:border-violet-500/40 transition-colors"></div>
                            <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                            <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                            
                            <div className="relative text-violet-400 group-hover/card:text-violet-300 group-hover/card:-rotate-3 transition-all duration-300">
                                <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 text-violet-200">Acreditación SGC</span>
                            <span className="text-[6px] font-mono text-indigo-400 mt-1.5 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 group-hover/card:bg-indigo-500/20 transition-all">[SGC_VERIFIED]</span>
                        </div>
                    </div>
                </div>

                {/* 3. Approved Quality Seal - Bottom Left (QA Aprobado) */}
                <div 
                    className="hidden lg:flex absolute bottom-[15%] left-[22%] z-10 select-none pointer-events-auto transition-transform duration-300 ease-out flex-col items-center group/card"
                    style={{ transform: `translate(${mousePos.x * 28}px, ${mousePos.y * 28}px)` }}
                >
                    <div className="animate-drift-3 flex flex-col items-center">
                        <div className="relative p-5 bg-[#080d1a]/85 backdrop-blur-xl rounded-2.5xl border border-white/[0.08] shadow-2xl group-hover/card:border-emerald-500/40 group-hover/card:shadow-emerald-500/20 group-hover/card:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-w-[125px]">
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-emerald-500/20 animate-spin-slow pointer-events-none group-hover/card:border-emerald-500/40 transition-colors"></div>
                            <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                            <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                            
                            <div className="relative text-emerald-400 group-hover/card:text-emerald-300 group-hover/card:scale-110 transition-all duration-300">
                                <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 text-emerald-200">QA Aprobado</span>
                            <span className="text-[6px] font-mono text-emerald-400 mt-1.5 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 group-hover/card:bg-emerald-500/20 transition-all">[ZERO_DEFECTS]</span>
                        </div>
                    </div>
                </div>

                {/* 4. Target Precision - Mid Right (Tolerancia Cero) */}
                <div 
                    className="hidden lg:flex absolute top-[52%] right-[10%] z-10 select-none pointer-events-auto transition-transform duration-300 ease-out flex-col items-center group/card"
                    style={{ transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -18}px)` }}
                >
                    <div className="animate-drift-1 flex flex-col items-center">
                        <div className="relative p-5 bg-[#080d1a]/85 backdrop-blur-xl rounded-2.5xl border border-white/[0.08] shadow-2xl group-hover/card:border-indigo-500/40 group-hover/card:shadow-indigo-500/20 group-hover/card:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-w-[125px]">
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-indigo-500/20 animate-spin-reverse pointer-events-none group-hover/card:border-indigo-500/40 transition-colors"></div>
                            <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></div>
                            <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                            
                            <div className="relative text-indigo-400 group-hover/card:text-indigo-300 group-hover/card:rotate-12 transition-all duration-300">
                                <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 0v4m0-4h4m-4 0H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z"></path>
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 text-indigo-200">Tolerancia Cero</span>
                            <span className="text-[6px] font-mono text-indigo-400 mt-1.5 uppercase tracking-widest px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 group-hover/card:bg-indigo-500/20 transition-all">[TOL: ±0.01mm]</span>
                        </div>
                    </div>
                </div>

                {/* 5. Process Charts - Top Left (Control Estadístico) */}
                <div 
                    className="hidden lg:flex absolute top-[8%] left-[16%] z-10 select-none pointer-events-auto transition-transform duration-300 ease-out flex-col items-center group/card"
                    style={{ transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)` }}
                >
                    <div className="animate-drift-2 flex flex-col items-center">
                        <div className="relative p-5 bg-[#080d1a]/85 backdrop-blur-xl rounded-2.5xl border border-white/[0.08] shadow-2xl group-hover/card:border-slate-500/40 group-hover/card:shadow-slate-500/20 group-hover/card:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-w-[125px]">
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-slate-500/20 animate-spin-slow pointer-events-none group-hover/card:border-slate-500/40 transition-colors"></div>
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            
                            <div className="relative text-slate-400 group-hover/card:text-slate-200 transition-all duration-300">
                                <svg className="w-10 h-10 drop-shadow-[0_0_8px_rgba(148,163,184,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-3 text-slate-200">Control Estadístico</span>
                            <span className="text-[6px] font-mono text-emerald-400 mt-1.5 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 group-hover/card:bg-emerald-500/20 transition-all">{"[CPK: >= 1.67]"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Install PWA Button */}
            {isInstallable && (
                <button
                    onClick={promptInstall}
                    className="absolute top-6 right-6 flex items-center gap-2.5 px-5 py-2.5 bg-white/5 hover:bg-indigo-500/15 text-indigo-300 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all font-bold text-xs uppercase tracking-wider z-50 animate-fade-in backdrop-blur-md shadow-lg"
                >
                    <i className="fas fa-download text-xs text-indigo-400"></i>
                    Instalar App
                </button>
            )}

            {/* Premium Glassmorphic Login Card Container */}
            <div className="relative w-full max-w-[430px] animate-fade-in-up z-10 p-1">
                {/* Extra deep neon aura floating behind card */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500/15 via-violet-600/15 to-emerald-500/5 rounded-[2.5rem] blur-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative bg-[#0b0f1d]/90 backdrop-blur-2xl border border-white/[0.08] p-8 md:p-10 rounded-[2.25rem] shadow-2xl overflow-hidden">
                    
                    {/* Decorative abstract visual accent */}
                    <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent rounded-bl-[4rem]"></div>

                    {/* Header Branding */}
                    <div className="mb-10 text-center relative z-10">
                        <div className="relative inline-block mb-6 group cursor-pointer">
                            {/* Sleek icon shape with shadow glow */}
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto border border-white/10 group-hover:scale-105 active:scale-95 transition-all duration-300">
                                <i className="fas fa-layer-group text-white text-2xl"></i>
                            </div>
                            {/* Double halo pulsing rings */}
                            <div className="absolute -inset-2 bg-indigo-500/20 rounded-[1.5rem] blur-xl -z-10 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 animate-pulse"></div>
                        </div>

                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-6">
                            PROYECTOS <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">CALIDAD</span>
                        </h2>

                        <p className="text-slate-400/80 text-xs font-semibold leading-relaxed px-1 max-w-[310px] mx-auto opacity-80">
                            Portal único de control de calidad posventa, administración de metrología e inspección técnica asistida por IA.
                        </p>
                    </div>

                    {/* Capsule Sliding Tab Selector (SaaS Luxury Style) */}
                    <div className="flex relative p-1 bg-slate-950/60 rounded-2xl mb-8 border border-white/[0.04]">
                        {/* Smooth sliding capsule */}
                        <div 
                            className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 shadow-inner transition-all duration-300 ease-out"
                            style={{
                                width: 'calc(50% - 6px)',
                                left: view === 'login' ? '4px' : 'calc(50% + 2px)',
                            }}
                        ></div>
                        <button
                            type="button"
                            onClick={() => { setView('login'); setError(''); }}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center z-10 transition-colors duration-300 ${view === 'login' ? 'text-indigo-200' : 'text-slate-500 hover:text-slate-350'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            type="button"
                            onClick={() => { setView('register'); setError(''); }}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center z-10 transition-colors duration-300 ${view === 'register' ? 'text-indigo-200' : 'text-slate-500 hover:text-slate-350'}`}
                        >
                            Crear Cuenta
                        </button>
                    </div>

                    {/* Error Box (Vibrant alert glassmorphism style) */}
                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-bold text-center animate-scale-in relative overflow-hidden">
                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500"></div>
                            {error}
                        </div>
                    )}

                    {/* Form Group Fields */}
                    <form onSubmit={handleAuth} className="space-y-5 relative z-10">
                        {view === 'register' && (
                            <div className="group">
                                <label className="block mb-1.5 text-[9px] font-black uppercase text-slate-500 tracking-widest px-1.5 group-focus-within:text-indigo-400 transition-colors">Nombre Operativo</label>
                                <div className="relative">
                                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-650 text-xs group-focus-within:text-indigo-400 group-hover:text-slate-400 transition-colors"></i>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-5 py-3.5 bg-slate-900/40 border border-white/[0.06] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-550/40 hover:border-indigo-500/20 hover:bg-slate-900/60 transition-all placeholder:text-slate-700 text-sm font-semibold shadow-inner"
                                        placeholder="Tu nombre completo"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="group">
                            <label className="block mb-1.5 text-[9px] font-black uppercase text-slate-500 tracking-widest px-1.5 group-focus-within:text-indigo-400 transition-colors">Email Corporativo</label>
                            <div className="relative">
                                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-650 text-xs group-focus-within:text-indigo-400 group-hover:text-slate-400 transition-colors"></i>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-900/40 border border-white/[0.06] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-550/40 hover:border-indigo-500/20 hover:bg-slate-900/60 transition-all placeholder:text-slate-700 text-sm font-semibold shadow-inner"
                                    placeholder="email@alco.com"
                                />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block mb-1.5 text-[9px] font-black uppercase text-slate-500 tracking-widest px-1.5 group-focus-within:text-indigo-400 transition-colors">Contraseña</label>
                            <div className="relative">
                                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-650 text-xs group-focus-within:text-indigo-400 group-hover:text-slate-400 transition-colors"></i>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-900/40 border border-white/[0.06] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-550/40 hover:border-indigo-500/20 hover:bg-slate-900/60 transition-all placeholder:text-slate-700 text-sm font-semibold shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Interactive glow submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-600 via-indigo-550 to-violet-650 hover:from-indigo-500 hover:to-violet-550 text-white font-black rounded-xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner animate-spin"></i> Procesando...
                                    </>
                                ) : (
                                    <>
                                        {view === 'login' ? <i className="fas fa-sign-in-alt"></i> : <i className="fas fa-user-plus"></i>}
                                        {view === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta'}
                                    </>
                                )}
                            </span>
                            {/* Gloss Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        </button>
                    </form>

                    {/* Modern dynamic view switcher Footer */}
                    <div className="mt-8 pt-5 border-t border-white/[0.04] text-center">
                        <button
                            type="button"
                            onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}
                            className="text-slate-500 hover:text-indigo-400 font-bold text-xs transition-colors py-1 px-3 rounded-lg hover:bg-white/[0.02]"
                        >
                            {view === 'login' ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes una cuenta? Inicia Sesión'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
