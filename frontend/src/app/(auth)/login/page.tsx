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
    const { t, fetchUserProfile } = useLanguage();
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
            await fetchUserProfile();
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
            await fetchUserProfile();
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
            <Card className="w-full border-0 shadow-none bg-transparent sm:bg-white/80 sm:dark:bg-zinc-950/80 sm:backdrop-blur-xl sm:border sm:shadow-2xl sm:shadow-emerald-500/10 sm:rounded-[2rem] overflow-hidden">
                <CardHeader className="space-y-3 pb-8 pt-6 sm:pt-10">
                    <CardTitle className="text-3xl font-bold tracking-tight text-center">{t.auth.signIn}</CardTitle>
                    <CardDescription className="text-center text-base">
                        {t.auth.enterEmail}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 sm:px-10 pb-8">
                    {googleClientId && (
                        <>
                            <div
                                id="g_id_onload"
                                data-client_id={googleClientId}
                                data-callback="handleGoogleCallback"
                                data-auto_prompt="false"
                            />
                            <div className="flex justify-center w-full">
                                <div
                                    className="g_id_signin"
                                    data-type="standard"
                                    data-shape="rectangular"
                                    data-theme="filled_black"
                                    data-text="continue_with"
                                    data-size="large"
                                    data-logo_alignment="left"
                                    data-width="350"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white/80 dark:bg-zinc-950/80 sm:bg-transparent px-2 text-muted-foreground font-medium">
                                        {t.auth.orContinueWith}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">{t.auth.email}</FormLabel>
                                        <FormControl>
                                            <Input className="h-12 bg-white/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500 rounded-xl" placeholder="name@example.com" {...field} disabled={isLoading} />
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
                                        <FormLabel className="font-semibold">{t.auth.password}</FormLabel>
                                        <FormControl>
                                            <PasswordInput className="h-12 bg-white/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500 rounded-xl" placeholder="••••••" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                {t.auth.signIn}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex flex-col space-y-3 sm:rounded-b-[2rem]">
                    <div className="flex flex-col space-y-2 text-sm text-center font-medium">
                        <Link href="/forgot-password" className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {t.auth.forgotPassword}
                        </Link>
                        <div className="text-zinc-500">
                            {t.auth.noAccount}{' '}
                            <Link href="/register" className="text-emerald-600 dark:text-emerald-400 hover:underline hover:underline-offset-4 font-semibold">
                                {t.auth.signUp}
                            </Link>
                        </div>
                    </div>
                </div>
            </Card>
        </>
    );
}
