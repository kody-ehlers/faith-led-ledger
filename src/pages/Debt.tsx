import { useState, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { useFinanceStore, DebtEntry } from "@/store/financeStore";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/calculations";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, Landmark, ChevronDown, ChevronUp, TrendingDown, Heart, Church } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import DatePicker from "@/components/DatePicker";
import { format, addMonths } from "date-fns";
import { SortableCardGrid, getOrdered } from "@/components/SortableCardGrid";

// Amortization row
interface AmortRow {
  month: number;
  date: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function buildAmortization(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  startDate: Date,
  maxMonths = 600,
): { rows: AmortRow[]; willPayOff: boolean } {
  const rows: AmortRow[] = [];
  let remaining = balance;
  const monthlyRate = annualRate / 100 / 12;

  // If payment cannot cover the first month's interest, amortization is impossible.
  const firstInterest = remaining * monthlyRate;
  if (monthlyPayment <= firstInterest + 0.0001 && remaining > 0) {
    return { rows: [], willPayOff: false };
  }

  for (let i = 1; i <= maxMonths && remaining > 0.01; i++) {
    const interestCharge = remaining * monthlyRate;
    const payment = Math.min(monthlyPayment, remaining + interestCharge);
    const principal = payment - interestCharge;
    remaining = Math.max(0, remaining - principal);
    rows.push({
      month: i,
      date: addMonths(startDate, i - 1),
      payment: parseFloat(payment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interestCharge.toFixed(2)),
      balance: parseFloat(remaining.toFixed(2)),
    });
  }
  return { rows, willPayOff: remaining <= 0.01 };
}

export default function Debt() {
  const {
    debts, addDebt, updateDebt, removeDebt, addDebtPayment, assets, addAssetTransaction,
    cardOrders, updateCardOrder,
    walletEnabled,
  } = useFinanceStore();

  const [name, setName] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [minPayment, setMinPayment] = useState<number | null>(null);
  const [interestRate, setInterestRate] = useState<string>("");
  const [termMonths, setTermMonths] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [autopay, setAutopay] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [principalPct, setPrincipalPct] = useState<string>("");
  const [interestPct, setInterestPct] = useState<string>("");
  const [feePct, setFeePct] = useState<string>("");

  // Payment dialog state
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payInterest, setPayInterest] = useState<number | null>(null);
  const [payFee, setPayFee] = useState<number | null>(0);
  const [payAsset, setPayAsset] = useState<string | null>(null);
  const [payDate, setPayDate] = useState<Date>(new Date());

  // Amortization preview dialog
  const [amortTarget, setAmortTarget] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    const pPct = principalPct ? parseFloat(principalPct) : NaN;
    const iPct = interestPct ? parseFloat(interestPct) : NaN;
    const fPct = feePct ? parseFloat(feePct) : NaN;
    addDebt({
      name: name.trim(),
      balance: balance ?? 0,
      originalBalance: balance ?? 0,
      interestRate: interestRate ? parseFloat(interestRate) : 0,
      minimumPayment: minPayment ?? 0,
      termMonths: termMonths ? parseInt(termMonths) : undefined,
      dueDate: startDate.toISOString(),
      notes: notes.trim(),
      assetId: walletEnabled ? (assetId ?? undefined) : undefined,
      autopay,
      principalPct: isNaN(pPct) ? undefined : pPct,
      interestPct: isNaN(iPct) ? undefined : iPct,
      feePct: isNaN(fPct) ? undefined : fPct,
    });
    toast.success("Debt added");
    setName(""); setBalance(null); setMinPayment(null); setInterestRate("");
    setTermMonths(""); setNotes(""); setAssetId(null); setShowForm(false); setAutopay(false);
    setStartDate(new Date());
    setPrincipalPct(""); setInterestPct(""); setFeePct("");
  };

  const openPay = (debtId: string, debtMinPayment: number) => {
    setPayFor(debtId);
    setPayAmount(debtMinPayment);
    const d = debts.find((x) => x.id === debtId);
    // Prefill interest/fee from per-debt percentages if configured
    if (d && (d.interestPct != null || d.feePct != null)) {
      const amt = debtMinPayment || 0;
      setPayInterest(d.interestPct != null ? +(amt * d.interestPct / 100).toFixed(2) : null);
      setPayFee(d.feePct != null ? +(amt * d.feePct / 100).toFixed(2) : 0);
    } else {
      setPayInterest(null);
      setPayFee(0);
    }
    setPayAsset(walletEnabled ? (assets.find((a) => a.type !== "Credit Card")?.id ?? null) : null);
    setPayDate(new Date());
  };

  const confirmPay = () => {
    if (!payFor) return;
    const amt = payAmount ?? 0;
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (walletEnabled && !payAsset) { toast.error("Select a wallet account to pay from"); return; }
    const debt = debts.find((d) => d.id === payFor);
    if (!debt) return;

    // Use the values entered in the dialog (which may have been prefilled
    // from the debt's stored percentages).
    const monthlyRate = debt.interestRate / 100 / 12;
    const computedInterest = debt.balance * monthlyRate;
    const interestPortion = parseFloat(
      (payInterest != null ? payInterest : computedInterest).toFixed(2),
    );
    const feePortion = parseFloat((payFee ?? 0).toFixed(2));
    const principalPortion = parseFloat(
      Math.max(0, amt - interestPortion - feePortion).toFixed(2),
    );

    if (walletEnabled && payAsset) {
      addAssetTransaction(payAsset, {
        date: payDate.toISOString(),
        amount: -amt,
        memo: `Payment to ${debt.name}`,
      });
    }
    addDebtPayment(
      payFor,
      amt,
      walletEnabled && payAsset ? `Payment from wallet` : `Payment`,
      payDate.toISOString(),
      principalPortion,
      interestPortion,
      feePortion,
    );
    toast.success("Payment recorded");
    setPayFor(null);
  };

  const getWalletDisplay = (id: string | null | undefined) => {
    if (!id) return "External Account";
    return assets.find((a) => a.id === id)?.name || "Unknown";
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalPaid = debts.reduce(
    (sum, d) => sum + (d.paymentHistory || []).reduce((s, p) => s + p.amount, 0), 0
  );
  const totalPrincipalPaid = debts.reduce(
    (sum, d) => sum + (d.paymentHistory || []).reduce((s, p) => s + (p.principalPortion || 0), 0), 0
  );
  const totalInterestPaid = debts.reduce(
    (sum, d) => sum + (d.paymentHistory || []).reduce((s, p) => s + (p.interestPortion || 0), 0), 0
  );

  // Payment preview for the pay dialog
  const payPreview = useMemo(() => {
    if (!payFor || !payAmount || payAmount <= 0) return null;
    const debt = debts.find((d) => d.id === payFor);
    if (!debt) return null;
    const monthlyRate = debt.interestRate / 100 / 12;
    const computedInterest = debt.balance * monthlyRate;
    const interestPortion = payInterest != null ? payInterest : computedInterest;
    const feePortion = payFee ?? 0;
    const principalPortion = Math.max(0, payAmount - interestPortion - feePortion);
    const newBalance = Math.max(0, debt.balance - principalPortion);
    return { interestPortion, principalPortion, feePortion, newBalance };
  }, [payFor, payAmount, payInterest, payFee, debts]);

  // Amortization table for selected debt
  const amortDebt = debts.find((d) => d.id === amortTarget);
  const amortResult = useMemo(() => {
    if (!amortDebt) return { rows: [], willPayOff: true };
    const start = amortDebt.dueDate ? new Date(amortDebt.dueDate) : new Date();
    return buildAmortization(
      amortDebt.balance,
      amortDebt.interestRate,
      amortDebt.minimumPayment,
      start,
    );
  }, [amortDebt]);
  const amortTable = amortResult.rows;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-destructive/10">
          <Landmark className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Debt</h2>
          <p className="text-muted-foreground">Manage and pay down debts</p>
        </div>
      </div>


      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Church className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                The wicked borrow and never repay, but the godly are generous givers.
              </p>
              <p className="text-sm text-muted-foreground font-medium">Psalms 37:21 (NLT)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader><CardTitle>Total Owed</CardTitle><CardDescription>All debts combined</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive">{formatCurrency(totalDebt)}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle>Total Paid</CardTitle><CardDescription>All payments made</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold text-success">{formatCurrency(totalPaid)}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle>Principal Paid</CardTitle><CardDescription>Amount reduced from balances</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{formatCurrency(totalPrincipalPaid)}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle>Interest Paid</CardTitle><CardDescription>Cost of borrowing</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive">{formatCurrency(totalInterestPaid)}</p></CardContent>
        </Card>
      </div>

      {/* Add Debt Form */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center justify-between">
            <div><CardTitle>Add Debt</CardTitle><CardDescription>Record a loan or credit balance</CardDescription></div>
            {showForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Balance</Label>
                <CurrencyInput value={balance} onChange={(v) => setBalance(v)} />
              </div>
              <div className="space-y-2">
                <Label>Minimum Payment</Label>
                <CurrencyInput value={minPayment} onChange={(v) => setMinPayment(v)} />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input type="text" inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Term (months, optional)</Label>
                <Input type="text" inputMode="numeric" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={autopay} onCheckedChange={setAutopay} />
                <Label>Autopay Enabled</Label>
              </div>
              {walletEnabled && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Default Payment Wallet</Label>
                  <Select value={assetId ?? "__external"} onValueChange={(v) => setAssetId(v === "__external" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__external">External Account</SelectItem>
                      {assets.filter((a) => a.type !== "Credit Card").map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} • {a.type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button onClick={handleAdd} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <Plus className="h-4 w-4 mr-2" />Add Debt
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Debts List */}
      {debts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No debts recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <SortableCardGrid
          items={getOrdered(debts, cardOrders["debts"])}
          onReorder={(ids) => updateCardOrder("debts", ids)}
          className="grid gap-4 md:grid-cols-2"
          renderItem={(d) => {
            const totalPaidOnDebt = (d.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
            const origBal = d.originalBalance || d.balance + totalPaidOnDebt;
            const paidPercent = origBal > 0 ? Math.min((totalPaidOnDebt / origBal) * 100, 100) : 0;

            return (
              <Card key={d.id} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{d.name}</CardTitle>
                      {d.notes && <CardDescription>{d.notes}</CardDescription>}
                    </div>
                    <span className="text-xl font-bold text-destructive">{formatCurrency(d.balance)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Paid: {formatCurrency(totalPaidOnDebt)}</span>
                      <span>{paidPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Min Payment</div>
                      <div className="font-semibold">{formatCurrency(d.minimumPayment)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                      <div className="font-semibold">{d.interestRate > 0 ? `${d.interestRate}%` : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Paid From</div>
                      <div className="font-semibold text-xs">{getWalletDisplay(d.assetId)}</div>
                    </div>
                  </div>

                  {d.autopay && (
                    <div className="text-xs text-primary font-medium">(Autopay Enabled)</div>
                  )}

                  {/* Recent Payments with principal/interest split */}
                  {d.paymentHistory && d.paymentHistory.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-semibold mb-1">Recent Payments</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {d.paymentHistory.slice().reverse().slice(0, 5).map((p) => (
                          <div key={p.id} className="flex justify-between text-xs">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">{format(new Date(p.date), "MMM d, yyyy")}</span>
                              {(p.principalPortion !== undefined || p.interestPortion !== undefined || p.feePortion !== undefined) && (
                                <span className="text-muted-foreground">
                                  P: {formatCurrency(p.principalPortion ?? 0)} / I: {formatCurrency(p.interestPortion ?? 0)} / F: {formatCurrency(p.feePortion ?? 0)}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-success">-{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openPay(d.id, d.minimumPayment)} className="flex-1">
                      <Plus className="h-4 w-4 mr-1" />Payment
                    </Button>
                    {d.interestRate > 0 && d.minimumPayment > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setAmortTarget(d.id)} className="flex-1">
                        <TrendingDown className="h-4 w-4 mr-1" />Schedule
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { removeDebt(d.id); toast.success("Debt removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }}
        />
      )}

      {/* Pay dialog with preview */}
      <Dialog open={!!payFor} onOpenChange={(open) => { if (!open) setPayFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Debt — {debts.find((d) => d.id === payFor)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {walletEnabled && (
              <div className="space-y-2">
                <Label>From Wallet</Label>
                <Select value={payAsset ?? "__none"} onValueChange={(v) => setPayAsset(v === "__none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Choose</SelectItem>
                    {assets.filter((a) => a.type !== "Credit Card").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} • {a.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput value={payAmount} onChange={(v) => setPayAmount(v)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Interest Portion</Label>
                <CurrencyInput
                  value={payInterest}
                  onChange={(v) => setPayInterest(v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fees / Other</Label>
                <CurrencyInput value={payFee} onChange={(v) => setPayFee(v)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <DatePicker selected={payDate} onSelect={(d) => setPayDate(d)} />
            </div>

            {/* Payment Preview */}
            {payPreview && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="font-semibold text-foreground mb-2">Payment Preview</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goes to Interest:</span>
                    <span className="text-destructive">{formatCurrency(payPreview.interestPortion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goes to Principal:</span>
                    <span className="text-success">{formatCurrency(payPreview.principalPortion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goes to Fees:</span>
                    <span className="text-foreground">{formatCurrency(payPreview.feePortion)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">New Balance:</span>
                    <span className="font-bold text-foreground">{formatCurrency(payPreview.newBalance)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={confirmPay}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amortization Schedule Dialog */}
      <Dialog open={!!amortTarget} onOpenChange={(open) => { if (!open) setAmortTarget(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Amortization Schedule — {amortDebt?.name}</DialogTitle>
          </DialogHeader>
          {amortDebt && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Balance:</span>{" "}
                  <span className="font-semibold">{formatCurrency(amortDebt.balance)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate:</span>{" "}
                  <span className="font-semibold">{amortDebt.interestRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  <span className="font-semibold">{formatCurrency(amortDebt.minimumPayment)}</span>
                </div>
              </div>
              {!amortResult.willPayOff ? (
                <div className="text-sm text-destructive font-medium border border-destructive/30 bg-destructive/5 rounded p-3">
                  The minimum payment ({formatCurrency(amortDebt.minimumPayment)}) is not enough to cover the monthly interest
                  ({formatCurrency((amortDebt.balance * amortDebt.interestRate) / 100 / 12)}).
                  Increase the payment to make progress.
                </div>
              ) : amortTable.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Payoff in <strong>{amortTable.length}</strong> months ({(amortTable.length / 12).toFixed(1)} years) •
                  Total Interest: <strong className="text-destructive">{formatCurrency(amortTable.reduce((s, r) => s + r.interest, 0))}</strong>
                </div>
              )}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amortTable.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>{format(row.date, "MMM yyyy")}</TableCell>
                        <TableCell>{formatCurrency(row.payment)}</TableCell>
                        <TableCell className="text-success">{formatCurrency(row.principal)}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(row.interest)}</TableCell>
                        <TableCell>{formatCurrency(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAmortTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
