import React from 'react';
import * as rr from 'react-router-dom';
const { Link } = rr;

interface Breadcrumb {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    crumbs: Breadcrumb[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ crumbs }) => (
    <nav aria-label="breadcrumb">
        <ol className="flex list-none p-0 text-sm text-slate-400 dark:text-slate-500">
            {crumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                    {index > 0 && (
                        <i className="fas fa-chevron-right text-[7px] text-slate-300 dark:text-slate-600 mx-2.5"></i>
                    )}
                    {crumb.path ? (
                        <Link to={crumb.path} className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors font-bold text-xs uppercase tracking-wider">{crumb.label}</Link>
                    ) : (
                        <span className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">{crumb.label}</span>
                    )}
                </li>
            ))}
        </ol>
    </nav>
);

export default Breadcrumbs;