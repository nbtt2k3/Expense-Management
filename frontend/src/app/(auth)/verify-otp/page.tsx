'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import { Suspense } from 'react';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const email = searchParams.get('email') || '';
    const type = searchParams.get('type') || 'signup';

    async function handleVerify() {
        if (otp.length !== 6) {
            toast.error(t.auth.otpInvalid);
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                token: otp,
                type,
            });

            if (type === 'signup') {
                toast.success(t.auth.otpVerified);
                router.push('/login');
            } else {
                toast.success(t.auth.otpVerified);
                if (response.data.access_token) {
                    localStorage.setItem('reset_token', response.data.access_token);
                }
                router.push('/reset-password');
            }
        } catch (error: any) {
            const message = error.response?.data?.detail || t.auth.otpInvalid;
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResend() {
        setIsResending(true);
        try {
            await api.post('/auth/resend-otp', { email, type });
            toast.success(t.auth.otpResent);
        } catch (error: any) {
            const message = error.response?.data?.detail || t.auth.otpResendFailed;
            toast.error(message);
        } finally {
            setIsResending(false);
        }
    }

    return (
        <Card className="w-full border-0 sm:border border-zinc-200/50 dark:border-zinc-800/50 shadow-none sm:shadow-xl sm:shadow-emerald-500/5 bg-transparent sm:bg-white/90 sm:dark:bg-zinc-950/90 sm:backdrop-blur-xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-10 relative z-10">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">
                    {t.auth.verifyEmail}
                </CardTitle>
                <CardDescription className="text-center text-zinc-500 dark:text-zinc-400">
                    {t.auth.otpSent} <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{email}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-6 sm:px-10 pb-8 relative z-10">
                <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} disabled={isLoading}>
                        <InputOTPGroup className="gap-2 sm:gap-3 flex justify-between w-full">
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={0} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={1} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={2} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={3} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={4} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50 transition-all font-mono" index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                <Button
                    className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={handleVerify}
                    disabled={isLoading || otp.length !== 6}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.auth.verify}
                </Button>
            </CardContent>
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 px-6 sm:px-10 py-6 border-t border-zinc-100 dark:border-zinc-800/50 relative z-10 flex flex-col space-y-4">
                <div className="flex flex-col space-y-3 text-sm text-center font-medium">
                    <div className="text-zinc-600 dark:text-zinc-400">
                        {t.auth.didntReceive}{' '}
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-zinc-900 dark:text-white font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 transition-colors"
                        >
                            {isResending ? (
                                <span className="inline-flex justify-center items-center"><Loader2 className="mr-2 h-3 w-3 animate-spin" /> {t.common.loading}</span>
                            ) : t.auth.resend}
                        </button>
                    </div>
                    <div className="flex justify-center mt-2">
                        <Link href="/login" className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {t.auth.backToLogin}
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <Card className="w-full border-0 sm:border border-zinc-200/50 dark:border-zinc-800/50 shadow-none sm:shadow-xl bg-transparent sm:bg-white/90 sm:dark:bg-zinc-950/90 sm:backdrop-blur-xl sm:rounded-3xl overflow-hidden relative">
                <CardHeader className="space-y-1 pb-6 pt-8 sm:pt-10 px-6 sm:px-10">
                    <CardTitle className="text-2xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">Loading...</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-6 px-6 sm:px-10">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </CardContent>
            </Card>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}
