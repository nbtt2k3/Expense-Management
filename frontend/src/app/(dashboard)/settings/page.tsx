'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, User, Shield, Bell, Camera, Globe, Moon, WalletCards, TriangleAlert, Settings2, Trash2, Loader2 } from 'lucide-react';
import { useLanguage, Currency } from '@/i18n/LanguageContext';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
    const { t, locale, setLocale, currency, setCurrency, isDarkMode, setDarkMode, userProfile, fetchUserProfile } = useLanguage();
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string>('');
    const [newName, setNewName] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const email = localStorage.getItem('user_email') || t.common.unknown;
            setUserEmail(email);
        }
    }, [t.common.unknown]);

    useEffect(() => {
        if (userProfile?.full_name) {
            setNewName(userProfile.full_name);
        }
    }, [userProfile]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userProfile?.id) return;

        try {
            setIsUploading(true);
            const publicUrl = await authApi.uploadAvatar(file, userProfile.id);
            await authApi.updateProfile({ avatar_url: publicUrl });
            await fetchUserProfile();
            toast.success("Avatar updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload avatar");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setIsSaving(true);
            await authApi.updateProfile({ full_name: newName });
            await fetchUserProfile();
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        toast(t.auth.loggedOut);
        window.location.href = '/login';
    };

    const handleClearData = async () => {
        if (typeof window !== 'undefined') {
            await logout();
            localStorage.clear();
            toast(t.settings.localDataCleared);
            window.location.href = '/login';
        }
    };

    const handleCurrencyChange = (value: string) => {
        setCurrency(value as Currency);
        toast.success(t.settings.currencyChanged);
    };

    const handleLanguageChange = (value: string) => {
        setLocale(value as 'en' | 'vi');
        toast.success(value === 'vi' ? 'Đã đổi sang Tiếng Việt' : 'Language changed to English');
    };

    const handleDarkModeChange = (checked: boolean) => {
        setDarkMode(checked);
        toast.success(checked ? t.settings.darkModeEnabled : t.settings.darkModeDisabled);
    };

    const currentLanguageLabel = locale === 'vi' ? t.settings.vietnamese : t.settings.english;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12 w-full">
            <div className="flex flex-col mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.settings.title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t.settings.subtitle}
                </p>
            </div>

            <div className="flex flex-col gap-8">
                {/* Profile */}
                <Card className="border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-white shadow-sm overflow-hidden flex items-center justify-center">
                                    {isUploading ? (
                                        <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
                                    ) : userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 text-orange-400" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                                    <Camera className="w-3.5 h-3.5" />
                                </label>
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                        {userProfile?.full_name || 'No Name'}
                                    </h3>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400 tracking-wide uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        {t.settings.active}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{userProfile?.email || userEmail}</p>
                            </div>

                            {/* Edit Button */}
                            <Button onClick={handleUpdateProfile} disabled={isSaving} className="shrink-0 rounded-lg shadow-sm hidden sm:flex">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Profile
                            </Button>
                        </div>

                        <Button onClick={handleUpdateProfile} disabled={isSaving} className="w-full mt-4 rounded-lg shadow-sm sm:hidden">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Profile
                        </Button>

                        <div className="border-t border-zinc-100 dark:border-zinc-800 my-8"></div>

                        {/* Form Inputs */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t.settings.fullName}</Label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus-visible:ring-zinc-400"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Preferences */}
                <Card className="border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="mb-6 space-y-1">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-teal-600 dark:text-teal-500" />
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t.settings.preferences}</h3>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.settings.preferencesDesc}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        <WalletCards className="w-4 h-4" /> {t.settings.currency}
                                    </Label>
                                    <Select value={currency} onValueChange={handleCurrencyChange}>
                                        <SelectTrigger className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                                            <SelectItem value="VND">VND (đ) - Vietnamese Dong</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        <Globe className="w-4 h-4" /> {t.settings.language}
                                    </Label>
                                    <Select value={locale} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="vi">Tiếng Việt (VN)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Dark Mode Toggle block */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                        <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{t.settings.darkMode}</h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.settings.darkModeDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={isDarkMode}
                                    onCheckedChange={handleDarkModeChange}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Security */}
                <Card className="border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="mb-6 space-y-1">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t.settings.securitySession}</h3>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.settings.securityDesc}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Sign Out block */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                <div className="space-y-0.5">
                                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{t.settings.signOut}</h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.settings.signOutDesc}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="gap-2 shrink-0 rounded-lg border-zinc-200 dark:border-zinc-800"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t.auth.signOut}
                                </Button>
                            </div>

                            {/* Danger Zone */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
                                <div className="flex items-start gap-3">
                                    <TriangleAlert className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1 pr-4">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-xs text-red-600 dark:text-red-500 uppercase tracking-widest">{t.settings.dangerZone}</h4>
                                            <h5 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{t.settings.clearData}</h5>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                                            {t.settings.clearDataDesc}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={handleClearData}
                                    className="gap-2 shrink-0 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t.settings.clearData}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
