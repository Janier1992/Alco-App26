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
        <ol className="flex list-none p-0 text-sm text-slate-500 dark:text-slate-400">
            {crumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                    {index > 0 && <span className="mx-2">/</span>}
                    {crumb.path ? (
                        <Link to={crumb.path} className="text-sky-700 dark:text-sky-400 hover:underline">{crumb.label}</Link>
                    ) : (
                        <span className="font-medium text-slate-700 dark:text-slate-300">{crumb.label}</span>
                    )}
                </li>
            ))}
        </ol>
    </nav>
);

export default Breadcrumbs;