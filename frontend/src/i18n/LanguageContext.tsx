'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '@/i18n/en.json';
import vi from '@/i18n/vi.json';

export type Locale = 'en' | 'vi';
export type Currency = 'USD' | 'VND';

const translations: Record<Locale, typeof en> = { en, vi };

type TranslationKeys = typeof en;

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    t: TranslationKeys;
    formatCurrency: (amount: number) => string;
    translateCategoryName: (name: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');
    const [currency, setCurrencyState] = useState<Currency>('USD');

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
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
    }, []);

    const setCurrency = useCallback((newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('currency', newCurrency);
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
        <LanguageContext.Provider value={{ locale, setLocale, currency, setCurrency, t, formatCurrency, translateCategoryName }}>
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
