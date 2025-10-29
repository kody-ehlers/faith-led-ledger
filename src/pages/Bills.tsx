import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { toast } from 'sonner';

export default function Bills() {
  const { expenses, addExpense, removeExpense } = useFinanceStore();
  const bills = expenses.filter(e => e.category === 'bill');

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) { toast.error('Please provide name and valid amount'); return; }
    addExpense({ name: name.trim(), amount: parsed, category: 'bill', date: date.toISOString(), type: 'need' });
    toast.success('Bill added');
    setName(''); setAmount(''); setDate(new Date());
  };

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
          <CardTitle>Add Bill</CardTitle>
          <CardDescription>Record an upcoming bill</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input className="pl-6" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">{format(date, 'PPP')}</Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleAdd} className="w-full">Add Bill</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Upcoming Bills</CardTitle>
          <CardDescription>Your recorded bills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bills.length === 0 ? (
            <p className="text-muted-foreground">No bills recorded.</p>
          ) : bills.map(b => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
              <div>
                <p className="font-semibold">{b.name}</p>
                <p className="text-sm text-muted-foreground">Due {format(new Date(b.date), 'PPP')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(b.amount)}</div>
                <Button variant="ghost" size="icon" onClick={() => { removeExpense(b.id); toast.success('Bill marked as paid/removed'); }} className="text-success">Paid</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
