'use client';

import { useState, useEffect } from 'react';
import { expenseApi } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Lock, Loader2, Pencil, Search, HeartPulse, Bus, Film, Utensils, ShoppingBag, Home, Package, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesContent() {
    const { t, translateCategoryName } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryType, setEditCategoryType] = useState<'income' | 'expense'>('expense');
    const [isEditing, setIsEditing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const res = await expenseApi.getCategories();
            setCategories(res.data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            toast.error(t.categories.loadFailed);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const isDuplicateCategory = (name: string, type: 'income' | 'expense', skipId?: number) => {
        const trimmedName = name.trim().toLowerCase();
        return categories.some(c => {
            if (skipId && c.id === skipId) return false;
            if (c.type !== type) return false;
            const rawNameMatch = c.name.toLowerCase() === trimmedName;
            const translatedNameMatch = translateCategoryName(c.name).toLowerCase() === trimmedName;
            return rawNameMatch || translatedNameMatch;
        });
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        if (isDuplicateCategory(newCategoryName, newCategoryType)) {
            toast.error(t.categories.categoryNameExists);
            return;
        }

        setIsSubmitting(true);
        try {
            await expenseApi.createCategory(newCategoryName, newCategoryType);
            toast.success(t.categories.categoryCreated);
            setNewCategoryName('');
            setIsDialogOpen(false);
            fetchCategories();
        } catch (error: any) {
            console.error("Failed to create category:", error);
            if (error.response?.status === 400 && error.response?.data?.detail?.includes('already exists')) {
                toast.error(t.categories.categoryNameExists);
            } else {
                toast.error(t.categories.categoryCreateFailed);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditCategoryName(category.name);
        setEditCategoryType(category.type as 'income' | 'expense');
        setIsEditDialogOpen(true);
    };

    const handleEditCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editCategoryName.trim() || !editingCategory) return;

        if (isDuplicateCategory(editCategoryName, editCategoryType, editingCategory.id)) {
            toast.error(t.categories.categoryNameExists);
            return;
        }

        setIsEditing(true);
        try {
            await expenseApi.updateCategory(editingCategory.id, editCategoryName, editCategoryType);
            toast.success(t.categories.categoryUpdated);
            setIsEditDialogOpen(false);
            fetchCategories();
        } catch (error: any) {
            console.error("Failed to update category:", error);
            if (error.response?.status === 400 && error.response?.data?.detail?.includes('already exists')) {
                toast.error(t.categories.categoryNameExists);
            } else {
                toast.error(t.categories.categoryUpdateFailed);
            }
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        setDeletingId(id);
        try {
            await expenseApi.deleteCategory(id);
            toast.success(t.categories.categoryDeleted);
            fetchCategories();
        } catch (error: any) {
            const detail = error?.response?.data?.detail;
            if (detail?.includes('linked expenses')) {
                toast.error(t.categories.hasLinkedExpenses);
            } else if (error?.response?.status === 403) {
                toast.error(t.categories.cannotDeleteDefault);
            } else {
                toast.error(t.categories.categoryDeleteFailed);
            }
        } finally {
            setDeletingId(null);
        }
    };

    const getCategoryColors = (id: number) => {
        const colorPairs = [
            { bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500', bar: 'bg-emerald-500', Icon: HeartPulse },
            { bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500', bar: 'bg-blue-500', Icon: Bus },
            { bg: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500', bar: 'bg-purple-500', Icon: Film },
            { bg: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500', bar: 'bg-amber-500', Icon: Utensils },
            { bg: 'bg-rose-50 dark:bg-rose-900/20 text-rose-500', bar: 'bg-rose-500', Icon: ShoppingBag },
            { bg: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500', bar: 'bg-indigo-500', Icon: Home },
        ];
        return colorPairs[(id || 0) % colorPairs.length] || { bg: 'bg-zinc-100 text-zinc-500', bar: 'bg-zinc-500', Icon: Package };
    };

    const getTypeLabel = (type: string) => {
        if (type === 'income') return t.categories.income;
        if (type === 'expense') return t.categories.expense;
        return type?.charAt(0).toUpperCase() + type?.slice(1);
    };

    const filteredCategories = categories.filter(c => {
        const matchesTab = activeTab === 'all' || c.type === activeTab;
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            translateCategoryName(c.name).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.categories.title}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.categories.subtitle}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto mt-0 rounded-xl px-5 h-10 bg-gradient-to-br from-zinc-800 to-zinc-950 hover:from-zinc-700 hover:to-zinc-900 text-white shadow-md shadow-zinc-900/20 hover:shadow-lg hover:shadow-zinc-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900 dark:hover:from-white dark:hover:to-zinc-200 dark:shadow-zinc-300/20 border-0 font-medium tracking-wide">
                            <Plus className="mr-2 h-4 w-4" /> {t.categories.addCategory}
                        </Button>
                    </DialogTrigger>
                    <DialogContent
                        onInteractOutside={(e) => {
                            if (isSubmitting) e.preventDefault();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{t.categories.addNewCategory}</DialogTitle>
                            <DialogDescription>{t.categories.addCategoryDesc}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t.common.name}</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Groceries, Salary"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">{t.common.type}</Label>
                                <Select
                                    value={newCategoryType}
                                    onValueChange={(val: 'income' | 'expense') => setNewCategoryType(val)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.common.type} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="expense">{t.categories.expense}</SelectItem>
                                        <SelectItem value="income">{t.categories.income}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                                    {t.common.cancel}
                                </Button>
                                <Button type="submit" disabled={isSubmitting || !newCategoryName.trim()}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmitting ? (t.common.creating || 'Creating...') : t.categories.createCategory}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={(open) => !isEditing && setIsEditDialogOpen(open)}>
                    <DialogContent
                        onInteractOutside={(e) => {
                            if (isEditing) e.preventDefault();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{t.categories.editCategory}</DialogTitle>
                            <DialogDescription>{t.categories.updateCategoryDesc}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditCategory} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t.common.name}</Label>
                                <Input
                                    id="edit-name"
                                    placeholder="e.g., Groceries, Salary"
                                    value={editCategoryName}
                                    onChange={(e) => setEditCategoryName(e.target.value)}
                                    disabled={isEditing}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">{t.common.type}</Label>
                                <Select
                                    value={editCategoryType}
                                    onValueChange={(val: 'income' | 'expense') => setEditCategoryType(val)}
                                    disabled={isEditing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.common.type} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="expense">{t.categories.expense}</SelectItem>
                                        <SelectItem value="income">{t.categories.income}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditing}>
                                    {t.common.cancel}
                                </Button>
                                <Button type="submit" disabled={isEditing || !editCategoryName.trim()}>
                                    {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditing ? (t.common.saving || 'Saving...') : t.common.saveChanges}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search & Filters – chuẩn hóa giống Expenses/Incomes */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        type="search"
                        placeholder={t.common.search || "Search categories..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-slate-50 dark:bg-zinc-900 border-none shadow-none rounded-full w-full"
                    />
                </div>
                <div className="flex bg-slate-50 dark:bg-zinc-800/50 p-1 rounded-xl w-full sm:w-auto gap-1">
                    <Button
                        variant={activeTab === 'all' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 sm:flex-none rounded-lg px-4 sm:px-6 h-9 text-sm ${activeTab === 'all' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                    >
                        {t.common.all || "All"}
                    </Button>
                    <Button
                        variant={activeTab === 'expense' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('expense')}
                        className={`flex-1 sm:flex-none rounded-lg px-4 sm:px-6 h-9 text-sm ${activeTab === 'expense' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                    >
                        {t.categories.expense}
                    </Button>
                    <Button
                        variant={activeTab === 'income' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('income')}
                        className={`flex-1 sm:flex-none rounded-lg px-4 sm:px-6 h-9 text-sm ${activeTab === 'income' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                    >
                        {t.categories.income}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                <div className="hidden md:block overflow-x-auto w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800">
                                <TableHead className="font-bold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider h-12 align-middle">{t.common.name}</TableHead>
                                <TableHead className="font-bold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider h-12 align-middle">{t.common.type}</TableHead>
                                <TableHead className="font-bold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider h-12 align-middle">{t.common.status}</TableHead>
                                <TableHead className="font-bold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right h-12 align-middle">{t.common.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t.categories.noCategories}</TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((category) => {
                                    const catColors = getCategoryColors(category.id);
                                    return (
                                        <TableRow key={category.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                            <TableCell>
                                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{translateCategoryName(category.name)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${category.type === 'income'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                                    }`}>
                                                    {getTypeLabel(category.type)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {category.is_default ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                        <Lock className="h-3.5 w-3.5" />
                                                        {t.categories.defaultBadge}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                        {t.categories.custom}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!category.is_default && (
                                                    <div className="flex items-center justify-end gap-2 text-zinc-400">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">{t.common.openMenu || "Open menu"}</span>
                                                                    <MoreHorizontal className="h-4 w-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openEditCategory(category)}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> {t.common.edit || "Edit"}
                                                                </DropdownMenuItem>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600">
                                                                            <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete || "Delete"}
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>{t.categories.deleteConfirmTitle}</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                {t.categories.deleteConfirmDesc}
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel disabled={deletingId === category.id}>{t.common.cancel}</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={async (e) => {
                                                                                    e.preventDefault();
                                                                                    await handleDeleteCategory(category.id);
                                                                                }}
                                                                                className="bg-rose-500 hover:bg-rose-600 text-white"
                                                                                disabled={deletingId === category.id}
                                                                            >
                                                                                {deletingId === category.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                                {t.common.delete}
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col p-4 gap-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <Skeleton className="h-5 w-[150px]" />
                                <div className="flex items-center gap-2 mt-2">
                                    <Skeleton className="h-5 w-[80px] rounded-full" />
                                    <Skeleton className="h-5 w-[100px] rounded-full" />
                                </div>
                            </div>
                        ))
                    ) : filteredCategories.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center justify-center">
                            <p className="text-zinc-500 font-medium">{t.categories.noCategories}</p>
                        </div>
                    ) : (
                        filteredCategories.map((category) => {
                            const catColors = getCategoryColors(category.id);
                            return (
                                <Card key={category.id} className="overflow-hidden border-zinc-100 dark:border-zinc-800 shadow-sm shadow-zinc-100 dark:shadow-none bg-white dark:bg-zinc-950">
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-base mb-1 leading-tight">
                                                    {translateCategoryName(category.name)}
                                                </h4>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${category.type === 'income'
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                                        }`}>
                                                        {getTypeLabel(category.type)}
                                                    </span>

                                                    {category.is_default ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                            <Lock className="h-3 w-3" />
                                                            {t.categories.defaultBadge}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                            {t.categories.custom}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {!category.is_default && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                                            <span className="sr-only">{t.filters.openMenu}</span>
                                                            <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[160px] rounded-xl shadow-lg">
                                                        <DropdownMenuItem onClick={() => openEditCategory(category)} className="rounded-lg cursor-pointer my-1">
                                                            <Pencil className="mr-2 h-4 w-4" /> {t.common.edit || "Edit"}
                                                        </DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 rounded-lg cursor-pointer my-1">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete || "Delete"}
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t.categories.deleteConfirmTitle}</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t.categories.deleteConfirmDesc}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel disabled={deletingId === category.id}>{t.common.cancel}</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();
                                                                            await handleDeleteCategory(category.id);
                                                                        }}
                                                                        className="bg-rose-500 hover:bg-rose-600 text-white"
                                                                        disabled={deletingId === category.id}
                                                                    >
                                                                        {deletingId === category.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                        {t.common.delete}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl shadow-sm mt-4">
                <div className="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400">
                    {t.filters.showing}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {filteredCategories.length > 0 ? 1 : 0}
                    </span>{' '}
                    {t.filters.to}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{filteredCategories.length}</span>{' '}
                    {t.filters.of}{' '}
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{filteredCategories.length}</span>{' '}
                    {t.filters.results}
                </div>
                <span className="sm:hidden text-sm text-zinc-500 dark:text-zinc-400 font-medium">{filteredCategories.length} {t.filters.results}</span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={true}
                        className="rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal hover:bg-zinc-50 hover:text-zinc-900"
                    >
                        {t.common.previous || "Previous"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={true}
                        className="rounded-full px-4 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-normal hover:bg-zinc-50 hover:text-zinc-900"
                    >
                        {t.common.next || "Next"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
