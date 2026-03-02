'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Overview } from '@/components/dashboard/overview';
import {
    ArrowDownIcon, ArrowUpIcon, Wallet, TrendingUp, TrendingDown,
    Minus, Plus, Calendar, ChevronRight, Loader2,
} from 'lucide-react';
import { expenseApi } from '@/lib/api';
import { DashboardSummary, Expense, Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import Loading from './loading';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcTrend(current: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
    if (prev === 0) return { pct: 0, dir: 'flat' };
    const pct = ((current - prev) / prev) * 100;
    return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function TrendBadge({ current, prev, positiveIsGood, t }: { current: number; prev: number; positiveIsGood: boolean; t: any }) {
    const { pct, dir } = calcTrend(current, prev);
    if (dir === 'flat' || prev === 0) return <span className="text-xs text-zinc-400">{t.dashboard.vsLastMonth}</span>;

    const isGood = positiveIsGood ? dir === 'up' : dir === 'down';
    const Icon = dir === 'up' ? TrendingUp : TrendingDown;

    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isGood ? 'text-emerald-500' : 'text-rose-500'}`}>
            <Icon className="w-3 h-3" />
            {pct.toFixed(1)}% {t.dashboard.vsLastMo}
        </span>
    );
}

// Category color chips
const CATEGORY_CHIP_COLORS: Record<string, string> = {
    'Food': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    'Transport': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Entertainment': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    'Health': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    'Bills': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'Shopping': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    'Education': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
};
const DEFAULT_CHIP = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';

function getCategoryChipColor(name: string) {
    return CATEGORY_CHIP_COLORS[name] ?? DEFAULT_CHIP;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { t, locale, formatCurrency, translateCategoryName } = useLanguage();
    const queryClient = useQueryClient();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);

    // Quick Add Expense dialog
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAmount, setQuickAmount] = useState<number | undefined>(undefined);
    const [quickCategoryId, setQuickCategoryId] = useState<string>('');
    const [quickDesc, setQuickDesc] = useState('');

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // ─── Queries ─────────────────────────────────────────────────────────────
    const { data: summaryRes, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['dashboardSummary', selectedMonth, selectedYear],
        queryFn: () => expenseApi.getMonthlySummary({ month: selectedMonth, year: selectedYear })
    });

    const { data: txRes, isLoading: isLoadingTx } = useQuery({
        queryKey: ['recentExpenses'],
        queryFn: () => expenseApi.getExpenses({ limit: 5, sort: 'date_desc' })
    });

    const { data: catsRes, isLoading: isLoadingCats } = useQuery({
        queryKey: ['categories', 'expense'],
        queryFn: () => expenseApi.getCategories({ type: 'expense' })
    });

    const { data: budgetRes, isLoading: isLoadingBudget } = useQuery({
        queryKey: ['budgetProgress', selectedMonth, selectedYear],
        queryFn: () => expenseApi.getBudgetProgress({ month: selectedMonth, year: selectedYear }),
        retry: false
    });

    const loading = isLoadingSummary || isLoadingTx || isLoadingCats || isLoadingBudget;

    const summary = summaryRes?.data || null;
    const recentTransactions = txRes?.data?.data || [];
    const categories = catsRes?.data || [];

    let budgetInfo = null;
    if (budgetRes?.data) {
        const global = (budgetRes.data as any[]).find(
            (b: any) => b.category_id === null || b.category_name === 'Global'
        );
        if (global) budgetInfo = { budget: global.budget, spent: global.spent, percent_used: global.percent_used };
    }

    // Map category_id → Category for recent transactions
    const catMap = Object.fromEntries(categories.map((c: Category) => [c.id, c]));

    const chartData = summary?.daily?.map((d: any) => {
        const date = new Date(d.date);
        return {
            name: date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' }),
            total: Number(d.total) || 0,
        };
    }) || [];

    const totalExpense = Number(summary?.total_month) || 0;
    const totalIncome = Number(summary?.total_income_month) || 0;
    const balance = Number(summary?.balance) || 0;

    const periodLabel = new Date(selectedYear, selectedMonth - 1)
        .toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' });

    // Quick Add Mutation
    const createExpenseMutation = useMutation({
        mutationFn: (data: any) => expenseApi.createExpense(data),
        onSuccess: () => {
            toast.success(t.dashboard.expenseAdded);
            setIsQuickAddOpen(false);
            setQuickAmount(undefined);
            setQuickCategoryId('');
            setQuickDesc('');
            // Invalidate queries so the UI immediately refreshes
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['recentExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
        },
        onError: () => {
            toast.error(t.dashboard.expenseAddFailed);
        }
    });

    const handleQuickAdd = () => {
        if (!quickAmount || !quickCategoryId) {
            toast.error(t.dashboard.fillAmountCategory);
            return;
        }
        createExpenseMutation.mutate({
            amount: quickAmount,
            category_id: Number(quickCategoryId),
            description: quickDesc || undefined,
            date: new Date().toISOString(),
        });
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.dashboard.title}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                        {t.dashboard.subtitle || 'Welcome back to your financial overview.'}
                    </p>
                </div>

                <Button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="w-full sm:w-auto gap-2 rounded-xl px-5 h-10 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white hover:from-zinc-700 hover:to-zinc-900 shadow-md shadow-zinc-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900 border-0 font-medium"
                >
                    <Plus className="w-4 h-4" /> {t.dashboard.quickAddExpense}
                </Button>
            </header>

            {loading ? (
                <div className="space-y-6 animate-pulse mt-4">
                    {/* Period badge skeleton */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                    </div>

                    {/* 3 Stat Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between h-[150px]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-32" />
                                    </div>
                                    <Skeleton className="w-10 h-10 rounded-xl" />
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Budget Mini Widget Skeleton */}
                    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5">
                        <div className="flex justify-between mb-3">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <div className="flex gap-2 items-center">
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                        <Skeleton className="w-full h-2 rounded-full" />
                    </div>

                    {/* Bottom grid skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <Skeleton className="h-6 w-48 mb-6" />
                                <Skeleton className="w-full h-[300px] rounded-xl" />
                            </div>
                        </div>
                        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                            <Skeleton className="h-6 w-32 mb-6" />
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl">
                                        <div className="flex gap-3 items-center">
                                            <Skeleton className="w-10 h-10 rounded-xl" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Period badge */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t.dashboard.viewing}</span>
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {periodLabel}
                        </span>
                    </div>

                    {/* ── 3 Stat Cards ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Income Card */}
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.dashboard.monthlyIncome}</p>
                                    <div className="flex items-baseline gap-1 min-w-0">
                                        <h3 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-emerald-500 truncate">
                                            {formatCurrency(totalIncome).replace('₫', '').trim()}
                                        </h3>
                                        <span className="text-lg sm:text-xl font-bold text-emerald-500 underline decoration-2 underline-offset-4">đ</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <ArrowUpIcon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <TrendBadge current={totalIncome} prev={Number(summary?.prev_month_income) || 0} positiveIsGood={true} t={t} />
                                <span className="text-xs text-zinc-400">{t.dashboard.thisMonth}</span>
                            </div>
                        </div>

                        {/* Expense Card */}
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.dashboard.monthlyExpenses}</p>
                                    <div className="flex items-baseline gap-1 min-w-0">
                                        <h3 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-rose-500 truncate">
                                            {formatCurrency(totalExpense).replace('₫', '').trim()}
                                        </h3>
                                        <span className="text-lg sm:text-xl font-bold text-rose-500 underline decoration-2 underline-offset-4">đ</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-500 flex items-center justify-center flex-shrink-0">
                                    <ArrowDownIcon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <TrendBadge current={totalExpense} prev={Number(summary?.prev_month_expense) || 0} positiveIsGood={false} t={t} />
                                <span className="text-xs text-zinc-400">
                                    {t.dashboard.today}: {formatCurrency(Number(summary?.total_today) || 0).replace('₫', '').trim()} <span className="underline decoration-1 underline-offset-2">đ</span>
                                </span>
                            </div>
                        </div>

                        {/* Balance Card */}
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.dashboard.balance}</p>
                                    <div className="flex items-baseline gap-1 min-w-0">
                                        <h3 className={`text-2xl sm:text-3xl xl:text-4xl font-bold truncate ${balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                            {formatCurrency(balance).replace('₫', '').trim()}
                                        </h3>
                                        <span className={`text-lg sm:text-xl font-bold underline decoration-2 underline-offset-4 ${balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>đ</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold ${balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                                    {balance >= 0 ? t.dashboard.surplus : t.dashboard.deficit}
                                </span>
                                <span className="text-xs text-zinc-400">{t.dashboard.incomeMinusExpenses}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Budget Mini Widget ── */}
                    {budgetInfo && (
                        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{t.dashboard.monthlyBudget}</h4>
                                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                        {formatCurrency(budgetInfo.spent).replace('₫', '').trim()} đ {t.dashboard.spentOf} {formatCurrency(budgetInfo.budget).replace('₫', '').trim()} đ
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-black ${budgetInfo.percent_used > 100 ? 'text-rose-500' : budgetInfo.percent_used > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {budgetInfo.percent_used}%
                                    </span>
                                    {budgetInfo.percent_used > 100 && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{t.dashboard.budgetOverBudget}</span>
                                    )}
                                    <Link href="/budget" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-0.5 transition-colors">
                                        {t.dashboard.budgetDetails} <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${budgetInfo.percent_used > 100 ? 'bg-rose-500' : budgetInfo.percent_used > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(budgetInfo.percent_used, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Chart + Recent Transactions ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Daily Spending Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50">{t.dashboard.dailySpending}</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">{t.dashboard.dailyExpenseBreakdown} {periodLabel}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(Number(val))}>
                                        <SelectTrigger className="w-auto h-8 px-3 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-full font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => (
                                                <SelectItem key={m} value={m.toString()}>
                                                    {new Date(selectedYear, m - 1).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long' })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                                        <SelectTrigger className="w-auto h-8 px-3 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-full font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                {chartData.length > 0 ? (
                                    <Overview data={chartData} />
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-center text-sm text-zinc-400 p-6 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 mt-4">
                                        <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                            <span className="text-xl">📊</span>
                                        </div>
                                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t.dashboard.noSpendingData}</p>
                                        <p className="text-xs max-w-xs">{t.dashboard.noSpendingDataSub}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50">{t.dashboard.recentTransactions}</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">{t.dashboard.last5Expenses}</p>
                                </div>
                                <Link href="/expenses" className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                                    {t.dashboard.viewAll} <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            <div className="flex-1 space-y-3">
                                {recentTransactions.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-sm text-zinc-400 py-10 px-4 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                            <span className="text-xl">💳</span>
                                        </div>
                                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t.dashboard.noRecentTransactions}</p>
                                        <p className="text-xs max-w-[200px] mb-4">{t.dashboard.noTransactionsSub}</p>
                                        <Button size="sm" onClick={() => setIsQuickAddOpen(true)} className="rounded-full text-xs h-8 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-sm border-0">
                                            <Plus className="w-3.5 h-3.5 mr-1" /> {t.dashboard.addFirstExpense}
                                        </Button>
                                    </div>
                                ) : (
                                    recentTransactions.map((tx: Expense) => {
                                        const cat = catMap[tx.category_id];
                                        const catName = cat?.name ?? '';
                                        return (
                                            <div key={tx.id} className="flex items-center justify-between gap-3 group">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                                        {tx.description || t.common.noDescription}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-zinc-400">
                                                            {new Date(tx.date).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                        {catName && (
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getCategoryChipColor(catName)}`}>
                                                                {translateCategoryName(catName)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-0.5 flex-shrink-0">
                                                    <span className="text-sm font-bold text-rose-500">
                                                        -{formatCurrency(Number(tx.amount)).replace('₫', '').trim()}
                                                    </span>
                                                    <span className="text-xs font-bold text-rose-500 underline decoration-1 underline-offset-2">đ</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Spending by Category ── */}
                    {summary?.by_category && summary.by_category.length > 0 && (
                        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50">{t.dashboard.spendingByCategory}</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">{t.dashboard.topCategoriesFor} {periodLabel}</p>
                                </div>
                                <Link href="/analytics" className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                                    {t.dashboard.analyticsLink} <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {summary.by_category.map((cat: any, index: number) => {
                                    const pct = totalExpense > 0 ? (Number(cat.total) / totalExpense) * 100 : 0;
                                    const barColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
                                    const dotColors = ['text-emerald-500', 'text-blue-500', 'text-purple-500', 'text-amber-500', 'text-rose-500', 'text-indigo-500'];
                                    const colorIndex = index % barColors.length;
                                    return (
                                        <div key={cat.category_id}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <div className="flex items-center min-w-0">
                                                    <span className={`w-2 h-2 rounded-full ${barColors[colorIndex]} mr-2 flex-shrink-0`} />
                                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                                        {translateCategoryName(cat.category_name)}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-2 text-zinc-500 dark:text-zinc-400 flex-shrink-0 pl-3">
                                                    <span className="text-sm font-medium">
                                                        {formatCurrency(Number(cat.total)).replace('₫', '').trim()} <span className="text-xs underline decoration-1 underline-offset-2">đ</span>
                                                    </span>
                                                    <span className={`text-xs font-semibold ${dotColors[colorIndex]}`}>{pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`${barColors[colorIndex]} h-full rounded-full transition-all duration-500 ease-in-out`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )
            }

            {/* ── Quick Add Expense Dialog ── */}
            <Dialog open={isQuickAddOpen} onOpenChange={(o) => !createExpenseMutation.isPending && setIsQuickAddOpen(o)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> {t.dashboard.quickAddExpense}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right text-sm">{t.common.amount}</Label>
                            <CurrencyInput
                                className="col-span-3"
                                placeholder="0"
                                value={quickAmount}
                                onValueChange={(v) => setQuickAmount(v)}
                                disabled={createExpenseMutation.isPending}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right text-sm">{t.common.category}</Label>
                            <Select value={quickCategoryId} onValueChange={setQuickCategoryId} disabled={createExpenseMutation.isPending}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={t.budget.selectCategory} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c: Category) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {translateCategoryName(c.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-3">
                            <Label className="text-right text-sm">{t.dashboard.noteLabel}</Label>
                            <Input
                                className="col-span-3"
                                placeholder={t.dashboard.optionalDesc}
                                value={quickDesc}
                                onChange={(e) => setQuickDesc(e.target.value)}
                                disabled={createExpenseMutation.isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsQuickAddOpen(false)} disabled={createExpenseMutation.isPending}>
                            {t.common.cancel}
                        </Button>
                        <Button onClick={handleQuickAdd} disabled={createExpenseMutation.isPending || !quickAmount || !quickCategoryId} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-6 font-semibold shadow-md shadow-emerald-500/20 w-full sm:w-auto">
                            {createExpenseMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t.common.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
