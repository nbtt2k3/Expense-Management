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
import { Income } from '@/types';
import { useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
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

const formSchema = z.object({
    source: z.string().min(1, 'Category is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    description: z.string().optional(),
    date: z.date(),
    category_id: z.number().optional(), // We'll set this when source (category name) is selected
});

interface IncomeFormProps {
    initialData?: Income | null;
    categories?: Category[]; // Make optional to avoid breaking if not passed yet
    onSubmit: (data: z.infer<typeof formSchema>) => void;
    isLoading?: boolean;
    onCancel?: () => void;
}

export function IncomeForm({ initialData, categories = [], onSubmit, isLoading, onCancel }: IncomeFormProps) {
    const form = useForm<any>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            source: '',
            amount: 0,
            description: '',
            date: new Date(),
            category_id: undefined,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                source: initialData.source, // This should match category name
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
                                <FormLabel>Source (Category)</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        // Find category by name to set ID
                                        const cat = categories.find(c => c.name === value);
                                        field.onChange(value);
                                        if (cat) {
                                            form.setValue('category_id', cat.id);
                                        }
                                    }}
                                    value={field.value}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select income source" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.name}>
                                                {category.name}
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
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                            <FormLabel>Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
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
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Details about this income..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : initialData ? 'Update Income' : 'Add Income'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
