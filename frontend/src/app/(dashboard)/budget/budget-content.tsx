'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Edit, Trash2, Loader2, MoreHorizontal, TriangleAlert,
    Utensils, Bus, ShoppingBag, Home, Film, HeartPulse, Package,
    Search, Copy, Wallet, PiggyBank, AlertCircle, CheckCircle2,
    LayoutGrid, List
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { expenseApi } from '@/lib/api';
import { Category } from '@/types';
import Loading from './loading';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BudgetStatus {
    id: number;
    category_id: number | null;
    category_name: string;
    budget: number;
    spent: number;
    remaining: number;
    percent_used: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS = [HeartPulse, Bus, Film, Utensils, ShoppingBag, Home, Package];
const CATEGORY_STYLES = [
    { bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500', bar: 'bg-emerald-500' },
    { bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500', bar: 'bg-blue-500' },
    { bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500', bar: 'bg-purple-500' },
    { bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500', bar: 'bg-amber-500' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500', bar: 'bg-rose-500' },
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500', bar: 'bg-indigo-500' },
];

function getCategoryStyle(id: number) {
    const idx = (id || 0) % CATEGORY_STYLES.length;
    return { ...CATEGORY_STYLES[idx], Icon: CATEGORY_ICONS[idx % CATEGORY_ICONS.length] };
}

// ─── Summary KPI Card ─────────────────────────────────────────────────────────
function SummaryCard({
    label, value, sub, icon: Icon, iconBg, valueColor,
}: {
    label: string; value: string; sub?: string;
    icon: any; iconBg: string; valueColor?: string;
}) {
    return (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5">
            <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${valueColor ?? 'text-zinc-900 dark:text-zinc-50'}`}>{value}</p>
            {sub && <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function BudgetContent() {
    const { t, locale, formatCurrency, translateCategoryName } = useLanguage();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newBudgetAmount, setNewBudgetAmount] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('global');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState<string>((currentDate.getMonth() + 1).toString());
    const [filterYear, setFilterYear] = useState<string>(currentDate.getFullYear().toString());

    const years = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const monthName = (m: number, y: number) =>
        new Date(y, m - 1).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long' });

    // ── Fetch ────────────────────────────────────────────────────────────────
    const queryParams: Record<string, string> = {};
    if (filterMonth !== 'all') queryParams.month = filterMonth;
    if (filterYear !== 'all') queryParams.year = filterYear;

    const { data: budgetsRes, isLoading: isLoadingBudgets } = useQuery({
        queryKey: ['budgetsList', queryParams],
        queryFn: () => expenseApi.getBudgetProgress(queryParams)
    });

    const { data: categoriesRes, isLoading: isLoadingCats } = useQuery({
        queryKey: ['categories', 'expense'],
        queryFn: () => expenseApi.getCategories({ type: 'expense' })
    });

    const isLoading = isLoadingBudgets || isLoadingCats;
    const budgets: BudgetStatus[] = budgetsRes?.data || [];
    const categories: Category[] = categoriesRes?.data || [];

    // ── Mutations ────────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: (payload: any) => editingId
            ? expenseApi.updateBudget(editingId, payload)
            : expenseApi.createBudget(payload),
        onSuccess: () => {
            toast.success(t.budget.budgetSet);
            setIsDialogOpen(false);
            setNewBudgetAmount('');
            setSelectedCategoryId('global');
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['budgetsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || t.budget.budgetSetFailed);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => expenseApi.deleteBudget(id),
        onSuccess: () => {
            toast.success(t.budget.budgetDeleted);
            setDeletingId(null);
            queryClient.invalidateQueries({ queryKey: ['budgetsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
        },
        onError: () => {
            toast.error(t.budget.budgetDeleteFailed);
        }
    });

    const copyMutation = useMutation({
        mutationFn: async ({ prevM, prevY, m, y }: { prevM: number, prevY: number, m: number, y: number }) => {
            const prevRes = await expenseApi.getBudgetProgress({ month: prevM, year: prevY });
            const prevBudgets: BudgetStatus[] = prevRes.data;

            if (prevBudgets.length === 0) throw new Error('NO_BUDGETS');

            const existingCatIds = new Set(budgets.map((b: BudgetStatus) => b.category_id));
            const toCreate = prevBudgets.filter((b: BudgetStatus) => !existingCatIds.has(b.category_id));

            if (toCreate.length === 0) throw new Error('ALL_EXIST');

            await Promise.all(toCreate.map((b: BudgetStatus) =>
                expenseApi.createBudget({
                    amount: b.budget,
                    month: m,
                    year: y,
                    category_id: b.category_id,
                })
            ));
            return toCreate.length;
        },
        onSuccess: (count, variables) => {
            toast.success(`${t.budget.copiedFrom.replace('{count}', String(count))} ${monthName(variables.prevM, variables.prevY)}`);
            queryClient.invalidateQueries({ queryKey: ['budgetsList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
        },
        onError: (error: any) => {
            if (error.message === 'NO_BUDGETS') {
                toast.error(t.budget.noBudgetsLastMonth);
            } else if (error.message === 'ALL_EXIST') {
                toast.info(t.budget.allBudgetsExist);
            } else {
                toast.error(t.budget.copyFailed);
            }
        }
    });

    // ── Create / Edit / Delete Handlers ──────────────────────────────────────────────
    const handleCreateBudget = () => {
        if (!newBudgetAmount || isNaN(Number(newBudgetAmount)) || Number(newBudgetAmount) <= 0) {
            toast.error(t.budget.invalidAmount);
            return;
        }
        const payload = {
            amount: Number(newBudgetAmount),
            month: filterMonth === 'all' ? currentDate.getMonth() + 1 : Number(filterMonth),
            year: filterYear === 'all' ? currentDate.getFullYear() : Number(filterYear),
            category_id: selectedCategoryId === 'global' ? null : Number(selectedCategoryId),
        };
        saveMutation.mutate(payload);
    };

    const handleCopyLastMonth = () => {
        const m = filterMonth === 'all' ? currentDate.getMonth() + 1 : Number(filterMonth);
        const y = filterYear === 'all' ? currentDate.getFullYear() : Number(filterYear);

        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;

        copyMutation.mutate({ prevM, prevY, m, y });
    };

    const handleDeleteBudget = () => {
        if (!deletingId) return;
        deleteMutation.mutate(deletingId);
    };

    const handleEditClick = (budget: BudgetStatus) => {
        setNewBudgetAmount(budget.budget.toString());
        setSelectedCategoryId(budget.category_id ? budget.category_id.toString() : 'global');
        setEditingId(budget.id);
        setIsDialogOpen(true);
    };

    const handleOpenDialog = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) { setNewBudgetAmount(''); setSelectedCategoryId('global'); setEditingId(null); }
    };

    // ── Derived data ─────────────────────────────────────────────────────────
    const globalBudget = budgets.find(b => b.category_id === null || b.category_name === 'Global');
    let categoryBudgets = budgets.filter(b => b.category_id !== null && b.category_name !== 'Global');
    if (search) {
        categoryBudgets = categoryBudgets.filter(b =>
            translateCategoryName(b.category_name).toLowerCase().includes(search.toLowerCase())
        );
    }

    const summary = useMemo(() => {
        const all = budgets.filter(b => b.category_id !== null || b.category_name === 'Global');
        const totalBudgeted = all.reduce((s, b) => s + b.budget, 0);
        const totalSpent = all.reduce((s, b) => s + b.spent, 0);
        const totalRemaining = all.reduce((s, b) => s + Math.max(0, b.remaining), 0);
        const overCount = all.filter(b => b.percent_used > 100).length;
        const healthRate = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;
        return { totalBudgeted, totalSpent, totalRemaining, overCount, healthRate };
    }, [budgets]);

    const selectedMonthNum = filterMonth === 'all' ? null : Number(filterMonth);
    const selectedYearNum = filterYear === 'all' ? null : Number(filterYear);
    const periodLabel = selectedMonthNum && selectedYearNum
        ? `${monthName(selectedMonthNum, selectedYearNum)} ${selectedYearNum}`
        : selectedYearNum ? `${selectedYearNum}` : t.budget.allPeriods;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.budget.title}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.budget.setBudgetDesc}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Copy Last Month */}
                    <Button
                        variant="outline"
                        className="gap-2 rounded-xl h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-medium"
                        onClick={handleCopyLastMonth}
                        disabled={copyMutation.isPending || filterMonth === 'all'}
                        title={filterMonth === 'all' ? t.budget.copyLastMonthTitle : t.budget.copyLastMonthTooltip}
                    >
                        {copyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                        {t.budget.copyLastMonth}
                    </Button>

                    {/* Set Budget Dialog */}
                    <Dialog open={isDialogOpen} onOpenChange={(open) => !saveMutation.isPending && handleOpenDialog(open)}>
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2 rounded-xl px-5 h-10 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-700 hover:to-zinc-900 text-white shadow-md shadow-zinc-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900 border-0 font-medium"
                                disabled={filterMonth === 'all'}
                                title={filterMonth === 'all' ? 'Select a specific month to set a budget' : ''}
                            >
                                <Plus className="h-4 w-4" /> {t.budget.setBudget}
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="sm:max-w-[425px]"
                            onInteractOutside={(e) => { if (saveMutation.isPending) e.preventDefault(); }}
                        >
                            <DialogHeader>
                                <DialogTitle>{editingId ? t.common.edit : t.budget.setMonthlyBudget}</DialogTitle>
                                <DialogDescription>
                                    {filterMonth !== 'all' && filterYear !== 'all'
                                        ? `${t.budget.settingBudgetFor} ${monthName(Number(filterMonth), Number(filterYear))} ${filterYear}`
                                        : t.budget.setBudgetDesc}
                                </DialogDescription>
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
                                        disabled={saveMutation.isPending}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">{t.common.category}</Label>
                                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={saveMutation.isPending}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t.budget.selectCategory} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">{t.common.global} {t.budget.globalOverall}</SelectItem>
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
                                <Button type="button" variant="outline" onClick={() => handleOpenDialog(false)} disabled={saveMutation.isPending}>
                                    {t.common.cancel}
                                </Button>
                                <Button onClick={handleCreateBudget} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t.common.saveChanges}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="relative w-full xl:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder={t.common?.search || 'Search categories...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-full bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-full"
                    />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
                    {/* View Toggle */}
                    <div className="hidden sm:flex bg-slate-100 dark:bg-zinc-800 rounded-full p-1 mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`px-3 py-1 h-8 rounded-full ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-950 shadow-sm' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`px-3 py-1 h-8 rounded-full ${viewMode === 'table' ? 'bg-white dark:bg-zinc-950 shadow-sm' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>

                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="h-10 w-full sm:w-[145px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl sm:rounded-full font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.filters.allMonths}</SelectItem>
                            {months.map(m => (
                                <SelectItem key={m} value={m.toString()}>
                                    {monthName(m, selectedYearNum ?? currentDate.getFullYear())}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="h-10 w-full sm:w-[110px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl sm:rounded-full font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.filters.allYears}</SelectItem>
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-6 animate-pulse mt-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <Skeleton className="h-4 w-28 mb-3" />
                                <Skeleton className="h-7 w-32 mb-1" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-12 h-12 rounded-2xl" />
                                <div>
                                    <Skeleton className="h-5 w-32 mb-2" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                            <div className="text-right">
                                <Skeleton className="h-6 w-20 mb-2 ml-auto" />
                                <Skeleton className="h-4 w-12 ml-auto" />
                            </div>
                        </div>
                        <Skeleton className="w-full h-3 rounded-full mt-4 mb-2" />
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-zinc-950 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-10 h-10 rounded-xl" />
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-1" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                </div>
                                <Skeleton className="w-full h-2 rounded-full mb-2" />
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : budgets.length === 0 ? (
                /* ── Empty State ── */
                <div className="flex flex-col items-center justify-center text-center py-24 px-4 bg-white dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-4xl text-zinc-400">🎯</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t.budget.noBudgetsFor} {periodLabel}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto mb-8">
                        {t.budget.noBudgetsDesc}
                    </p>
                    {filterMonth !== 'all' && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
                            <Button
                                variant="outline"
                                onClick={handleCopyLastMonth}
                                disabled={copyMutation.isPending}
                                className="flex-1 rounded-xl h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                {copyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                {t.budget.copyFromLastMonth}
                            </Button>
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                className="flex-1 gap-2 rounded-xl h-11 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-all font-medium border-0"
                            >
                                <Plus className="h-4 w-4" /> {t.budget.setFirstBudget}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* ── Summary KPI Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            label={t.budget.totalBudgeted}
                            value={`${formatCurrency(summary.totalBudgeted).replace('₫', '').trim()} đ`}
                            sub={periodLabel}
                            icon={Wallet}
                            iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                            valueColor="text-zinc-900 dark:text-zinc-50"
                        />
                        <SummaryCard
                            label={t.budget.totalSpent}
                            value={`${formatCurrency(summary.totalSpent).replace('₫', '').trim()} đ`}
                            sub={`${summary.healthRate.toFixed(0)}${t.budget.ofBudgetUsed}`}
                            icon={PiggyBank}
                            iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-500"
                            valueColor={summary.healthRate > 100 ? 'text-rose-500' : 'text-amber-500'}
                        />
                        <SummaryCard
                            label={t.budget.remaining}
                            value={`${formatCurrency(summary.totalRemaining).replace('₫', '').trim()} đ`}
                            sub={summary.totalRemaining > 0 ? t.budget.budgetAvailable : t.budget.noBudgetLeft}
                            icon={CheckCircle2}
                            iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                            valueColor="text-emerald-500"
                        />
                        <SummaryCard
                            label={t.budget.overBudgetCount}
                            value={summary.overCount === 0 ? t.budget.allClear : `${summary.overCount} ${t.budget.categoryCount}`}
                            sub={summary.overCount === 0 ? t.budget.noOverspending : t.budget.exceededLimit}
                            icon={summary.overCount > 0 ? AlertCircle : CheckCircle2}
                            iconBg={summary.overCount > 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'}
                            valueColor={summary.overCount > 0 ? 'text-rose-500' : 'text-emerald-500'}
                        />
                    </div>

                    {/* ── Global Budget Card ── */}
                    {globalBudget && (
                        <Card className={`relative overflow-hidden border-2 shadow-sm rounded-2xl ${globalBudget.percent_used > 100 ? 'border-rose-500/20' : 'border-emerald-500/20'}`}>
                            {globalBudget.percent_used > 100 && (
                                <div className="absolute top-0 right-0 p-8 pt-6 pointer-events-none opacity-5">
                                    <TriangleAlert className="w-48 h-48 text-rose-500" />
                                </div>
                            )}
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                            {t.budget.globalBudgetTitle}
                                            <span className="ml-2 text-sm font-normal text-zinc-400">— {periodLabel}</span>
                                        </h3>
                                        {globalBudget.percent_used > 100 && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                                                {t.budget.overBudget || 'Over Budget'}
                                            </span>
                                        )}
                                        {globalBudget.percent_used > 80 && globalBudget.percent_used <= 100 && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                                                {t.budget.nearingLimit}
                                            </span>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(globalBudget)}>
                                                <Edit className="mr-2 h-4 w-4" /> {t.common.edit}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingId(globalBudget.id)} className="text-rose-600 focus:text-rose-600">
                                                <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-baseline gap-2 mb-4 relative z-10">
                                    <h1 className={`text-6xl font-black tracking-tight ${globalBudget.percent_used > 100 ? 'text-rose-500' : globalBudget.percent_used > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {globalBudget.percent_used}%
                                    </h1>
                                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">{t.budget.ofLimitUtilized}</span>
                                </div>

                                <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-4 mb-4 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${globalBudget.percent_used > 100 ? 'bg-rose-500' : globalBudget.percent_used > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(globalBudget.percent_used, 100)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-sm">
                                    <div>
                                        <p className="text-zinc-500 dark:text-zinc-400 mb-1">{t.budget.spent}</p>
                                        <p className="font-bold text-zinc-900 dark:text-zinc-50">
                                            {formatCurrency(globalBudget.spent).replace('₫', '').trim()} <span className="underline decoration-1 underline-offset-2">đ</span>
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        {globalBudget.percent_used > 100 ? (
                                            <p className="font-bold text-rose-500 text-xs flex items-center gap-1">
                                                <TriangleAlert className="w-3 h-3" />
                                                {formatCurrency(Math.abs(globalBudget.remaining)).replace('₫', '').trim()} đ {t.budget.over}
                                            </p>
                                        ) : (
                                            <p className="font-semibold text-emerald-500 text-xs">
                                                {formatCurrency(globalBudget.remaining).replace('₫', '').trim()} đ {t.budget.left}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-zinc-500 dark:text-zinc-400 mb-1">{t.budget.totalLimit}</p>
                                        <p className="font-bold text-zinc-900 dark:text-zinc-50">
                                            {formatCurrency(globalBudget.budget).replace('₫', '').trim()} <span className="underline decoration-1 underline-offset-2">đ</span>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Category Budgets ── */}
                    {categoryBudgets.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                                    {t.analytics.categoryBreakdown}
                                    <span className="ml-2 text-sm font-normal text-zinc-400">({categoryBudgets.length})</span>
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {categoryBudgets.filter(b => b.percent_used > 100).length} {t.budget.overLimit}
                                </p>
                            </div>
                            {viewMode === 'grid' ? (
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {categoryBudgets.map((budget) => {
                                        const styling = getCategoryStyle(budget.category_id || 0);
                                        const TheIcon = styling.Icon;
                                        const isOver = budget.percent_used > 100;
                                        const isNear = budget.percent_used > 80 && !isOver;

                                        return (
                                            <Card key={budget.id} className="rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow">
                                                <CardContent className="p-5">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${styling.bg}`}>
                                                                <TheIcon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-tight">
                                                                    {translateCategoryName(budget.category_name)}
                                                                </h4>
                                                                {isOver && (
                                                                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{t.budget.overBudget}</span>
                                                                )}
                                                                {isNear && (
                                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{t.budget.nearingLimit}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-7 w-7 p-0 -mr-1">
                                                                    <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditClick(budget)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> {t.common.edit}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setDeletingId(budget.id)} className="text-rose-600 focus:text-rose-600">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {/* Spent amount + percent */}
                                                    <div className="flex justify-between items-baseline mb-3">
                                                        <div className="flex items-baseline gap-0.5">
                                                            <span className={`text-2xl font-black tracking-tight ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
                                                                {formatCurrency(budget.spent).replace('₫', '').trim()}
                                                            </span>
                                                            <span className={`text-sm font-bold underline decoration-1 underline-offset-2 ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-50'}`}>đ</span>
                                                        </div>
                                                        <span className={`text-sm font-bold ${isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-zinc-400'}`}>
                                                            {budget.percent_used}%
                                                        </span>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : styling.bar}`}
                                                            style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                                                        />
                                                    </div>

                                                    {/* Limit and remaining */}
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className="text-zinc-400">
                                                            {t.budget.limit}: {formatCurrency(budget.budget).replace('₫', '').trim()} đ
                                                        </span>
                                                        <span className={budget.remaining < 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-semibold'}>
                                                            {budget.remaining < 0
                                                                ? `−${formatCurrency(Math.abs(budget.remaining)).replace('₫', '').trim()} đ ${t.budget.over}`
                                                                : `${formatCurrency(budget.remaining).replace('₫', '').trim()} đ ${t.budget.left}`
                                                            }
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                            <TableRow>
                                                <TableHead>{t.common.category}</TableHead>
                                                <TableHead className="text-right">{t.budget.tableLimit}</TableHead>
                                                <TableHead className="text-right">{t.budget.tableSpent}</TableHead>
                                                <TableHead className="w-[150px]">{t.budget.tableProgress}</TableHead>
                                                <TableHead className="text-right">{t.budget.tableRemaining}</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categoryBudgets.map((budget) => {
                                                const styling = getCategoryStyle(budget.category_id || 0);
                                                const TheIcon = styling.Icon;
                                                const isOver = budget.percent_used > 100;
                                                const isNear = budget.percent_used > 80 && !isOver;

                                                return (
                                                    <TableRow key={budget.id} className="group">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${styling.bg}`}>
                                                                    <TheIcon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                                                                        {translateCategoryName(budget.category_name)}
                                                                    </p>
                                                                    {isOver && <p className="text-[10px] font-bold text-rose-500 uppercase">{t.budget.overBudget}</p>}
                                                                    {isNear && <p className="text-[10px] font-bold text-amber-500 uppercase">{t.budget.nearingLimit}</p>}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-zinc-500">
                                                            {formatCurrency(budget.budget).replace('₫', '').trim()} đ
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`font-bold ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
                                                                {formatCurrency(budget.spent).replace('₫', '').trim()} đ
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : styling.bar}`}
                                                                        style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`text-xs font-bold w-9 text-right ${isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-zinc-400'}`}>
                                                                    {budget.percent_used}%
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`text-sm ${budget.remaining < 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-medium'}`}>
                                                                {budget.remaining < 0
                                                                    ? `−${formatCurrency(Math.abs(budget.remaining)).replace('₫', '').trim()} đ`
                                                                    : `${formatCurrency(budget.remaining).replace('₫', '').trim()} đ`
                                                                }
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 xl:opacity-100 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                                        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleEditClick(budget)}>
                                                                        <Edit className="mr-2 h-4 w-4" /> {t.common.edit}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setDeletingId(budget.id)} className="text-rose-600 focus:text-rose-600">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* No category budgets but there are budgets */}
                    {categoryBudgets.length === 0 && budgets.length > 0 && !search && (
                        <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-500 text-sm font-medium">{t.budget.noBudgets}</p>
                            <p className="text-zinc-400 text-xs mt-1">{t.budget.setBudgetDesc}</p>
                        </div>
                    )}

                    {/* Search no result */}
                    {search && categoryBudgets.length === 0 && (
                        <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-500 text-sm">{t.common.noData} "{search}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Delete Confirm ── */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !deleteMutation.isPending && !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.budget.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.budget.deleteConfirmDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBudget} className="bg-rose-600 hover:bg-rose-700" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.common.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
