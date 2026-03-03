'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

interface GoogleLoginButtonProps {
    onSuccess: (response: any) => void;
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signup_with_google';
    disabled?: boolean;
}

export function GoogleLoginButton({ onSuccess, text = 'continue_with', disabled = false }: GoogleLoginButtonProps) {
    const googleButtonRef = useRef<HTMLDivElement>(null);
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);
    const { t } = useLanguage();
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!clientId) return;

        // Ensure global callback is set
        if (typeof window !== 'undefined') {
            (window as any).handleGoogleCallback = onSuccess;
        }

        const checkScript = () => {
            if ((window as any).google?.accounts?.id) {
                setIsScriptLoaded(true);
            } else {
                // If script is not loaded, dynamically inject it
                const scriptId = 'google-login-script';
                let script = document.getElementById(scriptId) as HTMLScriptElement;

                if (!script) {
                    script = document.createElement('script');
                    script.id = scriptId;
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.async = true;
                    script.defer = true;
                    document.head.appendChild(script);
                }

                script.addEventListener('load', () => setIsScriptLoaded(true));
            }
        };

        checkScript();
    }, [clientId, onSuccess]);

    useEffect(() => {
        if (!clientId || !isScriptLoaded || !googleButtonRef.current || !(window as any).google?.accounts?.id) return;

        if (disabled) return;

        try {
            (window as any).google.accounts.id.initialize({
                client_id: clientId,
                callback: onSuccess,
                auto_prompt: false,
            });

            (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: text,
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 350,
            });
        } catch (error) {
            console.error('Failed to render Google button:', error);
        }
    }, [clientId, isScriptLoaded, onSuccess, text, disabled]);

    if (!clientId) return null;

    return (
        <div className="flex flex-col items-center justify-center w-full space-y-4">
            <div
                ref={googleButtonRef}
                className={`flex justify-center w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                style={{ minHeight: '40px' }}
            />
            <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/80 dark:bg-zinc-950/80 sm:bg-white sm:dark:bg-zinc-950 px-2 text-muted-foreground font-medium transition-colors">
                        {t.auth.orContinueWith}
                    </span>
                </div>
            </div>
        </div>
    );
}
