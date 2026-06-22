import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="page-enter space-y-8">
      <Card>
        <CardHeader><CardTitle>Dashboard</CardTitle></CardHeader>
        <CardContent>
          <p className="text-text-secondary">Dashboard content coming in Stage 5.</p>
        </CardContent>
      </Card>
    </div>
  );
}
