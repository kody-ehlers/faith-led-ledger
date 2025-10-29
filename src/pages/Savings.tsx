import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Savings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M3 10h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Savings</h2>
          <p className="text-muted-foreground">Monitor savings goals and progress</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Savings Accounts</CardTitle>
          <CardDescription>Overview of current balances</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">First cut: list of accounts and quick-add.</p>
          <div className="mt-4">
            <Button variant="outline">Add savings account (coming soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
