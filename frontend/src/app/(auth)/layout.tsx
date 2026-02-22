'use client';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 relative">
            {/* Language switcher — top right */}
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md space-y-8 px-4 sm:px-0">
                {children}
            </div>
        </div>
    )
}
