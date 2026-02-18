
export interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    created_at: string;
    date: string;
    category_id: number;
    // Derived/Optional
    category?: Category;
    type?: 'income' | 'expense';
}

export interface Income {
    id: string; // UUID
    amount: number;
    source: string;
    description: string;
    date: string; // ISO datetime
    created_at: string;
    category_id?: number;
    category?: Category;
}

export interface CategorySummary {
    category_id: number;
    category_name: string;
    total: number;
}

export interface DailySummary {
    date: string;
    total: number;
}

export interface DashboardSummary {
    total_month: number;
    total_today: number;
    total_year: number;
    total_income_month: number;
    balance: number;
    by_category: CategorySummary[];
    daily: DailySummary[];
}

export interface PaginatedResponse<T> {
    total: number;
    page: number;
    limit: number;
    data: T[];
}

export interface ChartData {
    name: string;
    total: number;
}
