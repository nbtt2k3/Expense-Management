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

    // Prevent hydration mismatch by returning a skeleton or null during SSR
    // This solves the `new Date().getFullYear()` and Radix DropdownMenu ID issues.
    if (!mounted) {
        return (
            <div className="flex min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-cyan-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900" />
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-zinc-50/50 via-white to-zinc-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 relative text-slate-900 dark:text-slate-50">
            {/* Left Side: Desktop Branding & Details */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden">
                {/* Background Pattern/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-zinc-900/50 to-teal-600/20 z-0 pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* Logo / Brand Name */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <span className="font-bold text-xl text-white">E</span>
                    </div>
                    <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                        Expen<span className="text-emerald-500">zo</span>
                    </span>
                </div>

                {/* Middle Content */}
                <div className="relative z-10 max-w-lg mt-12 mb-auto flex-1 flex flex-col justify-center">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-[1.15] text-balance">
                        Manage your expenses <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">gracefully.</span>
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                        A premium platform to track, analyze, and optimize your financial journey. Join thousands of users managing their wealth better.
                    </p>
                </div>

                {/* Footer Section */}
                <div className="relative z-10 flex items-center space-x-4">
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-medium text-emerald-800 dark:text-emerald-200">SJ</div>
                        <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-xs font-medium text-teal-800 dark:text-teal-200">MR</div>
                        <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-sm">AK</div>
                    </div>
                    <div className="text-sm font-medium text-zinc-400">
                        Trusted by <span className="text-white">10,000+</span> users
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Forms */}
            <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 relative">
                {/* Language switcher — top right */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-[400px] xl:max-w-[420px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
                    {children}
                </div>

                <div className="absolute bottom-6 text-center lg:hidden">
                    <p className="text-xs text-muted-foreground/60">
                        &copy; {new Date().getFullYear()} Expenzo
                    </p>
                </div>
            </div>
        </div>
    )
}
