'use client';

import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { expenseApi } from '@/lib/api';
import { Category } from '@/types';
import Loading from './loading';

interface BudgetStatus {
    id: number;
    category_id: number | null;
    category_name: string;
    budget: number;
    spent: number;
    remaining: number;
    percent_used: number;
}

export function BudgetContent() {
    const { t, formatCurrency, translateCategoryName } = useLanguage();
    const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newBudgetAmount, setNewBudgetAmount] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('global');

    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState<string>((currentDate.getMonth() + 1).toString());
    const [filterYear, setFilterYear] = useState<string>(currentDate.getFullYear().toString());

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [budgetsRes, categoriesRes] = await Promise.all([
                expenseApi.getBudgetProgress({ month: filterMonth, year: filterYear }),
                expenseApi.getCategories({ type: 'expense' })
            ]);
            setBudgets(budgetsRes.data);
            setCategories(categoriesRes.data);
        } catch (error) {
            toast.error(t.budget.fetchFailed);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filterMonth, filterYear]);

    const handleCreateBudget = async () => {
        if (!newBudgetAmount || isNaN(Number(newBudgetAmount)) || Number(newBudgetAmount) <= 0) {
            toast.error(t.budget.invalidAmount);
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                amount: Number(newBudgetAmount),
                month: Number(filterMonth),
                year: Number(filterYear),
                category_id: selectedCategoryId === 'global' ? null : Number(selectedCategoryId)
            };

            if (editingId) {
                await expenseApi.updateBudget(editingId, payload);
                toast.success(t.budget.budgetSet);
            } else {
                await expenseApi.createBudget(payload);
                toast.success(t.budget.budgetSet);
            }

            setIsDialogOpen(false);
            setNewBudgetAmount('');
            setSelectedCategoryId('global');
            setEditingId(null);
            fetchData();
        } catch (error: any) {
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error(t.budget.budgetSetFailed);
            }
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBudget = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        try {
            await expenseApi.deleteBudget(deletingId);
            toast.success(t.budget.budgetDeleted);
            setDeletingId(null);
            fetchData();
        } catch (error) {
            toast.error(t.budget.budgetDeleteFailed);
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditClick = (budget: BudgetStatus) => {
        setNewBudgetAmount(budget.budget.toString());
        setSelectedCategoryId(budget.category_id ? budget.category_id.toString() : 'global');
        setEditingId(budget.id);
        setIsDialogOpen(true);
    };

    const handleOpenDialog = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setNewBudgetAmount('');
            setSelectedCategoryId('global');
            setEditingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.budget.title}</h2>
                    <p className="text-muted-foreground">{t.budget.setBudgetDesc}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="w-full sm:w-[130px] h-9 bg-slate-100 dark:bg-zinc-900 border-0 shadow-sm">
                            <SelectValue placeholder={t.filters?.month || "Month"} />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>{t.filters?.monthPrefix || "Month "} {i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-full sm:w-[110px] h-9 bg-slate-100 dark:bg-zinc-900 border-0 shadow-sm">
                            <SelectValue placeholder={t.filters?.year || "Year"} />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <SelectItem key={currentDate.getFullYear() - i + 2} value={(currentDate.getFullYear() - i + 2).toString()}>
                                    {currentDate.getFullYear() - i + 2}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && handleOpenDialog(open)}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t.budget.setBudget}
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="sm:max-w-[425px]"
                            onInteractOutside={(e) => {
                                if (isSaving) e.preventDefault();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>{t.budget.setMonthlyBudget}</DialogTitle>
                                <DialogDescription>{t.budget.setBudgetDesc}</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">{t.common.amount}</Label>
                                    <CurrencyInput
                                        id="amount"
                                        value={Number(newBudgetAmount) || undefined}
                                        onValueChange={(val) => setNewBudgetAmount(val.toString())}
                                        className="col-span-3"
                                        placeholder="0"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">{t.common.category}</Label>
                                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={isSaving}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t.budget.selectCategory} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">{t.common.global}</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {translateCategoryName(cat.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => handleOpenDialog(false)} disabled={isSaving}>
                                    {t.common.cancel}
                                </Button>
                                <Button onClick={handleCreateBudget} disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t.common.saveChanges}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading && budgets.length === 0 ? (
                <Loading />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {budgets.length === 0 ? (
                        <div className="col-span-full text-center text-muted-foreground">
                            {t.budget.noBudgets}
                        </div>
                    ) : (
                        budgets.map((budget, index) => (
                            <Card key={index} className={budget.category_name === 'Global' ? 'border-primary' : ''}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-medium">
                                            {translateCategoryName(budget.category_name)} {t.budget.budgetLabel}
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                                        </span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">{t.common.openMenu}</span>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(budget)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                {t.common.edit}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingId(budget.id)} className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {t.common.delete}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{budget.percent_used}%</div>
                                    <Progress value={Math.min(budget.percent_used, 100)} className={`h-2 mt-2 ${budget.percent_used >= 100 ? 'bg-red-500' : budget.percent_used >= 80 ? 'bg-amber-500' : ''}`} />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {budget.remaining >= 0
                                            ? `${formatCurrency(budget.remaining)} ${t.budget.remaining}`
                                            : `${formatCurrency(Math.abs(budget.remaining))} ${t.budget.overBudget}`}
                                    </p>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !isDeleting && !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.budget.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.budget.deleteConfirmDesc}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBudget} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.common.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
