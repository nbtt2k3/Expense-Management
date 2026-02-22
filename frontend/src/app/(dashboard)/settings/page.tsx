'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, User, Shield, Bell } from 'lucide-react';
import { useLanguage, Currency } from '@/i18n/LanguageContext';

export default function SettingsPage() {
    const { t, locale, currency, setCurrency } = useLanguage();
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const email = localStorage.getItem('user_email') || t.common.unknown;
            setUserEmail(email);
        }
    }, []);

    const handleLogout = async () => {
        await logout();
        toast(t.auth.loggedOut);
        window.location.href = '/login';
    };

    const handleClearData = async () => {
        if (typeof window !== 'undefined') {
            await logout(); // This also clears localStorage and cookies for auth
            localStorage.clear(); // Clear any other local data like preferences
            toast(t.settings.localDataCleared);
            window.location.href = '/login';
        }
    };

    const handleCurrencyChange = (value: string) => {
        setCurrency(value as Currency);
        toast.success(t.settings.currencyChanged);
    };

    const currentLanguageLabel = locale === 'vi' ? t.settings.vietnamese : t.settings.english;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.settings.title}</h2>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>{t.settings.profile}</CardTitle>
                        </div>
                        <CardDescription>{t.settings.accountInfo}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t.auth.email}</label>
                            <p className="text-base font-medium">{userEmail}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t.settings.accountStatus}</label>
                            <p className="text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    ● {t.settings.active}
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>{t.settings.preferences}</CardTitle>
                        </div>
                        <CardDescription>{t.settings.appSettings}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t.settings.currency}</label>
                            <Select value={currency} onValueChange={handleCurrencyChange}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">{t.settings.currencyUSD}</SelectItem>
                                    <SelectItem value="VND">{t.settings.currencyVND}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t.settings.language}</label>
                            <p className="text-base font-medium">{currentLanguageLabel}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>{t.settings.securitySession}</CardTitle>
                        </div>
                        <CardDescription>{t.settings.manageSession}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                {t.auth.signOut}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleClearData}
                                className="gap-2"
                            >
                                {t.settings.clearData}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t.settings.sessionNote}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
