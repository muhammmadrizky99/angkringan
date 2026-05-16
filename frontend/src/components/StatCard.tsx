'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: ReactNode;
    gradient: string;
    trend?: { value: number; label: string };
    delay?: number;
}

export default function StatCard({ label, value, icon, gradient, trend, delay = 0 }: StatCardProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay * 80);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            ref={ref}
            className={`card relative overflow-hidden group cursor-default transition-all duration-500 ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0'
                }`}
        >
            {/* Background decoration */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.07] bg-gradient-to-br ${gradient} transition-transform duration-500 group-hover:scale-110`} />
            <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-[0.04] bg-gradient-to-br ${gradient}`} />

            <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-400 font-medium truncate">{label}</p>
                    <p className="text-2xl font-bold text-dark-900 mt-0.5 tracking-tight">{value}</p>
                    {trend && (
                        <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-accent-600' : 'text-red-500'}`}>
                                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-dark-400">{trend.label}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
