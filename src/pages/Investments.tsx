import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type Investment = { id: string; name: string; currentAmount: number };

const STORAGE_KEY = 'app.investments.v1';

export default function Investments() {
  const [items, setItems] = useState<Investment[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);

  const persist = (next: Investment[]) => { setItems(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };

  const handleAdd = () => {
    const amt = parseFloat(amount || '0');
    if (!name.trim()) { toast.error('Enter a name'); return; }
    const next = [...items, { id: crypto.randomUUID(), name: name.trim(), currentAmount: amt }];
    persist(next); toast.success('Investment added'); setName(''); setAmount('');
  };

  const handleRemove = (id: string) => { const next = items.filter(i => i.id !== id); persist(next); toast.success('Removed'); };

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
          <CardTitle>Add Investment (manual)</CardTitle>
          <CardDescription>Record a holding or account balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Value</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>Add Investment</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Investments</CardTitle>
          <CardDescription>Manual holdings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground">No investments recorded.</p>
          ) : items.map(it => (
            <div key={it.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="font-semibold">{it.name}</p>
                <p className="text-sm text-muted-foreground">Value: ${it.currentAmount.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => handleRemove(it.id)} className="text-destructive">Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
