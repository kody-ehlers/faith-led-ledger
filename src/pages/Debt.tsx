import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Debt() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-destructive/10">
          <svg className="h-6 w-6 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M6 10h12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Debt</h2>
          <p className="text-muted-foreground">Manage and pay down debts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Debts</CardTitle>
          <CardDescription>Overview of loans and credit balances</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">First cut: list of outstanding debts and quick actions.</p>
          <div className="mt-4">
            <Button variant="outline">Add debt (coming soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
