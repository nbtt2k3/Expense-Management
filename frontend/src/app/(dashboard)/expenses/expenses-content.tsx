'use client';

import { useState, useEffect } from 'react';
import { Expense, Category } from '@/types';
import { expenseApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExpensesContent() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    // Filters and Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [expensesRes, categoriesRes] = await Promise.all([
                expenseApi.getExpenses({
                    page,
                    limit: 10,
                    search: debouncedSearch,
                    // sort: 'date_desc' // default in backend
                }),
                expenseApi.getCategories({ type: 'expense' })
            ]);

            setExpenses(expensesRes.data.data);
            setTotalPages(Math.ceil(expensesRes.data.total / expensesRes.data.limit));
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load expenses");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearch]);

    const handleCreateOrUpdate = async (values: any) => {
        try {
            if (editingExpense) {
                await expenseApi.updateExpense(editingExpense.id, values);
                toast.success("Expense updated successfully");
            } else {
                const res = await expenseApi.createExpense(values);
                toast.success("Expense added successfully");
                // Budget alert
                if (res.data?.budget_warning) {
                    setTimeout(() => toast.warning(res.data.budget_warning), 500);
                }
            }
            setIsDialogOpen(false);
            setEditingExpense(null);
            fetchData();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast.error("Failed to save expense");
        }
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await expenseApi.deleteExpense(expenseToDelete.id);
            toast.success("Expense deleted successfully");
            fetchData();
            setIsDeleteDialogOpen(false);
            setExpenseToDelete(null);
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast.error("Failed to delete expense");
        }
    };

    const openEditDialog = (expense: Expense) => {
        setEditingExpense(expense);
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (expense: Expense) => {
        setExpenseToDelete(expense);
        setIsDeleteDialogOpen(true);
    };

    const getCategoryName = (id: number) => {
        return categories.find(c => c.id === id)?.name || 'Unknown';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
                    <p className="text-muted-foreground">Manage your daily expenses</p>
                </div>
                <Button onClick={() => { setEditingExpense(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Expense
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search expenses..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {/* Add Date Range Picker here later */}
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No expenses found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
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
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(expense)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDeleteDialog(expense)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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

            {/* Pagination settings */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                >
                    Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                    Page {page} of {Math.max(1, totalPages)}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                >
                    Next
                </Button>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                        <DialogDescription>
                            {editingExpense ? 'Update the details of your expense.' : 'Enter the details for your new expense.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ExpenseForm
                        initialData={editingExpense}
                        categories={categories}
                        onSubmit={handleCreateOrUpdate}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the expense from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
