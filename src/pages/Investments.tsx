import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Investments() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-emerald/10">
          <svg className="h-6 w-6 text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Investments</h2>
          <p className="text-muted-foreground">View your investment accounts and performance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
          <CardDescription>Holdings and quick stats</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">First cut: a summary card and placeholders for account details.</p>
          <div className="mt-4">
            <Button variant="outline">Connect account (coming soon)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
