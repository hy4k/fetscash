import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function CustomersPage() {
  return (
    <div className="page-enter space-y-8">
      <Card>
        <CardHeader><CardTitle>Clients</CardTitle></CardHeader>
        <CardContent>
          <p className="text-text-secondary">Clients content coming in Stage 5.</p>
        </CardContent>
      </Card>
    </div>
  );
}
