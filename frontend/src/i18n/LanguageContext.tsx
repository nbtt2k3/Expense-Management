'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '@/i18n/en.json';
import vi from '@/i18n/vi.json';
import { authApi } from '@/lib/api';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}


export type Locale = 'en' | 'vi';
export type Currency = 'USD' | 'VND';

const translations: Record<Locale, typeof en> = { en, vi };

type TranslationKeys = typeof en;

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    isDarkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    t: TranslationKeys;
    formatCurrency: (amount: number) => string;
    translateCategoryName: (name: string) => string;
    userProfile: UserProfile | null;
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    fetchUserProfile: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');
    const [currency, setCurrencyState] = useState<Currency>('VND');
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const fetchUserProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const response = await authApi.getCurrentUser();
                setUserProfile(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    }, []);

    // Load saved preferences
    useEffect(() => {
        const savedLocale = localStorage.getItem('locale') as Locale;
        if (savedLocale && (savedLocale === 'en' || savedLocale === 'vi')) {
            setLocaleState(savedLocale);
        }
        const savedCurrency = localStorage.getItem('currency') as Currency;
        if (savedCurrency && (savedCurrency === 'USD' || savedCurrency === 'VND')) {
            setCurrencyState(savedCurrency);
        }
        const savedDarkStr = localStorage.getItem('darkMode');
        const savedDark = savedDarkStr !== null
            ? savedDarkStr === 'true'
            : window.matchMedia('(prefers-color-scheme: dark)').matches;

        setIsDarkMode(savedDark);
        if (savedDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        fetchUserProfile();
    }, [fetchUserProfile]);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
    }, []);

    const setCurrency = useCallback((newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('currency', newCurrency);
    }, []);

    const setDarkMode = useCallback((dark: boolean) => {
        setIsDarkMode(dark);
        localStorage.setItem('darkMode', String(dark));
        if (dark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Fixed exchange rate for demonstration purposes
    // In a real application, this might be fetched from an API
    const USD_TO_VND_RATE = 25000;

    const formatCurrency = useCallback((amount: number): string => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
            }).format(amount);
        }

        // Convert VND to USD
        const usdAmount = amount / USD_TO_VND_RATE;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(usdAmount);
    }, [currency]);

    const t = translations[locale];

    const translateCategoryName = useCallback((name: string): string => {
        const categoryNames = t.categories.categoryNames as Record<string, string>;
        return categoryNames[name] || name;
    }, [t]);

    return (
        <LanguageContext.Provider value={{
            locale, setLocale, currency, setCurrency, isDarkMode, setDarkMode, t, formatCurrency, translateCategoryName,
            userProfile, setUserProfile, fetchUserProfile
        }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
