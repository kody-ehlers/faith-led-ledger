import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useFinanceStore, type LiquidAsset } from '@/store/financeStore';
import { formatCurrency } from '@/utils/calculations';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function Wallet() {
  const { assets, addAsset, removeAsset } = useFinanceStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<'Cash' | 'Checking' | 'Savings' | 'Credit Card' | 'Other'>('Checking');
  const [startingAmount, setStartingAmount] = useState<number>(0);
  const [enactDate, setEnactDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [paymentDueDay, setPaymentDueDay] = useState<number | ''>('');

  const handleAdd = () => {
    if (!name.trim()) { toast.error('Enter a name'); return; }
    addAsset({ name: name.trim(), type, startingAmount: Number(startingAmount || 0), enactDate: enactDate ? new Date(enactDate).toISOString() : undefined, creditLimit: creditLimit === '' ? null : Number(creditLimit), paymentDueDay: paymentDueDay === '' ? null : Number(paymentDueDay) });
    toast.success('Wallet item added');
    setName('');
    setStartingAmount(0);
    setCreditLimit('');
    setPaymentDueDay('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Wallet</h2>
          <p className="text-muted-foreground">Manage checking, savings, and credit card accounts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Wallet Item</CardTitle>
          <CardDescription>Add an account to track balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(v) => setType(v as LiquidAsset['type'])}>
                <SelectTrigger>
                  <SelectValue placeholder={type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Checking">Checking</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Starting Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input className="pl-6" type="number" value={startingAmount} onChange={(e) => setStartingAmount(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enact Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">{enactDate ? format(new Date(enactDate), 'PPP') : 'Pick a date'}</Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar mode="single" selected={new Date(enactDate)} onSelect={(d) => d && setEnactDate(d.toISOString().slice(0,10))} />
                </PopoverContent>
              </Popover>
            </div>

            {type === 'Credit Card' && (
              <>
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input type="number" value={creditLimit === '' ? '' : creditLimit} onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Due Day (1-28)</Label>
                  <Input type="number" min={1} max={28} value={paymentDueDay === '' ? '' : paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </>
            )}

          </div>

          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>Add Account</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{a.name} <small className="text-muted-foreground">{a.type}</small></span>
                <span className="font-semibold">{formatCurrency(a.currentAmount || 0)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">Enacted: {a.enactDate ? new Date(a.enactDate).toLocaleDateString() : '—'}</div>
              {a.type === 'Credit Card' && (
                <div className="text-sm text-muted-foreground mb-2">Limit: {a.creditLimit ? formatCurrency(a.creditLimit) : '—'} • Due day: {a.paymentDueDay ?? '—'}</div>
              )}

              <div className="mt-4">
                <div className="text-xs text-muted-foreground">Recent transactions</div>
                <div className="mt-2 space-y-1">
                  {(a.transactions || []).slice().reverse().slice(0,5).map((t) => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <div>{new Date(t.date).toLocaleDateString()} {t.memo ? `• ${t.memo}` : ''}</div>
                      <div className={t.amount >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(t.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm('Remove this account? This will delete its transactions.')) { removeAsset(a.id); toast.success('Account removed'); } }}>Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
