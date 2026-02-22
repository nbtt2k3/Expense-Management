'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Income } from '@/types';
import { useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

interface IncomeFormProps {
    initialData?: Income | null;
    categories?: Category[];
    onSubmit: (data: any) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function IncomeForm({ initialData, categories = [], onSubmit, isLoading, onCancel }: IncomeFormProps) {
    const { t, locale, translateCategoryName } = useLanguage();
    const dateFnsLocale = locale === 'vi' ? vi : enUS;

    const formSchema = z.object({
        source: z.string().min(1, t.validation.sourceRequired),
        amount: z.coerce.number({ message: t.validation.amountMin }).min(0.01, t.validation.amountMin),
        description: z.string().optional(),
        date: z.date(),
        category_id: z.coerce.number({ message: t.validation.categoryRequired }).optional(),
    });

    const form = useForm<any>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            source: '',
            amount: 0,
            description: '',
            date: new Date(),
            category_id: undefined as any,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                source: initialData.source,
                amount: initialData.amount,
                description: initialData.description || '',
                date: new Date(initialData.date),
                category_id: initialData.category_id,
            });
        } else {
            form.reset({
                source: '',
                amount: 0,
                description: '',
                date: new Date(),
                category_id: undefined,
            });
        }
    }, [initialData, form]);

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t.common.sourceCategory}</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        const cat = categories.find(c => c.name === value);
                                        field.onChange(value);
                                        if (cat) {
                                            form.setValue('category_id', cat.id);
                                        }
                                    }}
                                    value={field.value || ""}
                                    disabled={isLoading}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t.common.selectIncomeSource} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.name}>
                                                {translateCategoryName(category.name)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t.common.amount}</FormLabel>
                                <FormControl>
                                    <CurrencyInput
                                        placeholder={t.common.amountPlaceholder}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>{t.common.date}</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            disabled={isLoading}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP", { locale: dateFnsLocale })
                                            ) : (
                                                <span>{t.common.pickDate}</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t.common.descriptionOptional}</FormLabel>
                            <FormControl>
                                <Textarea placeholder={t.common.incomeDescPlaceholder} {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            {t.common.cancel}
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? (t.common.saving || 'Saving...') : initialData ? t.common.updateIncome : t.incomes.addIncome}
                    </Button>
                </div>
            </form >
        </Form >
    );
}
