import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function Bills() {
  const now = new Date();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-destructive/10">
          <svg className="h-6 w-6 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Bills</h2>
          <p className="text-muted-foreground">Track and schedule your regular bills</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bills</CardTitle>
          <CardDescription>Quick glance at upcoming due dates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This is a first-cut page for bills. It will show upcoming recurring bills and allow scheduling payments.</p>
          <div className="mt-4">
            <Button variant="outline">Add a bill (coming soon)</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample bill</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Electric — Due {format(new Date(now.getFullYear(), now.getMonth(), 28), 'PPP')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
