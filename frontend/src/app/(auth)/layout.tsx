'use client';

import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950" />
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-8 relative selection:bg-emerald-500/30">
            {/* Minimalist Background Layout */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-zinc-50 to-zinc-50 dark:from-emerald-900/20 dark:via-zinc-950 dark:to-zinc-950 opacity-100" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] dark:opacity-[0.04] mix-blend-overlay" />
            </div>

            {/* Top Navigation */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-50 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <span className="font-bold text-sm text-white">E</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
                    Expen<span className="text-emerald-500">zo</span>
                </span>
            </div>

            <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50">
                <LanguageSwitcher />
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-[420px] mx-auto z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                {children}
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 sm:bottom-8 text-center w-full z-10 pointer-events-none">
                <p className="text-xs text-zinc-400 dark:text-zinc-600 font-medium tracking-wide">
                    &copy; {new Date().getFullYear()} Expenzo. All rights reserved.
                </p>
            </div>
        </div>
    )
}
