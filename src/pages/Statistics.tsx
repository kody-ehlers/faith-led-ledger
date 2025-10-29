import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Statistics() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Statistics</h2>
          <p className="text-muted-foreground">Financial insights and trends</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Key metrics and charts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">First cut: placeholder for charts and trend summaries.</p>
        </CardContent>
      </Card>
    </div>
  );
}
