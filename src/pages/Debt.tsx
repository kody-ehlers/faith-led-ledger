import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { toast } from 'sonner';

export default function Debt() {
  const { debts, addDebt, updateDebt, removeDebt } = useFinanceStore();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [minPayment, setMinPayment] = useState('');

  const handleAdd = () => {
    const bal = parseFloat(balance || '0');
    const min = parseFloat(minPayment || '0');
    if (!name.trim()) { toast.error('Enter a name'); return; }
    addDebt({ name: name.trim(), balance: bal, interestRate: 0, minimumPayment: min, dueDate: new Date().toISOString() });
    toast.success('Debt added');
    setName(''); setBalance(''); setMinPayment('');
  };

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
          <CardTitle>Add Debt</CardTitle>
          <CardDescription>Record a loan or credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Balance</Label>
              <Input value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Minimum Payment</Label>
              <Input value={minPayment} onChange={(e) => setMinPayment(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>Add Debt</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Active Debts</CardTitle>
          <CardDescription>Outstanding balances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {debts.length === 0 ? (
            <p className="text-muted-foreground">No debts recorded.</p>
          ) : debts.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-muted-foreground">Min: ${d.minimumPayment.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">${d.balance.toFixed(2)}</div>
                <Button variant="ghost" onClick={() => { updateDebt(d.id, { balance: Math.max(0, d.balance - d.minimumPayment) }); toast.success('Applied minimum payment (demo)'); }}>Apply Min</Button>
                <Button variant="ghost" className="text-destructive" onClick={() => { removeDebt(d.id); toast.success('Debt removed'); }}>Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
