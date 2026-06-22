import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function InvoicesPage() {
  return (
    <div className="page-enter space-y-8">
      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          <p className="text-text-secondary">Invoices content coming in Stage 5.</p>
        </CardContent>
      </Card>
    </div>
  );
}
