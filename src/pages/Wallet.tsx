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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function Wallet() {
  const { assets, addAsset, removeAsset, updateAsset, removeAssetTransaction } = useFinanceStore();

  // Helpers to normalize and parse date-only strings safely
  const normalizeDateOnly = (d?: string | null) => {
    if (!d) return '';
    return d.includes('T') ? d.slice(0, 10) : d;
  };

  const parseDateSafe = (d?: string | null) => {
    const s = normalizeDateOnly(d);
    if (!s) return new Date();
    return new Date(s + 'T12:00:00');
  };

  const [name, setName] = useState('');
  const [type, setType] = useState<'Cash' | 'Checking' | 'Savings' | 'Credit Card'>('Checking');
  // Keep these as strings to make it easy to clear fields in the UI
  const [startingAmount, setStartingAmount] = useState<string>('');
  const [enactDate, setEnactDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [paymentDueDay, setPaymentDueDay] = useState<string>('');
  const [isEnactOpen, setIsEnactOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  // Adjust Credit Limit dialog state
  const [adjustTarget, setAdjustTarget] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().slice(0,10));

  const handleAdd = () => {
    if (!name.trim()) { toast.error('Enter a name'); return; }
    const starting = startingAmount === '' ? 0 : Number(startingAmount);
    // store enactDate as a date-only YYYY-MM-DD string
    addAsset({ name: name.trim(), type, startingAmount: Number(starting || 0), enactDate: enactDate || undefined, creditLimit: creditLimit === '' ? null : Number(creditLimit), paymentDueDay: paymentDueDay === '' ? null : Number(paymentDueDay) });
    toast.success('Wallet item added');
    setName('');
    setStartingAmount('');
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
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Checking">Checking</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Starting Balance for non-Other account types */}
            {/** Show starting balance for Cash/Checking/Savings/Credit Card */}
            {type !== undefined && (
              <div className="space-y-2">
                <Label>Starting Balance</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input className="pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" value={startingAmount} onChange={(e) => setStartingAmount(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date First Available</Label>
              <Popover open={isEnactOpen} onOpenChange={setIsEnactOpen}>
                    <PopoverTrigger asChild>
                      <Button className="w-full justify-start text-left font-normal" variant="outline">{enactDate ? format(parseDateSafe(enactDate), 'PPP') : 'Pick a date'}</Button>
                    </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseDateSafe(enactDate)}
                      onSelect={(d) => {
                        if (d) {
                          // store date-only in YYYY-MM-DD to avoid TZ shifts
                          setEnactDate(d.toISOString().slice(0,10));
                          setIsEnactOpen(false);
                        }
                      }}
                    />
                </PopoverContent>
              </Popover>
            </div>

            {type === 'Credit Card' && (
              <>
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input className="pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" value={creditLimit === '' ? '' : creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Due Date (1-28)</Label>
                  <Input className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" min={1} max={28} value={paymentDueDay === '' ? '' : paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)} />
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
                <span>
                  {a.name} <small className="text-muted-foreground">{a.type}{a.closed ? ' • Closed' : ''}</small>
                </span>
                {/* Display balances: credit cards show negative only when balance < 0; zero or positive show without negative */}
                {(() => {
                  const raw = a.currentAmount ?? 0;
                  // If credit card, keep stored sign (negative means owed). Only force negative when < 0.
                  const display = raw;
                  const cls = display < 0 ? 'text-destructive' : 'text-success';
                  return <span className={`font-semibold ${cls}`}>{formatCurrency(display)}</span>;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">Enacted: {a.enactDate ? parseDateSafe(a.enactDate).toLocaleDateString() : '—'}</div>
              {a.type === 'Credit Card' && (
                <div className="text-sm text-muted-foreground mb-2">Limit: {a.creditLimit ? formatCurrency(a.creditLimit) : '—'} • Due day: {a.paymentDueDay ?? '—'}</div>
              )}

              {/* Only show transactions for Credit Card accounts */}
              {a.type === 'Credit Card' && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">Recent transactions</div>
                  <div className="mt-2 space-y-1">
                    {(a.transactions || []).slice().reverse().slice(0,5).map((t) => (
                      <div key={t.id} className="flex justify-between text-sm items-center">
                        <div>{new Date(t.date).toLocaleDateString()} {t.memo ? `• ${t.memo}` : ''}</div>
                        <div className="flex items-center gap-3">
                          <div className={t.amount >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(t.amount)}</div>
                          {/* allow removing recent transactions for credit card accounts */}
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Remove this transaction?')) { removeAssetTransaction(a.id, t.id); toast.success('Transaction removed'); } }}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!a.closed && (
                  <Button variant="outline" onClick={() => { updateAsset(a.id, { closed: true }); toast.success('Account closed — no further transactions allowed'); }}>Close Account</Button>
                )}
                {a.type === 'Credit Card' && (
                  <Button variant="outline" onClick={() => { setAdjustTarget(a.id); setAdjustAmount(a.creditLimit?.toString() ?? ''); setAdjustDate(a.enactDate ?? new Date().toISOString().slice(0,10)); setAdjustOpen(true); }}>
                    Adjust Limit
                  </Button>
                )}
                <Button variant="ghost" className="text-destructive" onClick={() => { setRemoveTarget(a.id); setIsRemoveOpen(true); }}>Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {/* Remove confirmation dialog */}
        <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Account</DialogTitle>
            </DialogHeader>
            <div className="py-2">Removing this account will permanently delete its transaction history. This action cannot be undone.</div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsRemoveOpen(false)}>Cancel</Button>
              <Button className="bg-destructive text-white" onClick={() => { if (removeTarget) { removeAsset(removeTarget); toast.success('Account removed'); } setIsRemoveOpen(false); }}>Remove Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Adjust Credit Limit dialog */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Credit Limit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Limit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input className="pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{adjustDate ? format(new Date(adjustDate + 'T12:00:00'), 'PPP') : 'Pick a date'}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar mode="single" selected={parseDateSafe(adjustDate)} onSelect={(d) => { if (d) { setAdjustDate(d.toISOString().slice(0,10)); } }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!adjustTarget) return;
                const parsed = Number(adjustAmount);
                if (Number.isNaN(parsed)) { toast.error('Enter a valid amount'); return; }
                updateAssetCreditLimit(adjustTarget, parsed, adjustDate);
                toast.success('Credit limit adjusted');
                setAdjustOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
