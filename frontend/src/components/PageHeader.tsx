'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

export default function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-down">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900 tracking-tight">{title}</h1>
                    {description && <p className="text-dark-400 mt-0.5 text-sm">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    );
}
