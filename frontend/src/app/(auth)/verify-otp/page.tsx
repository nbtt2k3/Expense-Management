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
    CardFooter,
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
        <Card className="w-full border-0 shadow-none bg-transparent sm:bg-white/80 sm:dark:bg-zinc-950/80 sm:backdrop-blur-xl sm:border sm:shadow-2xl sm:shadow-emerald-500/10 sm:rounded-[2rem] overflow-hidden">
            <CardHeader className="space-y-3 pb-8 pt-6 sm:pt-10">
                <CardTitle className="text-3xl font-bold tracking-tight text-center">{t.auth.verifyEmail}</CardTitle>
                <CardDescription className="text-center text-base">
                    {t.auth.otpSent} <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 sm:px-10 pb-8">
                <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} disabled={isLoading}>
                        <InputOTPGroup className="gap-2 sm:gap-3 flex justify-between w-full">
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={0} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={1} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={2} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={3} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={4} />
                            <InputOTPSlot className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/50" index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                <Button className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" onClick={handleVerify} disabled={isLoading || otp.length !== 6}>
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {t.auth.verify}
                </Button>
            </CardContent>
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex flex-col space-y-4 sm:rounded-b-[2rem]">
                <div className="flex flex-col space-y-3 text-sm text-center font-medium">
                    <div className="text-zinc-600 dark:text-zinc-400">
                        {t.auth.didntReceive}{' '}
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline hover:underline-offset-4 font-semibold disabled:opacity-50 disabled:hover:no-underline transition-all"
                        >
                            {isResending ? (
                                <span className="flex justify-center items-center"><Loader2 className="mr-2 h-3 w-3 animate-spin" /> {t.common.loading}</span>
                            ) : t.auth.resend}
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline hover:underline-offset-4 font-semibold">
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
            <Card className="w-full">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Loading...</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}
