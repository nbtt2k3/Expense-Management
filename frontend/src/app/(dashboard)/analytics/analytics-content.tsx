'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Lightbulb, Award, AlertTriangle, Minus, Download
} from 'lucide-react';
import { expenseApi } from '@/lib/api';
import Loading from './loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CategoryBreakdown {
    category_name: string;
    total_amount: number;
    percentage: number;
}

interface MonthlyTrend {
    month: string; // "YYYY-MM"
    expense: number;
    income: number;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#8b5cf6'];

const MONTH_NAMES: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CustomBarTooltip = ({ active, payload, label, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        const savings = (payload.find((p: any) => p.dataKey === 'income')?.value || 0) -
            (payload.find((p: any) => p.dataKey === 'expense')?.value || 0);
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 shadow-xl text-xs min-w-[160px]">
                <p className="font-bold text-zinc-700 dark:text-zinc-300 mb-2 text-sm">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="font-medium mb-1" style={{ color: entry.fill }}>
                        {entry.name}: {formatCurrency(Number(entry.value)).replace('â‚«', '').trim()} Ä‘
                    </p>
                ))}
                <div className="border-t border-zinc-100 dark:border-zinc-700 mt-2 pt-2">
                    <p className={`font-bold ${savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        Net: {savings >= 0 ? '+' : ''}{formatCurrency(savings).replace('â‚«', '').trim()} Ä‘
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        const { name, value, payload: p } = payload[0];
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 shadow-xl text-xs">
                <p className="font-bold text-zinc-700 dark:text-zinc-200 mb-1">{name}</p>
                <p className="text-zinc-500">{formatCurrency(Number(value)).replace('â‚«', '').trim()} Ä‘</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-200">{p.percentage}%</p>
            </div>
        );
    }
    return null;
};

// â”€â”€â”€ KPI Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KpiCard({
    label, value, subtext, icon: Icon, iconBg, valueColor,
}: {
    label: string; value: string; subtext?: string;
    icon: any; iconBg: string; valueColor: string;
}) {
    return (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-tight">{label}</p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div>
                <p className={`text-xl sm:text-2xl font-black tracking-tight truncate ${valueColor}`}>{value}</p>
                {subtext && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{subtext}</p>}
            </div>
        </div>
    );
}

// â”€â”€â”€ Insight Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InsightCard({ icon: Icon, iconColor, bg, title, description }: {
    icon: any; iconColor: string; bg: string; title: string; description: string;
}) {
    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl ${bg}`}>
            <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AnalyticsContent() {
    const { t, formatCurrency, translateCategoryName } = useLanguage();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const { data: analyticsRes, isLoading } = useQuery({
        queryKey: ['analytics', selectedYear],
        queryFn: () => expenseApi.getAnalytics({ year: Number(selectedYear) })
    });

    const categoryData: CategoryBreakdown[] = (analyticsRes?.data?.category_breakdown || []).map((c: any) => ({
        ...c,
        total_amount: Number(c.total_amount)
    }));
    const trendData: MonthlyTrend[] = (analyticsRes?.data?.monthly_trend || []).map((t: any) => ({
        ...t,
        expense: Number(t.expense),
        income: Number(t.income)
    }));

    const hasData = categoryData.length > 0 || trendData.length > 0;

    const handleExportCSV = () => {
        if (!hasData) return;

        let csvContent = "\uFEFF"; // BOM for UTF-8 compatibility in Excel

        // Section 1: Monthly Trend
        csvContent += "Monthly Trend\nMonth,Income,Expense,Net Savings\n";
        trendData.forEach(row => {
            const savings = row.income - row.expense;
            csvContent += `${row.month},${row.income},${row.expense},${savings}\n`;
        });

        csvContent += "\n";

        // Section 2: Category Breakdown
        csvContent += "Category Breakdown\nCategory,Total Amount,Percentage\n";
        categoryData.forEach(row => {
            csvContent += `"${translateCategoryName(row.category_name)}",${row.total_amount},${row.percentage}%\n`;
        });

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Analytics_Export_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success((t.common as any)?.exportSuccess || "Exported successfully!");
    };

    // â”€â”€ Derived metrics from trendData â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const metrics = useMemo(() => {
        if (trendData.length === 0) return null;

        const totalIncome = trendData.reduce((s, m) => s + m.income, 0);
        const totalExpense = trendData.reduce((s, m) => s + m.expense, 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
        const avgMonthlyExpense = trendData.length > 0 ? totalExpense / trendData.length : 0;
        const avgMonthlyIncome = trendData.length > 0 ? totalIncome / trendData.length : 0;

        const peakExpense = trendData.reduce((a, b) => a.expense > b.expense ? a : b);
        const bestMonth = trendData.reduce((a, b) =>
            (b.income - b.expense) > (a.income - a.expense) ? b : a
        );
        const worstMonth = trendData.reduce((a, b) =>
            (b.income - b.expense) < (a.income - a.expense) ? b : a
        );

        const monthLabel = (m: string) => `${MONTH_NAMES[m.slice(5)] || m.slice(5)} ${m.slice(0, 4)}`;

        // Chart data with formatted labels and savings line
        const chartData = trendData.map(m => ({
            month: `${MONTH_NAMES[m.month.slice(5)] || m.month.slice(5)}`,
            income: m.income,
            expense: m.expense,
            savings: m.income - m.expense,
        }));

        return {
            totalIncome, totalExpense, netSavings, savingsRate,
            avgMonthlyExpense, avgMonthlyIncome,
            peakExpense, bestMonth, worstMonth,
            monthLabel, chartData,
        };
    }, [trendData]);

    const topCategory = categoryData[0] ?? null;

    return (
        <div className="space-y-6">
            {/* â”€â”€ Header â”€â”€ */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t.analytics.title}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {t.analytics.subtitle} <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedYear}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCSV} disabled={!hasData || isLoading} variant="outline" className="h-10 gap-2 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                        <Download className="w-4 h-4" /> {t.analytics.exportCSV}
                    </Button>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[130px] h-10 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm font-semibold">
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

            {isLoading ? (
                <div className="space-y-6 animate-pulse mt-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 flex flex-col justify-between h-[140px]">
                                <div className="flex justify-between items-start mb-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="w-9 h-9 rounded-xl" />
                                </div>
                                <div>
                                    <Skeleton className="h-8 w-32 mb-2" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-7">
                        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 h-[400px]">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <Skeleton className="w-full h-[300px] rounded-xl" />
                        </div>
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 h-[400px]">
                                <Skeleton className="h-6 w-48 mb-6" />
                                <div className="flex items-center justify-center h-[300px]">
                                    <Skeleton className="h-48 w-48 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : !hasData ? (
                <div className="text-center p-20 bg-white dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-4xl mb-3">ðŸ“Š</p>
                    <p className="text-zinc-500 font-medium">{t.analytics.noData} {selectedYear}</p>
                    <p className="text-zinc-400 text-sm mt-1">{t.analytics.noDataSub}</p>
                </div>
            ) : (
                <>
                    {/* â”€â”€ KPI Cards â”€â”€ */}
                    {metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <KpiCard
                                label={t.analytics.totalIncome}
                                value={`${formatCurrency(metrics.totalIncome).replace('₫', '').trim()} đ`}
                                subtext={t.analytics.avgPerMonth.replace('{amount}', `${formatCurrency(metrics.avgMonthlyIncome).replace('₫', '').trim()} đ`)}
                                icon={ArrowUpRight}
                                iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                                valueColor="text-emerald-500"
                            />
                            <KpiCard
                                label={t.analytics.totalExpenses}
                                value={`${formatCurrency(metrics.totalExpense).replace('₫', '').trim()} đ`}
                                subtext={t.analytics.avgPerMonth.replace('{amount}', `${formatCurrency(metrics.avgMonthlyExpense).replace('₫', '').trim()} đ`)}
                                icon={ArrowDownRight}
                                iconBg="bg-rose-50 dark:bg-rose-900/20 text-rose-500"
                                valueColor="text-rose-500"
                            />
                            <KpiCard
                                label={t.analytics.netSavingsLabel}
                                value={`${metrics.netSavings >= 0 ? '+' : ''}${formatCurrency(metrics.netSavings).replace('₫', '').trim()} đ`}
                                subtext={metrics.netSavings >= 0 ? t.analytics.positiveBalance : t.analytics.negativeBalance}
                                icon={metrics.netSavings >= 0 ? TrendingUp : TrendingDown}
                                iconBg={metrics.netSavings >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}
                                valueColor={metrics.netSavings >= 0 ? 'text-blue-500' : 'text-rose-500'}
                            />
                            <KpiCard
                                label={t.analytics.savingsRateLabel}
                                value={`${metrics.savingsRate.toFixed(1)}%`}
                                subtext={
                                    metrics.savingsRate >= 20 ? t.analytics.excellent20 :
                                        metrics.savingsRate >= 10 ? t.analytics.good10 :
                                            metrics.savingsRate >= 0 ? t.analytics.belowTarget : t.analytics.spendingOverIncome
                                }
                                icon={metrics.savingsRate >= 10 ? Award : AlertTriangle}
                                iconBg={metrics.savingsRate >= 10 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}
                                valueColor={metrics.savingsRate >= 20 ? 'text-emerald-500' : metrics.savingsRate >= 10 ? 'text-amber-500' : 'text-rose-500'}
                            />
                        </div>
                    )}

                    {/* â”€â”€ Charts Row â”€â”€ */}
                    <div className="grid gap-6 lg:grid-cols-7">
                        {/* Income vs Expense Bar Chart */}
                        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 min-w-0">
                            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50 mb-1">{t.analytics.incomeVsExpense}</h3>
                            <p className="text-xs text-zinc-400 mb-5">{t.analytics.incomeVsExpenseSub} {selectedYear}</p>
                            <div className="h-[260px] w-full">
                                {isMounted ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics?.chartData ?? []} barGap={4} barCategoryGap="30%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickFormatter={(v) =>
                                                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M`
                                                        : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`
                                                }
                                                axisLine={false}
                                                tickLine={false}
                                                width={45}
                                            />
                                            <Tooltip content={<CustomBarTooltip formatCurrency={formatCurrency} />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(v) => <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{v}</span>}
                                            />
                                            <Bar dataKey="income" fill="#10b981" name={t.analytics.incomeLegend} radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="expense" fill="#ef4444" name={t.analytics.expenseLegend} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="w-full h-full" />}
                            </div>
                        </div>

                        {/* Category Donut */}
                        <div className="lg:col-span-3 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6 min-w-0">
                            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50 mb-1">{t.analytics.expensesByCategory}</h3>
                            <p className="text-xs text-zinc-400 mb-4">{t.analytics.expensesByCategorySub}</p>
                            {categoryData.length === 0 ? (
                                <div className="h-[260px] flex flex-col items-center justify-center text-center text-sm text-zinc-400 p-6 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 mt-2">
                                    <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                        <span className="text-xl">ðŸ©</span>
                                    </div>
                                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t.analytics.noCategoryData}</p>
                                    <p className="text-xs max-w-xs">{t.analytics.noCategoryDataSub}</p>
                                </div>
                            ) : (
                                <div className="h-[260px] w-full">
                                    {isMounted ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                    dataKey="total_amount"
                                                    nameKey="category_name"
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip formatCurrency={formatCurrency} />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <div className="w-full h-full" />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* â”€â”€ Savings Trend Line â”€â”€ */}
                    {metrics && metrics.chartData.length > 1 && (
                        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6">
                            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50 mb-1">{t.analytics.savingsTrend}</h3>
                            <p className="text-xs text-zinc-400 mb-5">{t.analytics.savingsTrendSub}</p>
                            <div className="h-[160px] w-full">
                                {isMounted ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={metrics.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickFormatter={(v) =>
                                                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M`
                                                        : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`
                                                }
                                                axisLine={false}
                                                tickLine={false}
                                                width={45}
                                            />
                                            <Tooltip content={<CustomBarTooltip formatCurrency={formatCurrency} />} />
                                            <Line
                                                type="monotone"
                                                dataKey="savings"
                                                stroke="#3b82f6"
                                                strokeWidth={2.5}
                                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                                activeDot={{ r: 6 }}
                                                name={t.analytics.netSavings}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <div className="w-full h-full" />}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* â”€â”€ Category Breakdown List â”€â”€ */}
                        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6">
                            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50 mb-1">{t.analytics.categoryBreakdown}</h3>
                            <p className="text-xs text-zinc-400 mb-5">{t.analytics.categoryBreakdownSub}</p>

                            {categoryData.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-center text-sm text-zinc-400 p-6 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 mt-2">
                                    <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                                        <span className="text-xl">ðŸ·ï¸</span>
                                    </div>
                                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{t.analytics.noCategoryBreakdown}</p>
                                </div>
                            ) : (
                                <div className="space-y-5 mt-2">
                                    {categoryData.map((item, index) => (
                                        <div key={index} className="space-y-2.5">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-xs font-bold text-zinc-400 w-4 text-right flex-shrink-0">
                                                        #{index + 1}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                                                            {translateCategoryName(item.category_name)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 pl-3 flex-shrink-0">
                                                    <span className="text-xs font-bold text-zinc-500 w-[40px] text-right">
                                                        {item.percentage.toFixed(1)}%
                                                    </span>
                                                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 whitespace-nowrap w-[90px] text-right">
                                                        {formatCurrency(item.total_amount).replace('₫', '').trim()} <span className="text-xs font-bold text-zinc-500 underline decoration-1 underline-offset-2">đ</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min(item.percentage, 100)}%`,
                                                        backgroundColor: COLORS[index % COLORS.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* â”€â”€ Smart Insights â”€â”€ */}
                        {metrics && (
                            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-50">{t.analytics.smartInsights}</h3>
                                </div>
                                <p className="text-xs text-zinc-400 mb-5">{t.analytics.smartInsightsSub} {selectedYear}</p>
                                <div className="space-y-3">
                                    {/* Savings Rate insight */}
                                    {metrics.savingsRate >= 20 ? (
                                        <InsightCard
                                            icon={Award}
                                            iconColor="text-emerald-500"
                                            bg="bg-emerald-50 dark:bg-emerald-900/10"
                                            title={t.analytics.excellentSavings}
                                            description={t.analytics.excellentSavingsDesc.replace('{rate}', metrics.savingsRate.toFixed(1))}
                                        />
                                    ) : metrics.savingsRate >= 0 ? (
                                        <InsightCard
                                            icon={TrendingUp}
                                            iconColor="text-amber-500"
                                            bg="bg-amber-50 dark:bg-amber-900/10"
                                            title={t.analytics.improveSavings}
                                            description={t.analytics.improveSavingsDesc.replace('{rate}', metrics.savingsRate.toFixed(1)).replace('{category}', translateCategoryName(topCategory?.category_name ?? 'N/A'))}
                                        />
                                    ) : (
                                        <InsightCard
                                            icon={AlertTriangle}
                                            iconColor="text-rose-500"
                                            bg="bg-rose-50 dark:bg-rose-900/10"
                                            title={t.analytics.spendingExceedsIncome}
                                            description={t.analytics.spendingExceedsIncomeDesc.replace('{year}', selectedYear)}
                                        />
                                    )}

                                    {/* Peak expense month */}
                                    {metrics.peakExpense && (
                                        <InsightCard
                                            icon={AlertTriangle}
                                            iconColor="text-rose-400"
                                            bg="bg-rose-50 dark:bg-rose-900/10"
                                            title={t.analytics.highestSpending.replace('{month}', metrics.monthLabel(metrics.peakExpense.month))}
                                            description={t.analytics.highestSpendingDesc.replace('{amount}', `${formatCurrency(metrics.peakExpense.expense).replace('â‚«', '').trim()} Ä‘`)}
                                        />
                                    )}

                                    {/* Top category */}
                                    {topCategory && (
                                        <InsightCard
                                            icon={Lightbulb}
                                            iconColor="text-blue-400"
                                            bg="bg-blue-50 dark:bg-blue-900/10"
                                            title={t.analytics.topExpense.replace('{category}', translateCategoryName(topCategory.category_name))}
                                            description={t.analytics.topExpenseDesc
                                                .replace('{category}', translateCategoryName(topCategory.category_name))
                                                .replace('{percent}', topCategory.percentage.toFixed(1))
                                                .replace('{amount}', `${formatCurrency(topCategory.total_amount).replace('â‚«', '').trim()} Ä‘`)}
                                        />
                                    )}

                                    {/* Best month */}
                                    {metrics.bestMonth && (
                                        <InsightCard
                                            icon={Award}
                                            iconColor="text-emerald-500"
                                            bg="bg-emerald-50 dark:bg-emerald-900/10"
                                            title={t.analytics.bestMonth.replace('{month}', metrics.monthLabel(metrics.bestMonth.month))}
                                            description={t.analytics.bestMonthDesc.replace('{amount}', `${formatCurrency(metrics.bestMonth.income - metrics.bestMonth.expense).replace('â‚«', '').trim()} Ä‘`)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

