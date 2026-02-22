'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { ArrowDownIcon, ArrowUpIcon, Wallet } from 'lucide-react';
import { expenseApi } from '@/lib/api';
import { DashboardSummary, Expense } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import Loading from './loading';

export default function DashboardPage() {
    const { t, locale, formatCurrency, translateCategoryName } = useLanguage();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const summaryRes = await expenseApi.getMonthlySummary();
                setSummary(summaryRes.data);

                const transactionsRes = await expenseApi.getExpenses({ limit: 5, sort: 'date_desc' });
                setRecentTransactions(transactionsRes.data.data || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const chartData = summary?.daily?.map((d) => {
        const date = new Date(d.date);
        return {
            name: date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' }),
            total: Number(d.total) || 0,
        };
    }) || [];

    const totalExpense = Number(summary?.total_month) || 0;
    const totalIncome = Number(summary?.total_income_month) || 0;
    const balance = Number(summary?.balance) || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h2>
                </div>
            </div>

            {loading ? (
                <Loading />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t.dashboard.monthlyIncome}</CardTitle>
                                <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(totalIncome)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t.dashboard.thisMonth}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t.dashboard.monthlyExpenses}</CardTitle>
                                <ArrowDownIcon className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-rose-600">
                                    {formatCurrency(totalExpense)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t.dashboard.today}: {formatCurrency(Number(summary?.total_today) || 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t.dashboard.balance}</CardTitle>
                                <Wallet className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                    {formatCurrency(balance)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t.dashboard.incomeMinusExpenses}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>{t.dashboard.dailySpending}</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {chartData.length > 0 ? (
                                    <Overview data={chartData} />
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">{t.dashboard.noSpendingData}</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>{t.dashboard.recentTransactions}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentTransactions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t.dashboard.noRecentTransactions}</p>
                                    ) : (
                                        recentTransactions.map((transaction) => (
                                            <div key={transaction.id} className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{transaction.description || t.common.noDescription}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(transaction.date).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
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

                    {summary?.by_category && summary.by_category.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t.dashboard.spendingByCategory}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {summary.by_category.map((cat) => {
                                        const pct = totalExpense > 0 ? (Number(cat.total) / totalExpense) * 100 : 0;
                                        return (
                                            <div key={cat.category_id} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{translateCategoryName(cat.category_name)}</span>
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
                </>
            )}
        </div>
    );
}
