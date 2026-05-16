'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="card text-center py-16 px-8 animate-fade-in">
            {icon && (
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-dark-50 flex items-center justify-center text-dark-300">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-dark-700 mb-1">{title}</h3>
            {description && <p className="text-sm text-dark-400 max-w-sm mx-auto mb-6">{description}</p>}
            {action}
        </div>
    );
}
