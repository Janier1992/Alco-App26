
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

    const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(() => {
        const findActiveParentId = (items: NavItem[]): string | null => {
            for (const item of items) {
                if (item.children) {
                    if (item.children.some(child => location.pathname.startsWith(child.path))) {
                        return item.id;
                    }
                    const nested = findActiveParentId(item.children); // Just in case of deeper nesting
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
                    <li key={item.id} className="mb-1">
                        <button
                            onClick={() => handleSubmenuToggle(item.id)}
                            className={`flex items-center w-full text-left p-3 transition-all duration-300 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white group
                                ${isParentActive && !isCollapsed ? 'text-[#5d5fef]' : ''} 
                                ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                            style={{ paddingLeft: isCollapsed ? '0' : `${(depth + 1) * 0.75}rem` }}
                        >
                            <div className="flex items-center truncate">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isOpen ? 'bg-[#5d5fef]/10 text-[#5d5fef]' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#5d5fef]'}`}>
                                    <item.icon />
                                </div>
                                {!isCollapsed && <span className="ml-3 font-bold text-xs truncate uppercase tracking-tight">{item.label}</span>}
                            </div>
                            {!isCollapsed && <ChevronDownIcon className={`flex-shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#5d5fef]' : 'text-slate-300 dark:text-slate-600'}`} />}
                        </button>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen && !isCollapsed ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <ul className="mt-1 space-y-1 border-l border-slate-200 dark:border-white/5 ml-7 py-1">
                                {renderNavLinks(item.children, depth + 1)}
                            </ul>
                        </div>
                    </li>
                );
            }

            return (
                <li key={item.id} title={isCollapsed ? item.label : undefined}>
                    <NavLink
                        to={item.path}
                        onClick={onMobileNavigate}
                        className={({ isActive }) =>
                            `flex items-center p-3 my-0.5 transition-all duration-200 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white mx-2 group
                            ${isCollapsed ? 'justify-center mx-0' : ''} 
                            ${isActive ? 'bg-[#5d5fef]/10 text-[#5d5fef] dark:text-white font-black border border-[#5d5fef]/20 shadow-sm dark:shadow-[0_5px_15px_rgba(93,95,239,0.1)]' : ''}`
                        }
                        style={{ paddingLeft: isCollapsed ? '0' : `${(depth + 1) * 0.75}rem` }}
                    >
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all`}>
                            <item.icon />
                        </div>
                        {!isCollapsed && <span className="ml-3 font-semibold text-xs uppercase tracking-wider">{item.label}</span>}
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
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[990] lg:hidden animate-fade-in"
                    onClick={onMobileNavigate}
                />
            )}

            <aside className={`bg-white dark:bg-alco-dark text-slate-900 dark:text-white flex flex-col fixed lg:relative z-[1000] h-full transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-white/5 ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} ${isMobileOpen ? 'left-0 shadow-2xl' : '-left-[280px]'} lg:left-0 lg:shadow-none`}>
                <div className={`flex items-center p-6 transition-all duration-300 h-[80px] flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                    <div className="w-10 h-10 bg-[#5d5fef] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_20px_rgba(93,95,239,0.3)]">
                        <i className="fas fa-layer-group text-sm"></i>
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3 overflow-hidden">
                            <span className="block text-lg font-black tracking-tighter leading-none text-slate-900 dark:text-white">PROYECTOS</span>
                            <span className="block text-[9px] font-black tracking-[0.4em] text-[#5d5fef] uppercase">CALIDAD</span>
                        </div>
                    )}
                    {/* Toggle Button for Desktop */}
                    <button
                        onClick={onToggleCollapse}
                        className={`absolute -right-3 top-9 w-6 h-6 bg-white dark:bg-alco-dark border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-[#5d5fef] shadow-sm z-50 hidden lg:flex transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                        title={isCollapsed ? "Expandir menú" : "Contraer menú"}
                    >
                        <ChevronDownIcon className="rotate-90 w-3 h-3" />
                    </button>
                </div>

                <nav className="flex-grow overflow-y-auto overflow-x-hidden py-4 px-2 custom-scrollbar">
                    <ul className="space-y-1">{renderNavLinks(NAV_ITEMS)}</ul>
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-white/5 flex-shrink-0">
                    <button onClick={onLogout} className="flex items-center w-full p-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all group">
                        <SignOutIcon />
                        {!isCollapsed && <span className="ml-3 font-bold text-xs uppercase tracking-widest">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside >
        </>
    );
};

export default Sidebar;
