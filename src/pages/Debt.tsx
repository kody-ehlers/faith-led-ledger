import { useState } from "react";
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
import { Trash2, Plus, Landmark, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Payment dialog state
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payAsset, setPayAsset] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    addDebt({
      name: name.trim(),
      balance: balance ?? 0,
      interestRate: interestRate ? parseFloat(interestRate) : 0,
      minimumPayment: minPayment ?? 0,
      dueDate: new Date().toISOString(),
      notes: notes.trim(),
      assetId: assetId ?? undefined,
    });
    toast.success("Debt added");
    setName("");
    setBalance(null);
    setMinPayment(null);
    setInterestRate("");
    setNotes("");
    setAssetId(null);
    setShowForm(false);
  };

  const openPay = (debtId: string, debtBalance: number) => {
    setPayFor(debtId);
    setPayAmount(debtBalance);
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
                <Input
                  placeholder="e.g., Student Loan, Car Payment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 5.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g., Federal loan, 10 year term"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Default Payment Wallet</Label>
                <Select
                  value={assetId ?? "__external"}
                  onValueChange={(v) => setAssetId(v === "__external" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__external">External Account</SelectItem>
                    {assets
                      .filter((a) => a.type !== "Credit Card")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} • {a.type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Debt
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No debts recorded yet. Click the form above to add one.
              </p>
            </CardContent>
          </Card>
        ) : (
          debts.map((d) => (
            <Card key={d.id} className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>{d.name}</CardTitle>
                    {d.notes && <CardDescription>{d.notes}</CardDescription>}
                  </div>
                  <span className="text-lg font-bold text-destructive">
                    {formatCurrency(d.balance)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Min Payment</div>
                    <div className="font-semibold text-foreground">
                      {formatCurrency(d.minimumPayment)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Interest Rate</div>
                    <div className="font-semibold text-foreground">
                      {d.interestRate > 0 ? `${d.interestRate}%` : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Paid From</div>
                    <div className="font-semibold text-foreground">
                      {getWalletDisplay(d.assetId)}
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {d.paymentHistory && d.paymentHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-semibold mb-2">Recent Payments</div>
                    <ScrollArea className="h-40 border rounded-lg p-2">
                      <div className="space-y-2">
                        {d.paymentHistory
                          .slice()
                          .reverse()
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between items-start text-sm py-1 px-1"
                            >
                              <div className="flex-1">
                                <div className="text-muted-foreground">
                                  {new Date(p.date).toLocaleDateString()}
                                </div>
                                {p.memo && (
                                  <div className="text-xs text-muted-foreground">
                                    {p.memo}
                                  </div>
                                )}
                              </div>
                              <div className="font-semibold text-success whitespace-nowrap ml-2">
                                -{formatCurrency(p.amount)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPay(d.id, d.minimumPayment)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Make Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      removeDebt(d.id);
                      toast.success("Debt removed");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pay dialog */}
      <Dialog
        open={!!payFor}
        onOpenChange={(open) => {
          if (!open) setPayFor(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Debt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From Wallet</Label>
              <Select
                value={payAsset ?? "__none"}
                onValueChange={(v) => setPayAsset(v === "__none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Choose</SelectItem>
                  {assets
                    .filter((a) => a.type !== "Credit Card")
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} • {a.type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput
                value={payAmount}
                onChange={(v) => setPayAmount(v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayFor(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPay}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
