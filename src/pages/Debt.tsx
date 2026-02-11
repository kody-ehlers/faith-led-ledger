import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { useFinanceStore, DebtEntry } from "@/store/financeStore";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/calculations";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, Landmark, ChevronDown, ChevronUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Amortization row
interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function buildAmortization(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  maxMonths = 360
): AmortRow[] {
  const rows: AmortRow[] = [];
  let remaining = balance;
  const monthlyRate = annualRate / 100 / 12;
  for (let i = 1; i <= maxMonths && remaining > 0.01; i++) {
    const interestCharge = remaining * monthlyRate;
    const payment = Math.min(monthlyPayment, remaining + interestCharge);
    const principal = payment - interestCharge;
    remaining = Math.max(0, remaining - principal);
    rows.push({
      month: i,
      payment: parseFloat(payment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interestCharge.toFixed(2)),
      balance: parseFloat(remaining.toFixed(2)),
    });
  }
  return rows;
}

export default function Debt() {
  const {
    debts,
    addDebt,
    updateDebt,
    removeDebt,
    addDebtPayment,
    assets,
    addAssetTransaction,
  } = useFinanceStore();

  const [name, setName] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [minPayment, setMinPayment] = useState<number | null>(null);
  const [interestRate, setInterestRate] = useState<string>("");
  const [termMonths, setTermMonths] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Payment dialog state
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payAsset, setPayAsset] = useState<string | null>(null);

  // Amortization preview dialog
  const [amortTarget, setAmortTarget] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    addDebt({
      name: name.trim(),
      balance: balance ?? 0,
      originalBalance: balance ?? 0,
      interestRate: interestRate ? parseFloat(interestRate) : 0,
      minimumPayment: minPayment ?? 0,
      termMonths: termMonths ? parseInt(termMonths) : undefined,
      dueDate: new Date().toISOString(),
      notes: notes.trim(),
      assetId: assetId ?? undefined,
    });
    toast.success("Debt added");
    setName("");
    setBalance(null);
    setMinPayment(null);
    setInterestRate("");
    setTermMonths("");
    setNotes("");
    setAssetId(null);
    setShowForm(false);
  };

  const openPay = (debtId: string, debtMinPayment: number) => {
    setPayFor(debtId);
    setPayAmount(debtMinPayment);
    setPayAsset(assets.find((a) => a.type !== "Credit Card")?.id ?? null);
  };

  const confirmPay = () => {
    if (!payFor) return;
    const amt = payAmount ?? 0;
    if (amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!payAsset) {
      toast.error("Select a wallet account to pay from");
      return;
    }
    const debt = debts.find((d) => d.id === payFor);
    if (!debt) return;
    addAssetTransaction(payAsset, {
      date: new Date().toISOString(),
      amount: -amt,
      memo: `Payment to ${debt.name}`,
    });
    addDebtPayment(payFor, amt, `Payment from wallet`);
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
    (sum, d) => sum + (d.paymentHistory || []).reduce((s, p) => s + p.amount, 0),
    0
  );

  // Payment preview for the pay dialog
  const payPreview = useMemo(() => {
    if (!payFor || !payAmount || payAmount <= 0) return null;
    const debt = debts.find((d) => d.id === payFor);
    if (!debt) return null;
    const monthlyRate = debt.interestRate / 100 / 12;
    const interestPortion = debt.balance * monthlyRate;
    const principalPortion = Math.max(0, payAmount - interestPortion);
    const newBalance = Math.max(0, debt.balance - principalPortion);
    return { interestPortion, principalPortion, newBalance };
  }, [payFor, payAmount, debts]);

  // Amortization table for selected debt
  const amortDebt = debts.find((d) => d.id === amortTarget);
  const amortTable = useMemo(() => {
    if (!amortDebt) return [];
    return buildAmortization(
      amortDebt.balance,
      amortDebt.interestRate,
      amortDebt.minimumPayment
    );
  }, [amortDebt]);

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Owed</CardTitle>
            <CardDescription>All debts combined</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {formatCurrency(totalDebt)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Paid</CardTitle>
            <CardDescription>All payments made</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Monthly Minimums</CardTitle>
            <CardDescription>Combined minimum payments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(totalMinPayments)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Debt Form */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Debt</CardTitle>
              <CardDescription>Record a loan or credit balance</CardDescription>
            </div>
            {showForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g., Student Loan" value={name} onChange={(e) => setName(e.target.value)} />
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
                <Input type="text" inputMode="decimal" placeholder="e.g., 5.25" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Term (months, optional)</Label>
                <Input type="text" inputMode="numeric" placeholder="e.g., 120" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="e.g., Federal loan" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
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
            </div>
            <Button onClick={handleAdd} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <Plus className="h-4 w-4 mr-2" />Add Debt
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Debts List - Wallet Card Style */}
      <div className="grid gap-4 md:grid-cols-2">
        {debts.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No debts recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          debts.map((d) => {
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
                    <span className="text-xl font-bold text-destructive">
                      {formatCurrency(d.balance)}
                    </span>
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

                  {/* Recent Payments */}
                  {d.paymentHistory && d.paymentHistory.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-semibold mb-1">Recent Payments</div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {d.paymentHistory.slice().reverse().slice(0, 3).map((p) => (
                          <div key={p.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString()}</span>
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
          })
        )}
      </div>

      {/* Pay dialog with preview */}
      <Dialog open={!!payFor} onOpenChange={(open) => { if (!open) setPayFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Debt — {debts.find((d) => d.id === payFor)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput value={payAmount} onChange={(v) => setPayAmount(v)} />
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
              {amortTable.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Payoff in <strong>{amortTable.length}</strong> months ({(amortTable.length / 12).toFixed(1)} years) •
                  Total Interest: <strong className="text-destructive">
                    {formatCurrency(amortTable.reduce((s, r) => s + r.interest, 0))}
                  </strong>
                </div>
              )}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
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
