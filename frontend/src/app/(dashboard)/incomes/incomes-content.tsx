'use client';

import { useState, useEffect } from 'react';
import { Income } from '@/types';
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
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { IncomeForm } from '@/components/incomes/income-form';
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

export default function IncomesContent() {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);

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

    const [categories, setCategories] = useState<any[]>([]); // Use appropriate type

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [incomesRes, categoriesRes] = await Promise.all([
                expenseApi.getIncomes({
                    page,
                    limit: 10,
                }),
                expenseApi.getCategories({ type: 'income' })
            ]);

            setIncomes(incomesRes.data.data);
            setTotalPages(Math.ceil(incomesRes.data.total / incomesRes.data.limit));
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // toast.error("Failed to load incomes"); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearch]);

    const handleCreateOrUpdate = async (values: any) => {
        try {
            if (editingIncome) {
                await expenseApi.updateIncome(editingIncome.id, values);
                toast.success("Income updated successfully");
            } else {
                await expenseApi.createIncome(values);
                toast.success("Income added successfully");
            }
            setIsDialogOpen(false);
            setEditingIncome(null);
            fetchData();
        } catch (error) {
            console.error("Error saving income:", error);
            toast.error("Failed to save income");
        }
    };

    const handleDelete = async () => {
        if (!incomeToDelete) return;
        try {
            await expenseApi.deleteIncome(incomeToDelete.id);
            toast.success("Income deleted successfully");
            fetchData();
            setIsDeleteDialogOpen(false);
            setIncomeToDelete(null);
        } catch (error) {
            console.error("Error deleting income:", error);
            toast.error("Failed to delete income");
        }
    };

    const openEditDialog = (income: Income) => {
        setEditingIncome(income);
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (income: Income) => {
        setIncomeToDelete(income);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Income</h2>
                    <p className="text-muted-foreground">Manage your income sources</p>
                </div>
                <Button onClick={() => { setEditingIncome(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Income
                </Button>
            </div>

            {/* Filters */}
            {/* <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search income..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div> */}

            {/* Table */}
            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Description</TableHead>
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
                        ) : incomes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No income records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            incomes.map((income) => (
                                <TableRow key={income.id}>
                                    <TableCell>{format(new Date(income.date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="font-medium">{income.source}</TableCell>
                                    <TableCell>{income.description || '-'}</TableCell>
                                    <TableCell className="text-right text-emerald-600 font-medium">+{formatCurrency(income.amount)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(income)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDeleteDialog(income)} className="text-red-600 focus:text-red-600">
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
                        <DialogTitle>{editingIncome ? 'Edit Income' : 'Add New Income'}</DialogTitle>
                        <DialogDescription>
                            {editingIncome ? 'Update the details of your income source.' : 'Enter the details for your new income.'}
                        </DialogDescription>
                    </DialogHeader>
                    <IncomeForm
                        initialData={editingIncome}
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
                            This action cannot be undone. This will permanently delete the income record from our servers.
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
