
import React, { useState, useEffect, useCallback } from 'react';
import * as rr from 'react-router-dom';
const { HashRouter, Routes, Route, Outlet, Navigate, useLocation } = rr;
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ReloadPrompt from './components/ReloadPrompt';
import Forms from './components/Forms';
import Library from './components/Library';
import Indicators from './components/Indicators';
import Reports from './components/Reports';
import Audits from './components/Audits';
import NonConformities from './components/NonConformities';
import Metrology from './components/Metrology';
import MetrologyReplacement from './components/MetrologyReplacement';
import Calibration from './components/Calibration';
import AgentHub from './components/AgentHub';
import Installations from './components/Installations';
import Projects from './components/Projects';
import QualityClaims from './components/QualityClaims';


import type { User, NavItem } from './types';
import { NAV_ITEMS, Bars3Icon, BellIcon, ChevronDownIcon, UserCircleIcon, SunIcon, MoonIcon, GlobeIcon } from './constants';
import { VALID_USERS } from './users';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { NotificationProvider } from './components/NotificationSystem';
import { AgentProvider } from './components/AgentContext';

const Header: React.FC<{ user: User; onLogout: () => void; onToggleSidebar: () => void }> = ({ user, onLogout, onToggleSidebar }) => {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white dark:bg-alco-surface border-b border-slate-200 dark:border-white/5 p-4 flex justify-between items-center z-40 transition-all duration-300 flex-shrink-0">
            <div className="flex items-center">
                <button onClick={onToggleSidebar} className="text-slate-400 hover:text-[#5d5fef] lg:hidden mr-4">
                    <Bars3Icon />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#5d5fef] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-[0_0_15px_rgba(93,95,239,0.3)]">C</div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white hidden sm:block uppercase tracking-tighter">PROYECTOS <span className="text-[#5d5fef]">CALIDAD</span></h1>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-[#5d5fef] hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5"
                    title={theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>

                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black text-slate-500 dark:text-[#a1a1aa] uppercase tracking-widest border border-slate-200 dark:border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5d5fef]"></span> {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                </div>

                <div className="relative">
                    <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 p-1 px-3 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:border-white/5">
                        <UserCircleIcon className="text-slate-400" />
                        <span className="hidden sm:inline text-sm font-bold text-slate-700 dark:text-slate-200">{user.username}</span>
                        <ChevronDownIcon className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-alco-surface rounded-2xl shadow-2xl py-2 z-50 border border-slate-200 dark:border-white/10">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 mb-2">
                                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.role}</p>
                            </div>
                            <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-rose-500 font-bold hover:bg-rose-500/10">
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
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-alco-dark overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
            <Sidebar
                onLogout={onLogout}
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                onMobileNavigate={() => setMobileSidebarOpen(false)}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />
            <div className="flex-1 flex flex-col transition-all duration-300 overflow-hidden">
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

    return (
        <ThemeProvider>
            <NotificationProvider>
                <AgentProvider>
                    <HashRouter>
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

                                <Route path="installations" element={<Installations />} />
                            </Route>
                        </Routes>
                        <ReloadPrompt />
                    </HashRouter>
                </AgentProvider>
            </NotificationProvider>
        </ThemeProvider>
    );
};

export default App;
