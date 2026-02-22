import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value?: number;
    onValueChange?: (value: number) => void;
    locale?: string; // Optional locale for formatting, defaults to 'vi-VN' as it's the primary language mentioned
}

export function CurrencyInput({
    value,
    onValueChange,
    locale = 'vi-VN',
    className,
    ...props
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Format number to local string string
    const formatNumber = (num: number) => {
        if (isNaN(num)) return '';
        return new Intl.NumberFormat(locale).format(num);
    };

    // Update display when external value changes
    useEffect(() => {
        if (value !== undefined && value !== null) {
            setDisplayValue(formatNumber(value));
        } else {
            setDisplayValue('');
        }
    }, [value, locale]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove all non-digit characters for parsing
        const rawValue = e.target.value.replace(/\D/g, '');

        if (rawValue === '') {
            setDisplayValue('');
            if (onValueChange) {
                onValueChange(0);
            }
            return;
        }

        const numericValue = parseInt(rawValue, 10);

        // Only update if it's a valid number
        if (!isNaN(numericValue)) {
            setDisplayValue(formatNumber(numericValue));
            if (onValueChange) {
                onValueChange(numericValue);
            }
        }
    };

    return (
        <Input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            className={className}
            {...props}
        />
    );
}
