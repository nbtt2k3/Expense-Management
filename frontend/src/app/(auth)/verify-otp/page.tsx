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

export default function VerifyOTPPage() {
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
        <Card className="w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">{t.auth.verifyEmail}</CardTitle>
                <CardDescription className="text-center">
                    {t.auth.otpSent} <strong>{email}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} disabled={isLoading}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                <Button className="w-full" onClick={handleVerify} disabled={isLoading || otp.length !== 6}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.auth.verify}
                </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
                <div>
                    {t.auth.didntReceive}{' '}
                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        className="hover:text-primary underline underline-offset-4 disabled:opacity-50"
                    >
                        {isResending ? t.common.loading : t.auth.resend}
                    </button>
                </div>
                <div>
                    <Link href="/login" className="hover:text-primary underline underline-offset-4">
                        {t.auth.backToLogin}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
