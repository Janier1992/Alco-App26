
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as rr from 'react-router-dom';
const { HashRouter, Routes, Route, Outlet, Navigate, useLocation } = rr;
import Sidebar from './components/Sidebar';
import ReloadPrompt from './components/ReloadPrompt';
import PageLoader from './components/PageLoader';
import GlobalSearch from './components/GlobalSearch';

// Lazy Load Pages
const LoginPage = React.lazy(() => import('./components/LoginPage'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Forms = React.lazy(() => import('./components/Forms'));
const Indicators = React.lazy(() => import('./components/Indicators'));
const Reports = React.lazy(() => import('./components/Reports'));
const NonConformities = React.lazy(() => import('./components/NonConformities'));
const Metrology = React.lazy(() => import('./components/Metrology'));
const MetrologyReplacement = React.lazy(() => import('./components/MetrologyReplacement'));
const Calibration = React.lazy(() => import('./components/Calibration'));
const AgentHub = React.lazy(() => import('./components/AgentHub'));
const Maintenance = React.lazy(() => import('./components/Maintenance'));
const Messaging = React.lazy(() => import('./components/Messaging'));
const InstructivosDiseños = React.lazy(() => import('./components/InstructivosDisenos'));


import type { User, NavItem } from './types';
import { NAV_ITEMS, Bars3Icon, BellIcon, ChevronDownIcon, UserCircleIcon, SunIcon, MoonIcon, GlobeIcon } from './constants';
import { VALID_USERS } from './users';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { NotificationProvider } from './components/NotificationSystem';
import { AgentProvider } from './components/AgentContext';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { MessagingProvider } from './components/MessagingContext';
import { usePWAInstall } from './hooks/usePWAInstall';

// ─── Profile Modal ────────────────────────────────────────────────────────────
const ProfileModal: React.FC<{
    user: User;
    onClose: () => void;
    onSave: (name: string, avatar: string | null) => void;
}> = ({ user, onClose, onSave }) => {
    const savedAvatar = localStorage.getItem(`alco_avatar_${user.id}`) || null;
    const [name, setName] = useState(user.username);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(savedAvatar);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => setAvatarPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 600));
        onSave(name.trim() || user.username, avatarPreview);
        setSaveSuccess(true);
        setTimeout(() => { setSaveSuccess(false); onClose(); }, 800);
        setIsSaving(false);
    };

    const initials = (name || user.username).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#0f1623] rounded-2xl shadow-2xl border border-slate-200/60 dark:border-white/[0.06] overflow-hidden animate-scale-in">
                {/* Header gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

                <div className="p-6">
                    {/* Title */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white">Editar Perfil</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Personaliza tu identidad en la plataforma</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                        >
                            <i className="fas fa-times text-sm" />
                        </button>
                    </div>

                    {/* Avatar section */}
                    <div className="flex flex-col items-center mb-6">
                        <div
                            className={`relative w-24 h-24 rounded-2xl cursor-pointer group transition-all duration-200 ${
                                isDragging ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-[#0f1623] scale-105' : ''
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                                    {initials}
                                </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <i className="fas fa-camera text-white text-lg" />
                                <span className="text-white text-[10px] font-bold">Cambiar</span>
                            </div>
                            {/* Remove button */}
                            {avatarPreview && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAvatarPreview(null); }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                                    title="Eliminar foto"
                                >
                                    <i className="fas fa-times text-[9px]" />
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        />

                        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                            Haz clic o arrastra una imagen
                        </p>
                    </div>

                    {/* Name field */}
                    <div className="mb-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Nombre para mostrar
                        </label>
                        <div className="relative">
                            <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-sm" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={40}
                                placeholder="Tu nombre..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Role badge (read-only) */}
                    <div className="flex items-center gap-2 mb-6">
                        <i className="fas fa-shield-halved text-indigo-400 text-xs" />
                        <span className="text-xs text-slate-400">Rol: <span className="font-bold text-slate-600 dark:text-slate-300">{user.role}</span></span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                            ) : saveSuccess ? (
                                <><i className="fas fa-check text-xs" /> ¡Guardado!</>
                            ) : (
                                <><i className="fas fa-save text-xs" /> Guardar Cambios</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

const Header: React.FC<{
    user: User;
    onLogout: () => void;
    onToggleSidebar: () => void;
    onOpenSearch: () => void;
    onProfileUpdate: (name: string, avatar: string | null) => void;
}> = ({ user, onLogout, onToggleSidebar, onOpenSearch, onProfileUpdate }) => {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isProfileOpen, setProfileOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { isInstallable, promptInstall } = usePWAInstall();

    const savedAvatar = localStorage.getItem(`alco_avatar_${user.id}`) || null;
    const initials = user.username.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    const handleProfileSave = (name: string, avatar: string | null) => {
        if (avatar) {
            localStorage.setItem(`alco_avatar_${user.id}`, avatar);
        } else {
            localStorage.removeItem(`alco_avatar_${user.id}`);
        }
        onProfileUpdate(name, avatar);
        setProfileOpen(false);
        setUserMenuOpen(false);
    };

    return (
        <>
        <header className="bg-white/80 dark:bg-[#0a0e18]/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-white/[0.04] px-4 py-3 flex justify-between items-center z-40 transition-all duration-300 flex-shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={onToggleSidebar} className="text-slate-400 hover:text-indigo-500 lg:hidden mr-1 transition-colors">
                    <Bars3Icon />
                </button>
                {/* Command Palette Search Bar */}
                <button
                    type="button"
                    onClick={onOpenSearch}
                    className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-slate-100/80 dark:bg-white/[0.04] rounded-xl text-sm text-slate-400 border border-slate-200/60 dark:border-white/[0.06] cursor-pointer hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all w-[280px] lg:w-[340px] group"
                >
                    <i className="fas fa-search text-xs text-slate-300 dark:text-slate-500 group-hover:text-indigo-400 transition-colors"></i>
                    <span className="text-xs font-medium text-slate-400">Buscar inspección, NC, documento...</span>
                    <kbd className="ml-auto hidden lg:flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-white/[0.06] rounded text-[9px] font-bold text-slate-300 dark:text-slate-500 border border-slate-200 dark:border-white/[0.06]">
                        <span className="text-[10px]">⌘</span>K
                    </kbd>
                </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Búsqueda (móvil) */}
                <button
                    onClick={onOpenSearch}
                    className="md:hidden p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-200/80 dark:hover:bg-white/[0.08] transition-all border border-slate-200/60 dark:border-white/[0.06]"
                    title="Buscar"
                >
                    <i className="fas fa-search h-5 w-5"></i>
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-200/80 dark:hover:bg-white/[0.08] transition-all border border-slate-200/60 dark:border-white/[0.06]"
                    title={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>

                {isInstallable && (
                    <button
                        onClick={promptInstall}
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                        title="Instalar Aplicación"
                    >
                        <i className="fas fa-download"></i> Instalar
                    </button>
                )}

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.04] p-1.5 px-3 rounded-xl transition-all border border-transparent hover:border-slate-200/80 dark:hover:border-white/[0.06]"
                    >
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                            {savedAvatar ? (
                                <img src={savedAvatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-[10px] font-black">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <span className="hidden sm:inline text-sm font-bold text-slate-700 dark:text-slate-200">{user.username}</span>
                        <ChevronDownIcon className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                        <>
                            {/* Click-outside overlay */}
                            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111827] rounded-xl shadow-2xl py-1.5 z-50 border border-slate-200/80 dark:border-white/[0.06] animate-scale-in">
                                {/* User info header */}
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-white/[0.04] mb-1 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                                        {savedAvatar ? (
                                            <img src={savedAvatar} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xs font-black">
                                                {initials}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.username}</p>
                                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">{user.role}</p>
                                    </div>
                                </div>

                                {/* Edit Profile */}
                                <button
                                    onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    <i className="fas fa-user-pen text-xs w-4 text-center text-slate-400" />
                                    Editar Perfil
                                </button>

                                <div className="my-1 mx-3 h-px bg-slate-100 dark:bg-white/[0.04]" />

                                {/* Logout */}
                                <button
                                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
                                    className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors rounded-b-xl"
                                >
                                    <i className="fas fa-right-from-bracket text-xs w-4 text-center" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        {/* Profile Modal */}
        {isProfileOpen && (
            <ProfileModal
                user={user}
                onClose={() => setProfileOpen(false)}
                onSave={handleProfileSave}
            />
        )}
        </>
    );
};

const MainLayout: React.FC<{ user: User; onLogout: () => void; onProfileUpdate: (name: string, avatar: string | null) => void }> = ({ user, onLogout, onProfileUpdate }) => {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSearchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Atajo global ⌘K / Ctrl+K para abrir la búsqueda
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#060a14] overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
            <Sidebar
                onLogout={onLogout}
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                onMobileNavigate={() => setMobileSidebarOpen(false)}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />
            <div className="flex-1 flex flex-col transition-all duration-300 overflow-hidden relative">
                {!isOnline && (
                    <div className="offline-banner text-white text-[10px] font-black text-center py-2 px-4 z-50 flex items-center justify-center gap-2 uppercase tracking-wider animate-fade-in">
                        <i className="fas fa-wifi-slash text-xs"></i>
                        Sin Conexión — Funciones de sincronización e IA no disponibles
                    </div>
                )}
                <Header
                    user={user}
                    onLogout={onLogout}
                    onToggleSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
                    onOpenSearch={() => setSearchOpen(true)}
                    onProfileUpdate={onProfileUpdate}
                />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
                    <Outlet />
                    <AgentHub />
                </main>
            </div>
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('alco_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [users, setUsers] = useState<User[]>(VALID_USERS);

    const handleLogin = (u: User) => {
        setUser(u);
        localStorage.setItem('alco_user', JSON.stringify(u));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('alco_user');
    };

    const handleRegister = (newUser: Pick<User, 'username' | 'email' | 'password'>) => {
        if (users.find(u => u.email === newUser.email)) return null;
        const u: User = { ...newUser, id: Date.now().toString(), role: 'Nuevo Usuario' };
        setUsers([...users, u]);
        return u;
    };

    const handleProfileUpdate = (name: string, avatar: string | null) => {
        if (!user) return;
        const updated = { ...user, username: name };
        setUser(updated);
        localStorage.setItem('alco_user', JSON.stringify(updated));
    };

    return (
        <ThemeProvider>
            <NotificationProvider>
                <ConfirmDialogProvider>
                    <AgentProvider>
                        <MessagingProvider userId={user?.id || ''} userName={user?.username || ''}>
                            <HashRouter>
                                <React.Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        <Route
                                            path="/login"
                                            element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />}
                                        />
                                        <Route path="/" element={user ? <MainLayout user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} /> : <Navigate to="/login" />}>
                                            <Route index element={<Navigate to="/dashboard" />} />
                                            <Route path="dashboard" element={<Dashboard user={user!} />} />
                                            <Route path="quality/forms" element={<Forms />} />
                                            <Route path="quality/nc" element={<NonConformities />} />
                                            <Route path="quality/indicators" element={<Indicators />} />
                                            <Route path="quality/instructivos" element={<InstructivosDiseños />} />
                                            <Route path="metrology" element={<Metrology />} />
                                            <Route path="metrology/replacement" element={<MetrologyReplacement />} />
                                            <Route path="metrology/calibration" element={<Calibration />} />
                                            <Route path="reports" element={<Reports />} />
                                            <Route path="maintenance/board" element={<Maintenance />} />
                                            <Route path="messaging" element={<Messaging />} />
                                        </Route>
                                    </Routes>
                                </React.Suspense>
                            </HashRouter>
                        </MessagingProvider>
                        <ReloadPrompt />
                    </AgentProvider>
                </ConfirmDialogProvider>
            </NotificationProvider>
        </ThemeProvider>
    );
};

export default App;
