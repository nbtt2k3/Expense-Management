'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { expenseApi } from '@/lib/api';
import Loading from './loading';

interface CategoryBreakdown {
    category_name: string;
    total_amount: number;
    percentage: number;
}

interface MonthlyTrend {
    month: string;
    expense: number;
    income: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export function AnalyticsContent() {
    const { t, formatCurrency, translateCategoryName } = useLanguage();
    const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
    const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const response = await expenseApi.getAnalytics();
                setCategoryData(response.data.category_breakdown);
                setTrendData(response.data.monthly_trend);
            } catch (error) {
                toast.error(t.analytics.fetchFailed);
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t.analytics.title}</h2>
                </div>
            </div>

            {isLoading && categoryData.length === 0 ? (
                <Loading />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>{t.analytics.incomeVsExpense}</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                            <Legend />
                                            <Bar dataKey="income" fill="#10b981" name={t.analytics.incomeLegend} />
                                            <Bar dataKey="expense" fill="#ef4444" name={t.analytics.expenseLegend} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>{t.analytics.expensesByCategory}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ category_name, percent }: any) => `${translateCategoryName(category_name)} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="total_amount"
                                                nameKey="category_name"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {categoryData.length > 0 && (
                        <div className="grid gap-4 grid-cols-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.analytics.categoryBreakdown}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {categoryData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className="text-sm font-medium">{translateCategoryName(item.category_name)}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-neutral-500">{item.percentage}%</span>
                                                    <span className="text-sm font-bold">{formatCurrency(item.total_amount)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
