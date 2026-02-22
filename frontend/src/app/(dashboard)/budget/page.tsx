import { Metadata } from 'next';
import { BudgetContent } from './budget-content';

export const metadata: Metadata = {
    title: 'Budget',
};

export default function BudgetPage() {
    return <BudgetContent />;
}
