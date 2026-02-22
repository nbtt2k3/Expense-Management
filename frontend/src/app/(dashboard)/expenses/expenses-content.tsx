'use client';

import { useState, useEffect } from 'react';
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
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from '@/components/ui/card';

export default function ExpensesContent() {
    const { t, locale, formatCurrency, translateCategoryName } = useLanguage();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params: any = { page, limit: 10, search: debouncedSearch, sort: sortOrder };

            if (filterCategory !== 'all') {
                params.category_id = filterCategory;
            }
            if (filterMonth !== 'all' && filterYear !== 'all') {
                const year = parseInt(filterYear);
                const month = parseInt(filterMonth);
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month
                params.start_date = startDate.toISOString();
                params.end_date = endDate.toISOString();
            } else if (filterYear !== 'all') {
                const year = parseInt(filterYear);
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31, 23, 59, 59);
                params.start_date = startDate.toISOString();
                params.end_date = endDate.toISOString();
            }

            const [expensesRes, categoriesRes] = await Promise.all([
                expenseApi.getExpenses(params),
                expenseApi.getCategories({ type: 'expense' })
            ]);
            setExpenses(expensesRes.data.data);
            setTotalPages(Math.ceil(expensesRes.data.total / expensesRes.data.limit));
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error(t.expenses.loadFailed);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page, debouncedSearch, filterMonth, filterYear, filterCategory, sortOrder]);

    const handleCreateOrUpdate = async (values: any) => {
        setIsSaving(true);
        try {
            if (editingExpense) {
                await expenseApi.updateExpense(editingExpense.id, values);
                toast.success(t.expenses.expenseUpdated);
            } else {
                const res = await expenseApi.createExpense(values);
                toast.success(t.expenses.expenseAdded);
                if (res.data?.budget_warning) {
                    setTimeout(() => toast.warning(res.data.budget_warning), 500);
                }
            }
            setIsDialogOpen(false);
            setEditingExpense(null);
            fetchData();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast.error(t.expenses.expenseSaveFailed);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        setIsDeleting(true);
        try {
            await expenseApi.deleteExpense(expenseToDelete.id);
            toast.success(t.expenses.expenseDeleted);
            fetchData();
            setIsDeleteDialogOpen(false);
            setExpenseToDelete(null);
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast.error(t.expenses.expenseDeleteFailed);
        } finally {
            setIsDeleting(false);
        }
    };

    const getCategoryName = (id: number) => translateCategoryName(categories.find(c => c.id === id)?.name || t.common.unknown);
    const dateFnsLocale = locale === 'vi' ? vi : enUS;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.expenses.title}</h2>
                    <p className="text-muted-foreground">{t.expenses.subtitle}</p>
                </div>
                <Button onClick={() => { setEditingExpense(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> {t.expenses.addExpense}
                </Button>
            </div>

            <div className="flex flex-col gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t.expenses.searchExpenses}
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto gap-2">
                        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[130px] h-9 bg-white dark:bg-zinc-900 border-0 shadow-sm">
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
                            <SelectTrigger className="w-full sm:w-[110px] h-9 bg-white dark:bg-zinc-900 border-0 shadow-sm">
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
                            <SelectTrigger className="w-full sm:w-[150px] h-9 bg-white dark:bg-zinc-900 border-0 shadow-sm">
                                <SelectValue placeholder={t.common.category} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t.filters?.allCategories || "All categories"}</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{translateCategoryName(c.name)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[140px] h-9 bg-white dark:bg-zinc-900 border-0 shadow-sm">
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
            </div>

            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.common.date}</TableHead>
                            <TableHead>{t.common.description}</TableHead>
                            <TableHead>{t.common.category}</TableHead>
                            <TableHead className="text-right">{t.common.amount}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
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
                            expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(new Date(expense.date), 'dd MMM, yyyy', { locale: dateFnsLocale })}</TableCell>
                                    <TableCell className="font-medium">{expense.description}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {getCategoryName(expense.category_id)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">{t.common.openMenu}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsDialogOpen(true); }}>
                                                    <Pencil className="mr-2 h-4 w-4" /> {t.common.edit}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setExpenseToDelete(expense); setIsDeleteDialogOpen(true); }} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                    {t.common.previous}
                </Button>
                <div className="text-sm text-muted-foreground">
                    {t.common.page} {page} {t.common.of} {Math.max(1, totalPages)}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
                    {t.common.next}
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && setIsDialogOpen(open)}>
                <DialogContent
                    onInteractOutside={(e) => {
                        if (isSaving) e.preventDefault();
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
                        isLoading={isSaving}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isDeleting && setIsDeleteDialogOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.expenses.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.expenses.deleteConfirmDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.common.delete}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
