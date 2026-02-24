
import React, { useState } from 'react';
import * as rr from 'react-router-dom';
const { NavLink, useLocation } = rr;
import type { User, NavItem } from '../types';
import { NAV_ITEMS, SignOutIcon, ChevronDownIcon } from '../constants';

interface SidebarProps {
    onLogout: () => void;
    isCollapsed: boolean;
    isMobileOpen: boolean;
    onMobileNavigate: () => void;
    onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isCollapsed, isMobileOpen, onMobileNavigate, onToggleCollapse }) => {
    const location = useLocation();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    React.useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(() => {
        const findActiveParentId = (items: NavItem[]): string | null => {
            for (const item of items) {
                if (item.children) {
                    if (item.children.some(child => location.pathname.startsWith(child.path))) {
                        return item.id;
                    }
                    const nested = findActiveParentId(item.children);
                    if (nested) return nested;
                }
            }
            return null;
        };
        return findActiveParentId(NAV_ITEMS);
    });

    const handleSubmenuToggle = (id: string) => {
        setOpenSubmenuId(prev => (prev === id ? null : id));
    };

    const renderNavLinks = (items: NavItem[], depth = 0) => {
        return items.map(item => {
            if (item.children) {
                const isOpen = openSubmenuId === item.id;
                const isParentActive = item.children.some(child => location.pathname.startsWith(child.path));

                return (
                    <li key={item.id} className="mb-0.5">
                        <button
                            onClick={() => handleSubmenuToggle(item.id)}
                            className={`flex items-center w-full text-left p-2.5 transition-all duration-200 rounded-xl group relative
                                ${isParentActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'} 
                                ${isCollapsed ? 'justify-center px-0' : 'justify-between'}
                                hover:bg-slate-100 dark:hover:bg-white/[0.04]`}
                            style={{ paddingLeft: isCollapsed ? '0' : `${(depth + 1) * 0.75}rem` }}
                        >
                            <div className="flex items-center truncate">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isParentActive || isOpen ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500'}`}>
                                    <item.icon />
                                </div>
                                {!isCollapsed && <span className="ml-3 font-bold text-[11px] truncate uppercase tracking-tight">{item.label}</span>}
                            </div>
                            {!isCollapsed && <ChevronDownIcon className={`flex-shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />}
                            {/* Tooltip in collapsed mode */}
                            {isCollapsed && <div className="sidebar-tooltip">{item.label}</div>}
                        </button>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen && !isCollapsed ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <ul className="mt-1 space-y-0.5 border-l-2 border-slate-200/60 dark:border-white/[0.04] ml-7 py-1">
                                {renderNavLinks(item.children, depth + 1)}
                            </ul>
                        </div>
                    </li>
                );
            }

            const isActive = location.pathname.startsWith(item.path);

            return (
                <li key={item.id} title={isCollapsed ? item.label : undefined} className="relative group">
                    <NavLink
                        to={item.path}
                        onClick={onMobileNavigate}
                        className={({ isActive }) =>
                            `flex items-center p-2.5 my-0.5 transition-all duration-200 rounded-xl mx-1 group relative
                            ${isCollapsed ? 'justify-center mx-0' : ''} 
                            ${isActive
                                ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/5 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-500/15 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
                            }`
                        }
                        style={{ paddingLeft: isCollapsed ? '0' : `${(depth + 1) * 0.75}rem` }}
                    >
                        {/* Active Indicator Bar */}
                        {isActive && !isCollapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-full"></div>
                        )}
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all`}>
                            <item.icon />
                        </div>
                        {!isCollapsed && <span className="ml-3 font-semibold text-[11px] uppercase tracking-wider">{item.label}</span>}
                        {/* Tooltip in collapsed mode */}
                        {isCollapsed && <div className="sidebar-tooltip">{item.label}</div>}
                    </NavLink>
                </li>
            );
        });
    };

    return (
        <>
            {/* Backdrop for Mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[990] lg:hidden animate-fade-in"
                    onClick={onMobileNavigate}
                />
            )}

            <aside className={`bg-white dark:bg-[#0a0e18] text-slate-900 dark:text-white flex flex-col fixed lg:relative z-[1000] h-full transition-all duration-300 ease-in-out border-r border-slate-200/80 dark:border-white/[0.04] ${isCollapsed ? 'w-[72px]' : 'w-[260px]'} ${isMobileOpen ? 'left-0 shadow-2xl' : '-left-[280px]'} lg:left-0 lg:shadow-none`}>

                {/* Logo */}
                <div className={`flex items-center p-5 transition-all duration-300 h-[72px] flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-500/20">
                        <i className="fas fa-layer-group text-sm"></i>
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3 overflow-hidden">
                            <span className="block text-base font-black tracking-tight leading-none text-slate-900 dark:text-white">PROYECTOS</span>
                            <span className="block text-[8px] font-black tracking-[0.35em] text-indigo-500 uppercase mt-0.5">CALIDAD</span>
                        </div>
                    )}
                    {/* Toggle Button for Desktop */}
                    <button
                        onClick={onToggleCollapse}
                        className={`absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-[#0a0e18] border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 shadow-sm z-50 hidden lg:flex transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                        title={isCollapsed ? "Expandir menú" : "Contraer menú"}
                    >
                        <ChevronDownIcon className="rotate-90 w-3 h-3" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-grow overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar">
                    <ul className="space-y-0.5">{renderNavLinks(NAV_ITEMS)}</ul>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.04] flex-shrink-0 space-y-2">
                    {/* Connection Status */}
                    {!isCollapsed && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'} ${isOnline ? 'animate-pulse' : ''}`} style={{ animationDuration: '2s' }}></div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-wider">v2.0</span>
                        </div>
                    )}

                    <button onClick={onLogout} className="flex items-center w-full p-2.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group">
                        <SignOutIcon />
                        {!isCollapsed && <span className="ml-3 font-bold text-[11px] uppercase tracking-widest">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
