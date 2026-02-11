
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState(''); // Only for register
    const [loading, setLoading] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        console.log('Listening for beforeinstallprompt');
        const handler = (e: Event) => {
            console.log('beforeinstallprompt fired', e);
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const [error, setError] = useState('');

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
                    // Fetch profile
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
                // Register
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

                if (data.user && data.session) {
                    // User signed up AND has a session (Auto-confirm enabled or not required)
                    const appUser: User = {
                        id: data.user.id,
                        email: data.user.email || '',
                        username: username,
                        role: 'user', // Default
                    };
                    onLogin(appUser);
                } else if (data.user && !data.session) {
                    // User signed up but waiting for email confirmation
                    setError('Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta antes de iniciar sesión.');
                    setLoading(false);
                    return; // Stop here, do not log in
                }
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al autenticar.');
        } finally {
            setLoading(false);
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0f1d] text-slate-200 flex items-center justify-center p-4 selection:bg-emerald-500/30 font-sans relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full"></div>
            </div>

            {/* Install Button (Only if installable) */}
            {deferredPrompt && (
                <button
                    onClick={handleInstallClick}
                    className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20 transition-all font-bold text-xs uppercase tracking-wider z-50 animate-fade-in"
                >
                    <i className="fas fa-download"></i>
                    Instalar App
                </button>
            )}

            <div className="bg-[#12172a] border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in-up relative overflow-hidden z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>

                <div className="mb-8 text-center">
                    <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4">
                        <i className="fas fa-layer-group text-slate-900 text-lg"></i>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
                        Calidad <span className="text-emerald-400">Proyectos</span>
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed px-4">
                        Simplifica el camino hacia la calidad total. Gestiona auditorías, documentos y no conformidades en una sola plataforma centralizada.
                    </p>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                        {view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold text-center uppercase tracking-wider animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4 relative z-10">
                    {view === 'register' && (
                        <div>
                            <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Nombre Operativo</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-700 text-sm"
                                placeholder="Nombre completo"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Email Corporativo</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-700 text-sm"
                            placeholder="email@alco.com"
                        />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-700 text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 mt-2 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Procesando...' : (view === 'login' ? 'Ingresar a Suite' : 'Registrarse')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setView(view === 'login' ? 'register' : 'login')}
                        className="text-slate-500 text-xs font-bold hover:text-emerald-400 transition-colors"
                    >
                        {view === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
