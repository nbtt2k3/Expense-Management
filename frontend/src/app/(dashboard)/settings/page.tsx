'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';
import { toast } from 'sonner';
import { LogOut, User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string>('');

    useEffect(() => {
        // Get stored user info
        if (typeof window !== 'undefined') {
            const email = localStorage.getItem('user_email') || 'Unknown';
            setUserEmail(email);
        }
    }, []);

    const handleLogout = async () => {
        await logout();
        toast('Logged out successfully');
        router.push('/login');
    };

    const handleClearData = () => {
        if (typeof window !== 'undefined') {
            localStorage.clear();
            toast('Local data cleared');
            router.push('/login');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Profile</CardTitle>
                        </div>
                        <CardDescription>Your account information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="text-base font-medium">{userEmail}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                            <p className="text-sm">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    ● Active
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
                            <CardTitle>Preferences</CardTitle>
                        </div>
                        <CardDescription>App display settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Currency</label>
                            <p className="text-base font-medium">USD ($)</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Language</label>
                            <p className="text-base font-medium">English</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Security & Session</CardTitle>
                        </div>
                        <CardDescription>Manage your account session</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleClearData}
                                className="gap-2"
                            >
                                Clear Local Data & Sign Out
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Signing out will clear your session token. Your data on the server is not affected.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
