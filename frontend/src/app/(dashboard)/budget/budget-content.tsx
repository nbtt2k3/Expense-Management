'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { expenseApi } from '@/lib/api';
import { Category } from '@/types';

interface BudgetStatus {
    category_id: number | null;
    category_name: string;
    budget: number;
    spent: number;
    remaining: number;
    percent_used: number;
}

export function BudgetContent() {
    const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [newBudgetAmount, setNewBudgetAmount] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('global');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [budgetsRes, categoriesRes] = await Promise.all([
                expenseApi.getBudgetProgress(),
                expenseApi.getCategories({ type: 'expense' })
            ]);
            setBudgets(budgetsRes.data);
            setCategories(categoriesRes.data);
        } catch (error) {
            toast.error('Failed to fetch budget data');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateBudget = async () => {
        if (!newBudgetAmount || isNaN(Number(newBudgetAmount)) || Number(newBudgetAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            const payload = {
                amount: Number(newBudgetAmount),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                category_id: selectedCategoryId === 'global' ? null : Number(selectedCategoryId)
            };

            await expenseApi.createBudget(payload);
            toast.success('Budget set successfully');
            setIsDialogOpen(false);
            setNewBudgetAmount('');
            setSelectedCategoryId('global');
            fetchData();
        } catch (error) {
            toast.error('Failed to set budget');
            console.error(error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Set Budget
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Set Monthly Budget</DialogTitle>
                            <DialogDescription>
                                Set a budget for a specific category or a global budget for the current month.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">
                                    Amount
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={newBudgetAmount}
                                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                                    className="col-span-3"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">
                                    Category
                                </Label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global (Total)</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateBudget}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.length === 0 && !isLoading && (
                    <div className="col-span-full text-center text-muted-foreground">
                        No budgets set for this month.
                    </div>
                )}

                {budgets.map((budget, index) => (
                    <Card key={index} className={budget.category_name === 'Global' ? 'border-primary' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {budget.category_name} Budget
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                                {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{budget.percent_used}%</div>
                            <Progress value={Math.min(budget.percent_used, 100)} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {budget.remaining >= 0
                                    ? `${formatCurrency(budget.remaining)} remaining`
                                    : `${formatCurrency(Math.abs(budget.remaining))} over budget`}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
