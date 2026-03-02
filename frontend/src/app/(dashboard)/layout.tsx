'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Receipt,
    PieChart,
    Settings,
    LogOut,
    Wallet,
    Menu,
    TrendingUp,
    Tags
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeToggle } from '@/components/theme-toggle';

const navKeys = [
    { href: '/dashboard', key: 'dashboard' as const, icon: LayoutDashboard },
    { href: '/expenses', key: 'expenses' as const, icon: Receipt },
    { href: '/incomes', key: 'incomes' as const, icon: TrendingUp },
    { href: '/budget', key: 'budget' as const, icon: Wallet },
    { href: '/analytics', key: 'analytics' as const, icon: PieChart },
    { href: '/categories', key: 'categories' as const, icon: Tags },
    { href: '/settings', key: 'settings' as const, icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success(t.auth.loggedOut);
        window.location.href = '/login';
    };

    const Sidebar = () => (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Expen<span className="text-emerald-500">zo</span>
                    </h1>
                </div>
            </div>

            <div className="px-4 pb-2">
                <p className="px-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Main Menu</p>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navKeys.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500")} />
                            {t.nav[item.key]}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-3" />
                        {t.auth.signOut}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
                <Sidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Expen<span className="text-emerald-500">zo</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 border-r-zinc-200 dark:border-r-zinc-800 bg-white dark:bg-zinc-950 w-72">
                                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                <Sidebar />
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </div>
                </main>
            </div>
        </div>
    );
}
