'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Expense, Category } from '@/types';
import { expenseApi } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2, ArrowDownIcon, Calendar, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from '@/components/ui/card';

export default function ExpensesContent() {
    const { t, locale, formatCurrency, translateCategoryName } = useLanguage();
    const queryClient = useQueryClient();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // New Filters
    const currentDate = new Date();
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>(currentDate.getFullYear().toString());
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<string>('date_desc');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // ─── Query Params ────────────────────────────────────────────────────────
    const queryParams: any = { page, limit: 10, search: debouncedSearch, sort: sortOrder };
    if (filterCategory !== 'all') {
        queryParams.category_id = filterCategory;
    }
    if (filterMonth !== 'all' && filterYear !== 'all') {
        const year = parseInt(filterYear);
        const month = parseInt(filterMonth);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month
        queryParams.start_date = startDate.toISOString();
        queryParams.end_date = endDate.toISOString();
    } else if (filterYear !== 'all') {
        const year = parseInt(filterYear);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        queryParams.start_date = startDate.toISOString();
        queryParams.end_date = endDate.toISOString();
    }

    const yearNum = filterYear === 'all' ? currentDate.getFullYear() : parseInt(filterYear);
    const monthNum = filterMonth === 'all' ? currentDate.getMonth() + 1 : parseInt(filterMonth);

    // ─── Queries ─────────────────────────────────────────────────────────────
    const { data: expensesRes, isLoading: isLoadingExpenses } = useQuery({
        queryKey: ['expensesList', queryParams],
        queryFn: () => expenseApi.getExpenses(queryParams)
    });

    const { data: categoriesRes, isLoading: isLoadingCats } = useQuery({
        queryKey: ['categories', 'expense'],
        queryFn: () => expenseApi.getCategories({ type: 'expense' })
    });

    const { data: summaryRes, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['dashboardSummary', monthNum, yearNum],
        queryFn: () => expenseApi.getMonthlySummary({ month: monthNum, year: yearNum })
    });

    const isLoading = isLoadingExpenses || isLoadingCats || isLoadingSummary;
    const expenses: Expense[] = expensesRes?.data?.data || [];
    const totalPages = expensesRes?.data?.total ? Math.ceil(expensesRes.data.total / 10) : 1;
    const totalItems = expensesRes?.data?.total || 0;
    const categories: Category[] = categoriesRes?.data || [];
    const summary = summaryRes?.data || null;

    // ─── Mutations ───────────────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: (values: any) => editingExpense
            ? expenseApi.updateExpense(editingExpense.id, values)
            : expenseApi.createExpense(values),
        onSuccess: (res) => {
            toast.success(editingExpense ? t.expenses.expenseUpdated : t.expenses.expenseAdded);
            if (!editingExpense && res?.data?.budget_warning) {
                setTimeout(() => toast.warning(res.data.budget_warning), 500);
            }
            setIsDialogOpen(false);
            setEditingExpense(null);
            queryClient.invalidateQueries({ queryKey: ['expensesList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
            queryClient.invalidateQueries({ queryKey: ['recentExpenses'] });
        },
        onError: () => {
            toast.error(t.expenses.expenseSaveFailed);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => expenseApi.deleteExpense(id),
        onSuccess: () => {
            toast.success(t.expenses.expenseDeleted);
            setIsDeleteDialogOpen(false);
            setExpenseToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['expensesList'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.invalidateQueries({ queryKey: ['budgetProgress'] });
            queryClient.invalidateQueries({ queryKey: ['recentExpenses'] });
        },
        onError: () => {
            toast.error(t.expenses.expenseDeleteFailed);
        }
    });

    const handleCreateOrUpdate = (values: any) => saveMutation.mutate(values);
    const handleDelete = () => expenseToDelete && deleteMutation.mutate(expenseToDelete.id);

    const getCategoryName = (id: number) => translateCategoryName(categories.find((c: Category) => c.id === id)?.name || t.common.unknown);
    const getCategoryColors = (id: number) => {
        const colorPairs = [
            { bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
            { bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
            { bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
            { bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
            { bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' }
        ];
        return colorPairs[id % colorPairs.length] || colorPairs[0];
    };

    const dateFnsLocale = locale === 'vi' ? vi : enUS;
    const daysInPeriod = filterMonth === 'all'
        ? 365
        : new Date(parseInt(filterYear === 'all' ? currentDate.getFullYear().toString() : filterYear), parseInt(filterMonth), 0).getDate();
    const totalExpenses = filterMonth === 'all'
        ? (summary?.total_year || 0)
        : (summary?.total_month || 0);
    const avgDaily = totalExpenses ? totalExpenses / daysInPeriod : 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.expenses.title}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.expenses.subtitle}</p>
                </div>
                <Button className="w-full sm:w-auto mt-0 rounded-xl px-5 h-10 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-700 hover:to-zinc-900 text-white shadow-md shadow-zinc-900/20 hover:shadow-lg hover:shadow-zinc-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900 dark:hover:from-white dark:hover:to-zinc-200 dark:shadow-zinc-300/20 border-0 font-medium tracking-wide" onClick={() => { setEditingExpense(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> {t.expenses.addExpense}
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Total Expenses Card */}
                <div className="bg-white dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center flex-shrink-0">
                        <ArrowDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{t.filters.totalExpenses}</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-zinc-800 dark:text-zinc-50 truncate">
                            {formatCurrency(totalExpenses)}
                        </h3>
                    </div>
                </div>

                {/* This Month Card */}
                <div className="bg-white dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{filterMonth === 'all' ? t.filters.thisYear : t.filters.thisMonth}</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-zinc-800 dark:text-zinc-50 capitalize truncate">
                            {filterMonth === 'all' ? filterYear : format(new Date(parseInt(filterYear === 'all' ? currentDate.getFullYear().toString() : filterYear), parseInt(filterMonth) - 1), 'MMM yyyy', { locale: dateFnsLocale })}
                        </h3>
                    </div>
                </div>

                {/* Avg Daily Card */}
                <div className="bg-white dark:bg-zinc-950 p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{t.filters.avgDaily}</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-zinc-800 dark:text-zinc-50 truncate">
                            {formatCurrency(avgDaily)}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                <div className="relative w-full lg:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        type="search"
                        placeholder={t.expenses.searchExpenses}
                        className="pl-9 h-10 bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-full w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full lg:w-[130px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:ring-0">
                            <SelectValue placeholder={t.filters?.month || "Month"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.filters?.allMonths || "All months"}</SelectItem>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>{t.filters?.monthPrefix || "Month "}{i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full lg:w-[110px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:ring-0">
                            <SelectValue placeholder={t.filters?.year || "Year"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.filters?.allYears || "All years"}</SelectItem>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <SelectItem key={currentDate.getFullYear() - i} value={(currentDate.getFullYear() - i).toString()}>
                                    {currentDate.getFullYear() - i}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full lg:w-[150px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:ring-0">
                            <SelectValue placeholder={t.common.category} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.filters?.allCategories || "All categories"}</SelectItem>
                            {categories.map((c: Category) => (
                                <SelectItem key={c.id} value={c.id.toString()}>{translateCategoryName(c.name)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v); setPage(1); }}>
                        <SelectTrigger className="h-10 w-full lg:w-[140px] bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:ring-0">
                            <SelectValue placeholder={t.filters?.sort || "Sort"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date_desc">{t.filters?.newest || "Newest"}</SelectItem>
                            <SelectItem value="date_asc">{t.filters?.oldest || "Oldest"}</SelectItem>
                            <SelectItem value="amount_desc">{t.filters?.highestAmount || "Highest amount"}</SelectItem>
                            <SelectItem value="amount_asc">{t.filters?.lowestAmount || "Lowest amount"}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="hidden md:flex bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex-col">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800">
                            <TableHead className="text-xs font-bold text-zinc-500 uppercase h-11">{t.common.date}</TableHead>
                            <TableHead className="text-xs font-bold text-zinc-500 uppercase h-11">{t.common.description}</TableHead>
                            <TableHead className="text-xs font-bold text-zinc-500 uppercase h-11">{t.common.category}</TableHead>
                            <TableHead className="text-right text-xs font-bold text-zinc-500 uppercase h-11">{t.common.amount}</TableHead>
                            <TableHead className="w-[80px] text-right text-xs font-bold text-zinc-500 uppercase h-11">{t.common.actions || "Actions"}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t.expenses.noExpenses}</TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense: Expense) => {
                                const catColors = getCategoryColors(expense.category_id);
                                return (
                                    <TableRow key={expense.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg w-12 h-12 flex-shrink-0">
                                                    <span className="text-[10px] font-bold text-zinc-500 uppercase leading-none mb-1">
                                                        {format(new Date(expense.date), 'MMM', { locale: dateFnsLocale })}
                                                    </span>
                                                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-none">
                                                        {format(new Date(expense.date), 'dd')}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                                    {format(new Date(expense.date), 'yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{expense.description}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${catColors.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${catColors.dot}`}></span>
                                                {getCategoryName(expense.category_id)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                    - {formatCurrency(expense.amount).replace('₫', '').trim()}
                                                </span>
                                                <span className="text-xs font-bold text-zinc-500 underline decoration-1 underline-offset-2">đ</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">{t.common.openMenu || "Open menu"}</span>
                                                        <MoreHorizontal className="h-4 w-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsDialogOpen(true); }}>
                                                        <Pencil className="mr-2 h-4 w-4" /> {t.common.edit || "Edit"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setExpenseToDelete(expense); setIsDeleteDialogOpen(true); }} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50">
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete || "Delete"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="border-zinc-100 dark:border-zinc-800 shadow-sm shadow-zinc-100 dark:shadow-none bg-white dark:bg-zinc-950">
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="flex justify-between items-end">
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : expenses.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-950 p-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
                        <p className="text-muted-foreground">{t.expenses.noExpenses}</p>
                    </div>
                ) : (
                    expenses.map((expense: Expense) => {
                        const catColors = getCategoryColors(expense.category_id);
                        return (
                            <Card key={expense.id} className="overflow-hidden border-zinc-100 dark:border-zinc-800 shadow-sm shadow-zinc-100 dark:shadow-none bg-white dark:bg-zinc-950">
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-lg w-10 h-10 flex-shrink-0 border border-zinc-100 dark:border-zinc-800">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase leading-none mb-0.5">
                                                    {format(new Date(expense.date), 'MMM', { locale: dateFnsLocale })}
                                                </span>
                                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">
                                                    {format(new Date(expense.date), 'dd')}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-zinc-800 dark:text-zinc-100 text-sm truncate">{expense.description}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                                                    {format(new Date(expense.date), 'yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1 flex-shrink-0">
                                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                - {formatCurrency(expense.amount).replace('₫', '').trim()}
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-500 underline decoration-1 underline-offset-2">đ</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                                        <div className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium ${catColors.bg}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${catColors.dot}`}></span>
                                            {getCategoryName(expense.category_id)}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                                    <span className="sr-only">{t.common.openMenu || "Open menu"}</span>
                                                    <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px] rounded-xl shadow-lg">
                                                <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsDialogOpen(true); }} className="rounded-lg cursor-pointer my-1">
                                                    <Pencil className="mr-2 h-4 w-4" /> {t.common.edit || "Edit"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setExpenseToDelete(expense); setIsDeleteDialogOpen(true); }} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 rounded-lg cursor-pointer my-1">
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete || "Delete"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl shadow-sm mt-4">
                <div className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400">
                    {t.filters.showing}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalItems === 0 ? 0 : (page - 1) * 10 + 1}</span>{' '}
                    {t.filters.to}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min(page * 10, totalItems)}</span>{' '}
                    {t.filters.of}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalItems}</span>{' '}
                    {t.filters.results}
                </div>
                <span className="sm:hidden text-sm text-zinc-500 dark:text-zinc-400 font-medium">{page} / {totalPages}</span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || isLoading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal hover:bg-zinc-50 hover:text-zinc-900"
                    >
                        {t.common.previous || "Previous"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || isLoading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal hover:bg-zinc-50 hover:text-zinc-900"
                    >
                        {t.common.next || "Next"}
                    </Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => !saveMutation.isPending && setIsDialogOpen(open)}>
                <DialogContent
                    onInteractOutside={(e) => {
                        if (saveMutation.isPending) e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? t.expenses.editExpense : t.expenses.addNewExpense}</DialogTitle>
                        <DialogDescription>
                            {editingExpense ? t.expenses.updateDetails : t.expenses.enterDetails}
                        </DialogDescription>
                    </DialogHeader>
                    <ExpenseForm
                        initialData={editingExpense}
                        categories={categories}
                        onSubmit={handleCreateOrUpdate}
                        isLoading={saveMutation.isPending}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !deleteMutation.isPending && setIsDeleteDialogOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.expenses.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.expenses.deleteConfirmDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.common.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
