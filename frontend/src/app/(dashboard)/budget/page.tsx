import { Metadata } from 'next';
import { BudgetContent } from './budget-content';

export const metadata: Metadata = {
    title: 'Budget',
};

export default function BudgetPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
            </div>
            <BudgetContent />
        </div>
    );
}
