'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { handleLoginSuccess } from '@/lib/api';
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

const formSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', {
                email: values.email,
                password: values.password,
            });

            handleLoginSuccess(response.data, values.email);
            toast.success(t.auth.loginSuccess);
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.detail || t.auth.loginFailed;
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleCallback(response: any) {
        setIsGoogleLoading(true);
        try {
            const result = await api.post('/auth/google', {
                id_token: response.credential,
            });
            handleLoginSuccess(result.data, '');
            toast.success(t.auth.googleLoginSuccess);
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            toast.error(t.auth.googleLoginFailed);
        } finally {
            setIsGoogleLoading(false);
        }
    }

    if (typeof window !== 'undefined') {
        (window as any).handleGoogleCallback = handleGoogleCallback;
    }

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    return (
        <>
            {googleClientId && (
                <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
            )}
            <Card className="w-full">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">{t.auth.signIn}</CardTitle>
                    <CardDescription className="text-center">
                        {t.auth.enterEmail}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {googleClientId && (
                        <>
                            <div
                                id="g_id_onload"
                                data-client_id={googleClientId}
                                data-callback="handleGoogleCallback"
                                data-auto_prompt="false"
                            />
                            <div className="flex justify-center">
                                <div
                                    className="g_id_signin"
                                    data-type="standard"
                                    data-shape="rectangular"
                                    data-theme="outline"
                                    data-text="continue_with"
                                    data-size="large"
                                    data-logo_alignment="left"
                                    data-width="350"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                        {t.auth.orContinueWith}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
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
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.auth.password}</FormLabel>
                                        <FormControl>
                                            <PasswordInput placeholder="••••••" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full" type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.auth.signIn}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
                    <div>
                        <Link href="/forgot-password" className="hover:text-primary underline underline-offset-4">
                            {t.auth.forgotPassword}
                        </Link>
                    </div>
                    <div>
                        {t.auth.noAccount}{' '}
                        <Link href="/register" className="hover:text-primary underline underline-offset-4">
                            {t.auth.signUp}
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </>
    );
}
