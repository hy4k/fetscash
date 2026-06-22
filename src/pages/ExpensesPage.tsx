import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ExpensesPage() {
  return (
    <div className="page-enter space-y-8">
      <Card>
        <CardHeader><CardTitle>Expense Register</CardTitle></CardHeader>
        <CardContent>
          <p className="text-text-secondary">Expense Register content coming in Stage 5.</p>
        </CardContent>
      </Card>
    </div>
  );
}
