import { useState } from 'react';
import { useFinanceStore, SubscriptionEntry } from '@/store/financeStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, SquarePen } from 'lucide-react';
import { toast } from 'sonner';

type Frequency = 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export default function Subscriptions() {
  const { subscriptions, addSubscription, removeSubscription, updateSubscription, cancelSubscription, renewSubscription } = useFinanceStore();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  // Editing
  const [editing, setEditing] = useState<SubscriptionEntry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error('Please provide name and valid amount');
      return;
    }

    addSubscription({ name: name.trim(), amount: parsed, frequency, date: date.toISOString(), notes: notes.trim() });
    toast.success('Subscription added');
    setName('');
    setAmount('');
    setFrequency('Monthly');
    setDate(new Date());
    setNotes('');
  };

  const handleRemove = (id: string) => {
    removeSubscription(id);
    toast.success('Subscription removed');
  };

  function SubscriptionCard({ entry }: { entry: SubscriptionEntry }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState<string>(entry.amount.toString());
    const [adjustDate, setAdjustDate] = useState<Date>(new Date());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [cancelStart, setCancelStart] = useState<Date>(new Date());
    const [cancelEnd, setCancelEnd] = useState<Date | null>(null);
    const [cancelIndefinite, setCancelIndefinite] = useState<boolean>(true);
    const [cancelNote, setCancelNote] = useState<string>(entry.cancelledNote ?? "");

    const isCancelledNow = () => {
      if (!entry.cancelledFrom) return false;
      const from = new Date(entry.cancelledFrom);
      const now = new Date();
      if (now < from) return false;
      if (entry.cancelledIndefinitely) return true;
      if (entry.cancelledTo) return now <= new Date(entry.cancelledTo);
      return false;
    };

    const cancelledNow = isCancelledNow();

    return (
      <div className={"flex items-center justify-between p-4 rounded-lg border border-border bg-card"}>
        <div>
          {cancelledNow && (
            <div className="mb-1 text-yellow-700 font-semibold text-sm">Cancelled {entry.cancelledIndefinitely ? '— Indefinitely' : `until ${entry.cancelledTo ? format(new Date(entry.cancelledTo), 'PPP') : ''}`}
              {entry.cancelledNote && <span className="ml-2 text-sm text-muted-foreground italic">({entry.cancelledNote})</span>}
            </div>
          )}
          <p className="font-semibold">{entry.name}</p>
          <p className="text-sm text-muted-foreground">{entry.frequency} • {format(new Date(entry.date), 'PPP')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-semibold">${entry.amount.toFixed(2)}</div>

          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.65 0 1.2-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.31 3.46A2 2 0 0 1 7.14.64l.06.06c.5.51 1.12.88 1.82.98.49.08.95.34 1.26.74.31.4.41.91.3 1.39-.07.34-.02.69.14.99.3.59.94.96 1.61.96.67 0 1.31-.37 1.61-.96.16-.3.21-.65.14-.99-.11-.48-.01-.99.3-1.39.31-.4.77-.66 1.26-.74.7-.1 1.32-.47 1.82-.98l.06-.06A2 2 0 0 1 22 4.31l-.06.06c-.51.5-.88 1.12-.98 1.82-.08.49-.34.95-.74 1.26-.4.31-.91.41-1.39.3-.34-.07-.69-.02-.99.14-.59.3-.96.94-.96 1.61 0 .67.37 1.31.96 1.61.3.16.65.21.99.14.48-.11.99-.01 1.39.3.4.31.66.77.74 1.26.1.7.47 1.32.98 1.82l.06.06A2 2 0 0 1 19.4 15z"/></svg>
          </Button>

          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemove(entry.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Settings dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Subscription Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Quick actions for this subscription</p>
              <div className="grid gap-2">
                <Button variant="outline" onClick={() => { setIsSettingsOpen(false); setEditing(entry); setIsEditOpen(true); }}>
                  <SquarePen className="mr-2 h-4 w-4" /> Edit
                </Button>

                <Button variant="outline" onClick={() => { setIsSettingsOpen(false); setAdjustAmount(entry.amount.toString()); setAdjustDate(new Date()); setIsAdjustOpen(true); }}>
                  <SquarePen className="mr-2 h-4 w-4" /> Adjust Amount
                </Button>

                <Button variant="outline" onClick={() => { setIsSettingsOpen(false); setIsHistoryOpen(true); }}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  View History
                </Button>

                {cancelledNow ? (
                  <Button variant="outline" onClick={() => { renewSubscription(entry.id); toast.success('Subscription renewed'); setIsSettingsOpen(false); }}>
                    Renew Subscription
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => { setIsSettingsOpen(false); setCancelStart(new Date()); setCancelEnd(null); setCancelIndefinite(true); setCancelNote(''); setIsCancelOpen(true); }}>
                    Cancel / Pause Subscription
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Subscription Amount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input className="pl-6" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} inputMode="decimal" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{format(adjustDate, 'PPP')}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar mode="single" selected={adjustDate} onSelect={(d) => d && setAdjustDate(d)} />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">If the date is in the future, the current amount will stop the day before and a new amount will start on the effective date.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                const parsed = parseFloat(adjustAmount);
                if (isNaN(parsed) || parsed <= 0) { toast.error('Please enter a valid amount'); return; }
                const eff = adjustDate;
                const effStart = new Date(eff.getFullYear(), eff.getMonth(), eff.getDate(), 12, 0, 0, 0);
                const todayStart = new Date(); todayStart.setHours(12,0,0,0);
                const prevChanges = entry.changes ? entry.changes.map(c => ({...c})) : [];
                const kept = prevChanges.filter(ch => new Date(ch.start) < effStart);
                if (kept.length > 0) {
                  const lastKept = kept[kept.length - 1];
                  if (!lastKept.end) lastKept.end = subDays(effStart, 1).toISOString();
                }
                kept.push({ amount: parsed, start: effStart.toISOString(), end: null });
                if (effStart.getTime() <= todayStart.getTime()) {
                  updateSubscription(entry.id, { amount: parsed, changes: kept });
                  toast.success('Subscription amount updated');
                } else {
                  updateSubscription(entry.id, { changes: kept });
                  toast.success('Subscription amount scheduled');
                }
                setIsAdjustOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Amount History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {entry.changes && entry.changes.length > 0 ? (
                entry.changes.map((ch, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{format(new Date(ch.start), 'PPP')}</p>
                      <p className="text-sm text-muted-foreground">{ch.end ? format(new Date(ch.end), 'PPP') : 'to now'}</p>
                    </div>
                    <div className="font-semibold">${ch.amount.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No history available</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel dialog */}
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel / Pause Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{format(cancelStart, 'PPP')}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar mode="single" selected={cancelStart} onSelect={(d) => d && setCancelStart(d)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={cancelIndefinite}>{cancelEnd ? format(cancelEnd, 'PPP') : 'Pick an end date'}</Button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" className="w-auto p-0">
                      <Calendar mode="single" selected={cancelEnd ?? undefined} onSelect={(d) => d && setCancelEnd(d)} />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={cancelIndefinite} onChange={(e) => setCancelIndefinite(e.target.checked)} />
                    <span className="text-sm text-muted-foreground">Indefinite</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Input value={cancelNote} onChange={(e) => setCancelNote(e.target.value.slice(0,200))} placeholder="Why cancel or pause?" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                cancelSubscription(entry.id, cancelStart.toISOString(), cancelIndefinite ? null : cancelEnd ? cancelEnd.toISOString() : null, cancelIndefinite, cancelNote || undefined);
                toast.success('Subscription cancelled/paused');
                setIsCancelOpen(false);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Subscriptions</h2>
          <p className="text-muted-foreground">Manage recurring subscriptions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Subscription</CardTitle>
          <CardDescription>Record a recurring subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Netflix" />
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input className="pl-6" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v: Frequency) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">{format(date, 'PPP')}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                  </PopoverContent>
                </Popover>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 200))} placeholder="optional notes" />
            </div>
          </div>

          <Button className="w-full" onClick={handleAdd}>Add Subscription</Button>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>Active and cancelled subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-muted-foreground">No subscriptions yet.</p>
          ) : (
            subscriptions.map((s) => <SubscriptionCard key={s.id} entry={s} />)
          )}
        </CardContent>
      </Card>

      {/* Edit dialog (simplified for name/notes) */}
      {editing && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { if (editing) { updateSubscription(editing.id, { name: editing.name, notes: editing.notes }); toast.success('Subscription updated'); setIsEditOpen(false); setEditing(null); } }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
