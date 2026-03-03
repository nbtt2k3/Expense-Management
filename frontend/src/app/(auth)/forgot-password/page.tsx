'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const otpSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resetSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type Step = 'email' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [step, setStep] = useState<Step>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');

    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: '' },
    });

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '' },
    });

    const resetForm = useForm<z.infer<typeof resetSchema>>({
        resolver: zodResolver(resetSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    async function onSendOTP(values: z.infer<typeof emailSchema>) {
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: values.email });
            setEmail(values.email);
            setStep('otp');
            toast.success(t.auth.otpSentSuccess);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || t.auth.otpResendFailed);
        } finally {
            setIsLoading(false);
        }
    }

    async function onVerifyOTP(values: z.infer<typeof otpSchema>) {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                token: values.otp,
                type: 'reset',
            });
            setResetToken(response.data.access_token);
            setStep('reset');
            toast.success(t.auth.otpVerified);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || t.auth.otpInvalid);
        } finally {
            setIsLoading(false);
        }
    }

    async function onResetPassword(values: z.infer<typeof resetSchema>) {
        setIsLoading(true);
        try {
            await api.post('/auth/reset-password', {
                password: values.password,
                confirm_password: values.confirmPassword,
            }, {
                headers: { Authorization: `Bearer ${resetToken}` },
            });
            setStep('done');
            toast.success(t.auth.passwordResetSuccess);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || t.auth.registerFailed);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full border-0 sm:border border-zinc-200/50 dark:border-zinc-800/50 shadow-none sm:shadow-xl sm:shadow-emerald-500/5 bg-transparent sm:bg-white/90 sm:dark:bg-zinc-950/90 sm:backdrop-blur-xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-10 relative z-10">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">
                    {step === 'done' ? t.auth.success : t.auth.resetPassword}
                </CardTitle>
                <CardDescription className="text-center text-zinc-500 dark:text-zinc-400">
                    {step === 'email' && t.auth.enterEmailReset}
                    {step === 'otp' && `${t.auth.enterCode} ${email}`}
                    {step === 'reset' && t.auth.enterNewPassword}
                    {step === 'done' && t.auth.passwordResetDone}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 sm:px-10 pb-8 relative z-10">
                {step === 'email' && (
                    <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="space-y-5">
                            <FormField
                                control={emailForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{t.auth.email}</FormLabel>
                                        <FormControl>
                                            <Input className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="name@example.com" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <Button
                                className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.sendCode}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'otp' && (
                    <Form {...otpForm}>
                        <form onSubmit={otpForm.handleSubmit(onVerifyOTP)} className="space-y-5">
                            <FormField
                                control={otpForm.control}
                                name="otp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{t.auth.verificationCode}</FormLabel>
                                        <FormControl>
                                            <Input className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl text-center tracking-widest text-lg font-mono transition-all" placeholder="123456" maxLength={6} {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <Button
                                className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.verifyCode}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'reset' && (
                    <Form {...resetForm}>
                        <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-5">
                            <FormField
                                control={resetForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{t.auth.newPassword}</FormLabel>
                                        <FormControl>
                                            <PasswordInput className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="••••••" autoComplete="new-password" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={resetForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{t.auth.confirmPassword}</FormLabel>
                                        <FormControl>
                                            <PasswordInput className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="••••••" autoComplete="new-password" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            <Button
                                className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.resetPassword}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'done' && (
                    <div className="text-center space-y-5">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t.auth.canSignIn}
                        </p>
                        <Button
                            className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                            onClick={() => router.push('/login')}
                        >
                            {t.auth.goToSignIn}
                        </Button>
                    </div>
                )}
            </CardContent>
            {step !== 'done' && (
                <div className="bg-zinc-50/50 dark:bg-zinc-900/20 px-6 sm:px-10 py-6 border-t border-zinc-100 dark:border-zinc-800/50 relative z-10 flex flex-col space-y-3">
                    <div className="flex justify-center text-sm font-medium">
                        <Link href="/login" className="text-zinc-900 dark:text-white font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {t.auth.backToLogin}
                        </Link>
                    </div>
                </div>
            )}
        </Card>
    );
}
