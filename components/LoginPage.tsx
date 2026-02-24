
import React, { useState, useEffect } from 'react';
import { supabase } from '../insforgeClient';
import type { User } from '../types';

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

    const { isInstallable, promptInstall } = usePWAInstall();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (view === 'login') {
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

                    const appUser: User = {
                        id: data.user.id,
                        email: data.user.email || '',
                        username: profile?.full_name || data.user.email?.split('@')[0] || 'Usuario',
                        role: profile?.role || 'user',
                    };
                    onLogin(appUser);
                }
            } else {
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: username,
                        }
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
            setError(err.message || 'Ocurrió un error al autenticar.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen w-full bg-[#060a14] text-slate-200 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-[600px] h-[600px] top-[-15%] left-[-10%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute w-[500px] h-[500px] bottom-[-15%] right-[-10%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s' }}></div>
                <div className="absolute w-[400px] h-[400px] top-[40%] left-[50%] -translate-x-1/2 bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }}></div>
                {/* Grid Lines */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
            </div>

            {/* Install PWA Button */}
            {isInstallable && (
                <button
                    onClick={promptInstall}
                    className="absolute top-6 right-6 flex items-center gap-2.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-bold text-xs uppercase tracking-wider z-50 animate-fade-in backdrop-blur-sm"
                >
                    <i className="fas fa-download"></i>
                    Instalar App
                </button>
            )}

            {/* Login Card */}
            <div className="relative w-full max-w-[420px] animate-fade-in-up z-10">
                {/* Card Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20 rounded-[2rem] blur-xl opacity-60"></div>

                <div className="relative bg-[#0d1225]/90 backdrop-blur-xl border border-white/[0.08] p-8 md:p-10 rounded-[2rem] shadow-2xl overflow-hidden">
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full"></div>

                    {/* Logo & Branding */}
                    <div className="mb-8 text-center relative z-10">
                        <div className="relative inline-block mb-5">
                            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 mx-auto">
                                <i className="fas fa-layer-group text-white text-xl"></i>
                            </div>
                            <div className="absolute -inset-2 bg-indigo-500/20 rounded-2xl blur-lg -z-10 animate-pulse" style={{ animationDuration: '3s' }}></div>
                        </div>

                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                            Proyectos <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Calidad</span>
                        </h2>
                        <div className="flex items-center justify-center gap-2 mt-2 mb-5">
                            <span className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-500/50"></span>
                            <span className="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.3em]">Ecosistema Cognitivo v2.0</span>
                            <span className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-500/50"></span>
                        </div>

                        <p className="text-slate-500 text-xs font-medium leading-relaxed px-2 max-w-[280px] mx-auto">
                            Gestiona auditorías, documentos y no conformidades desde una sola plataforma inteligente.
                        </p>
                    </div>

                    {/* Tab Selector */}
                    <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl mb-6 border border-white/5">
                        <button
                            onClick={() => setView('login')}
                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'login' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => setView('register')}
                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'register' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Crear Cuenta
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold text-center animate-scale-in">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4 relative z-10">
                        {view === 'register' && (
                            <div>
                                <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Nombre Operativo</label>
                                <div className="relative">
                                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs"></i>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-sm"
                                        placeholder="Nombre completo"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Email Corporativo</label>
                            <div className="relative">
                                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs"></i>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-sm"
                                    placeholder="email@empresa.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Contraseña</label>
                            <div className="relative">
                                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs"></i>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-5 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                        >
                            <span className="relative z-10">{loading ? 'Procesando...' : (view === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta')}</span>
                            {/* Shimmer overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-5 border-t border-white/5 text-center">
                        <button
                            onClick={() => setView(view === 'login' ? 'register' : 'login')}
                            className="text-slate-500 text-xs font-bold hover:text-indigo-400 transition-colors"
                        >
                            {view === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
