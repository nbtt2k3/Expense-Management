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
    username: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            // API expects form-data for OAuth2PasswordRequestForm
            const formData = new FormData();
            formData.append('username', values.username);
            formData.append('password', values.password);

            const response = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Store tokens + email (cookie + localStorage)
            handleLoginSuccess(response.data, values.username);

            toast.success('Login successful!');
            router.push('/dashboard');
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.detail || 'Invalid email or password';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
                <CardDescription className="text-center">
                    Enter your email and password to access your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} />
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
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
                <div>
                    <Link href="/forgot-password" className="hover:text-primary underline underline-offset-4">
                        Forgot password?
                    </Link>
                </div>
                <div>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="hover:text-primary underline underline-offset-4">
                        Sign up
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
