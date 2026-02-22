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
    CardFooter,
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
        <Card className="w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                    {step === 'done' ? t.auth.success : t.auth.resetPassword}
                </CardTitle>
                <CardDescription className="text-center">
                    {step === 'email' && t.auth.enterEmailReset}
                    {step === 'otp' && `${t.auth.enterCode} ${email}`}
                    {step === 'reset' && t.auth.enterNewPassword}
                    {step === 'done' && t.auth.passwordResetDone}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {step === 'email' && (
                    <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="space-y-4">
                            <FormField
                                control={emailForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.auth.email}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.sendCode}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'otp' && (
                    <Form {...otpForm}>
                        <form onSubmit={otpForm.handleSubmit(onVerifyOTP)} className="space-y-4">
                            <FormField
                                control={otpForm.control}
                                name="otp"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.auth.verificationCode}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123456" maxLength={6} {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.verifyCode}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'reset' && (
                    <Form {...resetForm}>
                        <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                            <FormField
                                control={resetForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.auth.newPassword}</FormLabel>
                                        <FormControl>
                                            <PasswordInput placeholder="••••••" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={resetForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.auth.confirmPassword}</FormLabel>
                                        <FormControl>
                                            <PasswordInput placeholder="••••••" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.resetPassword}
                            </Button>
                        </form>
                    </Form>
                )}

                {step === 'done' && (
                    <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t.auth.canSignIn}
                        </p>
                        <Button className="w-full" onClick={() => router.push('/login')}>
                            {t.auth.goToSignIn}
                        </Button>
                    </div>
                )}
            </CardContent>
            {step !== 'done' && (
                <CardFooter className="flex justify-center text-sm text-muted-foreground">
                    <Link href="/login" className="hover:text-primary underline underline-offset-4">
                        {t.auth.backToLogin}
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}
