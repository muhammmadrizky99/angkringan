'use client';

interface LoadingSkeletonProps {
    variant?: 'cards' | 'table' | 'detail' | 'chart';
    count?: number;
}

function SkeletonCards({ count }: { count: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card">
                    <div className="flex items-center gap-4">
                        <div className="skeleton-circle w-12 h-12 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton h-3 w-20" />
                            <div className="skeleton h-6 w-28" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SkeletonTable() {
    return (
        <div className="card p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="skeleton h-6 w-40" />
                <div className="ml-auto skeleton h-9 w-28 rounded-xl" />
            </div>
            <div className="divide-y divide-slate-50">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                        <div className="skeleton h-4 w-[30%]" />
                        <div className="skeleton h-4 w-[20%]" />
                        <div className="skeleton h-4 w-[15%]" />
                        <div className="skeleton h-6 w-16 rounded-lg" />
                        <div className="ml-auto skeleton h-8 w-8 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonChart() {
    return (
        <div className="card">
            <div className="skeleton h-6 w-48 mb-4" />
            <div className="skeleton h-64 w-full rounded-xl" />
        </div>
    );
}

function SkeletonDetail() {
    return (
        <div className="space-y-4">
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-4 w-72" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card">
                        <div className="skeleton h-4 w-20 mb-2" />
                        <div className="skeleton h-8 w-28" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LoadingSkeleton({ variant = 'cards', count = 4 }: LoadingSkeletonProps) {
    switch (variant) {
        case 'cards': return <SkeletonCards count={count} />;
        case 'table': return <SkeletonTable />;
        case 'chart': return <SkeletonChart />;
        case 'detail': return <SkeletonDetail />;
        default: return <SkeletonCards count={count} />;
    }
}
