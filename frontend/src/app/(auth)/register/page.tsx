'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { handleLoginSuccess } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
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

const formSchema = z.object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(2, 'Full name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function RegisterPage() {
    const router = useRouter();
    const { t, fetchUserProfile } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            full_name: '',
            password: '',
            confirmPassword: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await api.post('/auth/register', {
                email: values.email,
                password: values.password,
                full_name: values.full_name,
            });

            toast.success(t.auth.registerSuccess);
            router.push(`/verify-otp?email=${encodeURIComponent(values.email)}&type=signup`);
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.detail || t.auth.registerFailed;
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleSuccess(response: any) {
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
            setIsGoogleLoading(false);
        }
    }

    return (
        <Card className="w-full border-0 sm:border border-zinc-200/50 dark:border-zinc-800/50 shadow-none sm:shadow-xl sm:shadow-emerald-500/5 bg-transparent sm:bg-white/90 sm:dark:bg-zinc-950/90 sm:backdrop-blur-xl sm:rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

            <CardHeader className="space-y-2 pb-6 pt-8 sm:pt-10 px-6 sm:px-10 relative z-10">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-center text-zinc-900 dark:text-zinc-50">
                    {t.auth.createAccount}
                </CardTitle>
                <CardDescription className="text-center text-zinc-500 dark:text-zinc-400">
                    {t.auth.getStarted}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 sm:px-10 pb-8 relative z-10">
                <GoogleLoginButton
                    onSuccess={handleGoogleSuccess}
                    text="signup_with"
                    disabled={isLoading || isGoogleLoading}
                />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                        {t.auth.fullName}
                                    </FormLabel>
                                    <FormControl>
                                        <Input className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="John Doe" {...field} disabled={isLoading || isGoogleLoading} />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                        {t.auth.email}
                                    </FormLabel>
                                    <FormControl>
                                        <Input className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="name@example.com" {...field} disabled={isLoading || isGoogleLoading} />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                        {t.auth.password}
                                    </FormLabel>
                                    <FormControl>
                                        <PasswordInput className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="••••••" autoComplete="new-password" {...field} disabled={isLoading || isGoogleLoading} />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                        {t.auth.confirmPassword}
                                    </FormLabel>
                                    <FormControl>
                                        <PasswordInput className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 rounded-xl transition-all" placeholder="••••••" autoComplete="new-password" {...field} disabled={isLoading || isGoogleLoading} />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        <Button
                            className="w-full h-12 text-sm font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {!isLoading && isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t.auth.signUp}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <div className="bg-zinc-50/50 dark:bg-zinc-900/20 px-6 sm:px-10 py-6 border-t border-zinc-100 dark:border-zinc-800/50 relative z-10 flex flex-col space-y-3">
                <div className="flex flex-col space-y-2 text-sm text-center font-medium">
                    <div className="text-zinc-500">
                        {t.auth.hasAccount}{' '}
                        <Link href="/login" className="text-zinc-900 dark:text-white font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {t.auth.signIn}
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
}
