'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { ArrowDownIcon, ArrowUpIcon, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DashboardSummary, Expense, PaginatedResponse } from '@/types';

export default function DashboardPage() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch summary from real API
                const summaryRes = await api.get('/expenses/summary/monthly');
                setSummary(summaryRes.data);

                // Fetch recent transactions (paginated response)
                const transactionsRes = await api.get<PaginatedResponse<Expense>>('/expenses?limit=5&sort=date_desc');
                setRecentTransactions(transactionsRes.data.data || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Transform daily spending data for chart
    const chartData = summary?.daily?.map((d) => {
        const date = new Date(d.date);
        return {
            name: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            total: Number(d.total) || 0,
        };
    }) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const totalExpense = Number(summary?.total_month) || 0;
    const totalIncome = Number(summary?.total_income_month) || 0;
    const balance = Number(summary?.balance) || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                        <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(totalIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
                        <ArrowDownIcon className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            {formatCurrency(totalExpense)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Today: {formatCurrency(Number(summary?.total_today) || 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {formatCurrency(balance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Income − Expenses
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Daily Spending</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {chartData.length > 0 ? (
                            <Overview data={chartData} />
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No spending data this month.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent transactions.</p>
                            ) : (
                                recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{transaction.description || 'No description'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(transaction.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="font-medium text-rose-600">
                                            -{formatCurrency(Number(transaction.amount))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            {summary?.by_category && summary.by_category.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {summary.by_category.map((cat) => {
                                const pct = totalExpense > 0 ? (Number(cat.total) / totalExpense) * 100 : 0;
                                return (
                                    <div key={cat.category_id} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{cat.category_name}</span>
                                            <span className="text-muted-foreground">{formatCurrency(Number(cat.total))} ({pct.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
