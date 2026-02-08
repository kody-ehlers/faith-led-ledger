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
import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { toast } from "sonner";
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

export default function Debt() {
  const {
    debts,
    addDebt,
    updateDebt,
    removeDebt,
    assets,
    addAssetTransaction,
  } = useFinanceStore();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [minPayment, setMinPayment] = useState<number | null>(null);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    addDebt({
      name: name.trim(),
      balance: balance ?? 0,
      interestRate: 0,
      minimumPayment: minPayment ?? 0,
      dueDate: new Date().toISOString(),
    });
    toast.success("Debt added");
    setName("");
    setBalance(null);
    setMinPayment(null);
  };

  // Payment dialog state
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payAsset, setPayAsset] = useState<string | null>(null);

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
    // create negative transaction on asset (outflow)
    addAssetTransaction(payAsset, {
      date: new Date().toISOString(),
      amount: -amt,
      memo: `Payment to ${debt.name}`,
    });
    updateDebt(payFor, { balance: Math.max(0, debt.balance - amt) });
    toast.success("Payment recorded");
    setPayFor(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-destructive/10">
          <svg
            className="h-6 w-6 text-destructive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M12 2v20M6 10h12"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
              <CurrencyInput
                value={balance}
                onChange={(v) => setBalance(v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Payment</Label>
              <CurrencyInput
                value={minPayment}
                onChange={(v) => setMinPayment(v)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>
              Add Debt
            </Button>
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
          ) : (
            debts.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
              >
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Min: ${d.minimumPayment.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold">${d.balance.toFixed(2)}</div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      updateDebt(d.id, {
                        balance: Math.max(0, d.balance - d.minimumPayment),
                      });
                      toast.success("Applied minimum payment (demo)");
                    }}
                  >
                    Apply Min
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openPay(d.id, d.balance)}
                  >
                    Pay
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      removeDebt(d.id);
                      toast.success("Debt removed");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
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
            <Button
              onClick={() => {
                setPayFor(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmPay}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
