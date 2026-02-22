'use client';

import { useState, useEffect } from 'react';
import { expenseApi } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
import { Plus, Trash2, Lock, Loader2, Pencil, Search } from 'lucide-react';
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.categories.title}</h2>
                    <p className="text-muted-foreground">{t.categories.subtitle}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => !isSubmitting && setIsDialogOpen(open)}>
                    <DialogTrigger asChild>
                        <Button>
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

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={t.common.search}
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-lg w-full sm:w-auto gap-1">
                    <Button
                        variant={activeTab === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('all')}
                        className="flex-1 sm:flex-none"
                    >
                        {t.common.all || "All"}
                    </Button>
                    <Button
                        variant={activeTab === 'expense' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('expense')}
                        className="flex-1 sm:flex-none"
                    >
                        {t.categories.expense}
                    </Button>
                    <Button
                        variant={activeTab === 'income' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('income')}
                        className="flex-1 sm:flex-none"
                    >
                        {t.categories.income}
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.common.name}</TableHead>
                            <TableHead>{t.common.type}</TableHead>
                            <TableHead>{t.common.status}</TableHead>
                            <TableHead className="text-right">{t.common.actions}</TableHead>
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
                            filteredCategories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{translateCategoryName(category.name)}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.type === 'income'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {getTypeLabel(category.type)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {category.is_default ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <Lock className="h-3 w-3" />
                                                {t.categories.defaultBadge}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                {t.categories.custom}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!category.is_default && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                                    onClick={() => openEditCategory(category)}
                                                    disabled={deletingId === category.id}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deletingId === category.id}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
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
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                disabled={deletingId === category.id}
                                                            >
                                                                {deletingId === category.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                {t.common.delete}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
