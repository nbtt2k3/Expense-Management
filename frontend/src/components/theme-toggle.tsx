'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

export function ThemeToggle() {
    const { isDarkMode, setDarkMode } = useLanguage();

    const toggle = () => {
        setDarkMode(!isDarkMode);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
    );
}
