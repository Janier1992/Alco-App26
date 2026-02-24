
import React, { useState, useEffect, useCallback } from 'react';
import * as rr from 'react-router-dom';
const { HashRouter, Routes, Route, Outlet, Navigate, useLocation } = rr;
import Sidebar from './components/Sidebar';
import ReloadPrompt from './components/ReloadPrompt';
import PageLoader from './components/PageLoader';

// Lazy Load Pages
const LoginPage = React.lazy(() => import('./components/LoginPage'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Forms = React.lazy(() => import('./components/Forms'));
const Library = React.lazy(() => import('./components/Library'));
const Indicators = React.lazy(() => import('./components/Indicators'));
const Reports = React.lazy(() => import('./components/Reports'));
const Audits = React.lazy(() => import('./components/Audits'));
const NonConformities = React.lazy(() => import('./components/NonConformities'));
const Metrology = React.lazy(() => import('./components/Metrology'));
const MetrologyReplacement = React.lazy(() => import('./components/MetrologyReplacement'));
const Calibration = React.lazy(() => import('./components/Calibration'));
const AgentHub = React.lazy(() => import('./components/AgentHub'));
const Projects = React.lazy(() => import('./components/Projects'));
const Maintenance = React.lazy(() => import('./components/Maintenance'));
const QualityClaims = React.lazy(() => import('./components/QualityClaims'));
const AdminSettings = React.lazy(() => import('./components/AdminSettings'));
const Messaging = React.lazy(() => import('./components/Messaging'));


import type { User, NavItem } from './types';
import { NAV_ITEMS, Bars3Icon, BellIcon, ChevronDownIcon, UserCircleIcon, SunIcon, MoonIcon, GlobeIcon } from './constants';
import { VALID_USERS } from './users';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { NotificationProvider } from './components/NotificationSystem';
import { AgentProvider } from './components/AgentContext';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { MessagingProvider } from './components/MessagingContext';

const Header: React.FC<{ user: User; onLogout: () => void; onToggleSidebar: () => void }> = ({ user, onLogout, onToggleSidebar }) => {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white/80 dark:bg-[#0a0e18]/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-white/[0.04] px-4 py-3 flex justify-between items-center z-40 transition-all duration-300 flex-shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={onToggleSidebar} className="text-slate-400 hover:text-indigo-500 lg:hidden mr-1 transition-colors">
                    <Bars3Icon />
                </button>
                {/* Command Palette Search Bar */}
                <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-slate-100/80 dark:bg-white/[0.04] rounded-xl text-sm text-slate-400 border border-slate-200/60 dark:border-white/[0.06] cursor-pointer hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all w-[280px] lg:w-[340px] group">
                    <i className="fas fa-search text-xs text-slate-300 dark:text-slate-500 group-hover:text-indigo-400 transition-colors"></i>
                    <span className="text-xs font-medium text-slate-400">Buscar inspección, NC, documento...</span>
                    <kbd className="ml-auto hidden lg:flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-white/[0.06] rounded text-[9px] font-bold text-slate-300 dark:text-slate-500 border border-slate-200 dark:border-white/[0.06]">
                        <span className="text-[10px]">⌘</span>K
                    </kbd>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-200/80 dark:hover:bg-white/[0.08] transition-all border border-slate-200/60 dark:border-white/[0.06]"
                    title={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>

                <div className="relative">
                    <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/[0.04] p-1.5 px-3 rounded-xl transition-all border border-transparent hover:border-slate-200/80 dark:hover:border-white/[0.06]">
                        <div className="w-7 h-7 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                            {user.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="hidden sm:inline text-sm font-bold text-slate-700 dark:text-slate-200">{user.username}</span>
                        <ChevronDownIcon className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111827] rounded-xl shadow-2xl py-1.5 z-50 border border-slate-200/80 dark:border-white/[0.06] animate-scale-in">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-white/[0.04] mb-1">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.role}</p>
                            </div>
                            <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-rose-500 font-bold hover:bg-rose-500/10 rounded-lg mx-0 transition-colors">
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const MainLayout: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

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
                <Header user={user} onLogout={onLogout} onToggleSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
                    <Outlet />
                    <AgentHub />
                </main>
            </div>
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

    // ... inside App component return:
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
                                        <Route path="/" element={user ? <MainLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
                                            <Route index element={<Navigate to="/dashboard" />} />
                                            <Route path="dashboard" element={<Dashboard user={user!} />} />
                                            <Route path="quality/forms" element={<Forms />} />
                                            <Route path="quality/nc" element={<NonConformities />} />
                                            <Route path="quality/claims" element={<QualityClaims />} />
                                            <Route path="quality/audits" element={<Audits />} />
                                            <Route path="quality/library" element={<Library />} />
                                            <Route path="quality/indicators" element={<Indicators />} />
                                            <Route path="metrology" element={<Metrology />} />
                                            <Route path="metrology/replacement" element={<MetrologyReplacement />} />
                                            <Route path="metrology/calibration" element={<Calibration />} />
                                            <Route path="reports" element={<Reports />} />
                                            <Route path="ops/projects" element={<Projects />} />
                                            <Route path="maintenance/board" element={<Maintenance />} />

                                            <Route path="messaging" element={<Messaging />} />
                                            <Route path="settings" element={<AdminSettings />} />
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
