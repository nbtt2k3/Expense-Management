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
        <div className="flex flex-col h-full bg-slate-900 text-white">
            <div className="p-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-emerald-400">{t.common.appName}</h1>
                <ThemeToggle />
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {navKeys.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-emerald-600 text-white shadow-md"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {t.nav[item.key]}
                        </Link>
                    );
                })}
            </nav>
            <div className="px-4 py-2">
                <LanguageSwitcher />
            </div>
            <div className="p-4 border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    {t.auth.signOut}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
                <Sidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white shadow-sm">
                    <span className="font-bold text-lg text-emerald-400">{t.common.appName}</span>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 border-r-slate-800 bg-slate-900 w-64 text-white">
                                <SheetTitle className="sr-only">{t.nav.dashboard}</SheetTitle>
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
