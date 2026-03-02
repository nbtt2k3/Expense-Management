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
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <Card className="w-full border-0 shadow-none bg-transparent sm:bg-white/80 sm:dark:bg-zinc-950/80 sm:backdrop-blur-xl sm:border sm:shadow-2xl sm:shadow-emerald-500/10 sm:rounded-[2rem] overflow-hidden">
            <CardHeader className="space-y-3 pb-8 pt-6 sm:pt-10">
                <CardTitle className="text-3xl font-bold tracking-tight text-center">{t.auth.createAccount}</CardTitle>
                <CardDescription className="text-center text-base">
                    {t.auth.getStarted}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:px-10 pb-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">{t.auth.fullName}</FormLabel>
                                    <FormControl>
                                        <Input className="h-12 bg-white/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500 rounded-xl" placeholder="John Doe" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">{t.auth.confirmPassword}</FormLabel>
                                    <FormControl>
                                        <PasswordInput className="h-12 bg-white/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500 rounded-xl" placeholder="••••••" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button className="w-full h-12 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {t.auth.signUp}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex flex-col space-y-3 sm:rounded-b-[2rem]">
                <div className="flex flex-col space-y-2 text-sm text-center font-medium">
                    <div className="text-zinc-500">
                        {t.auth.hasAccount}{' '}
                        <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline hover:underline-offset-4 font-semibold">
                            {t.auth.signIn}
                        </Link>
                    </div>
                </div>
            </div>
        </Card>
    );
}
