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
import { formatCurrency } from "@/utils/calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PiggyBank, Plus, Percent, Trash2 } from "lucide-react";

export default function Savings() {
  const { savings, addSavings, updateSavings, removeSavings } =
    useFinanceStore();
  const [name, setName] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [interestRate, setInterestRate] = useState<string>("");

  // Interest dialog
  const [interestTarget, setInterestTarget] = useState<string | null>(null);
  const [interestAmount, setInterestAmount] = useState<number | null>(null);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    addSavings({
      name: name.trim(),
      currentAmount: current ?? 0,
      goalAmount: goal ?? 0,
      interestRate: interestRate ? parseFloat(interestRate) : 0,
      interestHistory: [],
    });
    toast.success("Savings account added");
    setName("");
    setCurrent(null);
    setGoal(null);
    setInterestRate("");
  };

  const handleApplyInterest = () => {
    if (!interestTarget || !interestAmount || interestAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const account = savings.find((s) => s.id === interestTarget);
    if (!account) return;
    updateSavings(interestTarget, {
      currentAmount: account.currentAmount + interestAmount,
      interestHistory: [
        ...(account.interestHistory || []),
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount: interestAmount,
          memo: "Interest earned",
        },
      ],
    });
    toast.success(`Applied ${formatCurrency(interestAmount)} interest`);
    setInterestTarget(null);
    setInterestAmount(null);
  };

  const totalSaved = savings.reduce((s, a) => s + a.currentAmount, 0);
  const totalGoal = savings.reduce((s, a) => s + a.goalAmount, 0);
  const totalInterestEarned = savings.reduce(
    (s, a) =>
      s + (a.interestHistory || []).reduce((sum, h) => sum + h.amount, 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <PiggyBank className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Savings</h2>
          <p className="text-muted-foreground">
            Monitor savings goals and progress
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(totalSaved)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(totalGoal)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Interest Earned</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">
              {formatCurrency(totalInterestEarned)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Savings Account</CardTitle>
          <CardDescription>Record a savings bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Amount</Label>
              <CurrencyInput value={current} onChange={setCurrent} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Goal Amount</Label>
              <CurrencyInput value={goal} onChange={setGoal} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate (% APY)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="e.g., 4.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <div className="grid gap-4 md:grid-cols-2">
        {savings.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No savings accounts yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          savings.map((s) => {
            const progress =
              s.goalAmount > 0
                ? Math.min((s.currentAmount / s.goalAmount) * 100, 100)
                : 0;
            const accountInterest = (s.interestHistory || []).reduce(
              (sum, h) => sum + h.amount,
              0
            );

            return (
              <Card key={s.id} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{s.name}</CardTitle>
                    <span className="text-lg font-bold text-success">
                      {formatCurrency(s.currentAmount)}
                    </span>
                  </div>
                  {s.goalAmount > 0 && (
                    <CardDescription>
                      Goal: {formatCurrency(s.goalAmount)} ({progress.toFixed(1)}%)
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {s.goalAmount > 0 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">APY:</span>{" "}
                      <span className="font-medium">
                        {s.interestRate ? `${s.interestRate}%` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interest Earned:</span>{" "}
                      <span className="font-medium text-accent">
                        {formatCurrency(accountInterest)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setInterestTarget(s.id);
                        // Calculate monthly interest as default
                        const monthly =
                          s.interestRate
                            ? (s.currentAmount * (s.interestRate / 100)) / 12
                            : 0;
                        setInterestAmount(
                          monthly > 0 ? parseFloat(monthly.toFixed(2)) : null
                        );
                      }}
                    >
                      <Percent className="h-4 w-4 mr-1" />
                      Apply Interest
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        updateSavings(s.id, {
                          currentAmount: s.currentAmount + 100,
                        });
                        toast.success("Added $100");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      $100
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        removeSavings(s.id);
                        toast.success("Account removed");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Interest Dialog */}
      <Dialog
        open={!!interestTarget}
        onOpenChange={(open) => {
          if (!open) setInterestTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Apply Interest — {savings.find((s) => s.id === interestTarget)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interest Amount</Label>
              <CurrencyInput
                value={interestAmount}
                onChange={(v) => setInterestAmount(v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Pre-filled with estimated monthly interest based on APY.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInterestTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApplyInterest}>Apply Interest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
