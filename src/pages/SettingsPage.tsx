import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="page-enter space-y-8">
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-text-secondary">Settings content coming in Stage 5.</p>
        </CardContent>
      </Card>
    </div>
  );
}
