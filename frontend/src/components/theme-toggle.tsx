'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        // Init from localStorage or system preference
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggle = () => {
        setDark(prev => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return next;
        });
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
    );
}
