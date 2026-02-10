import { useState } from "react";
import { useFinanceStore, InvestmentEntry } from "@/store/financeStore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/calculations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

type Frequency = "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Yearly";

export default function Investments() {
  const {
    investments,
    addInvestment,
    removeInvestment,
    addEarnings,
    assets,
  } = useFinanceStore();

  // Add Investment form
  const [name, setName] = useState("");
  const [initialContribution, setInitialContribution] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [autoDeposit, setAutoDeposit] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Auto-deposit fields (shown conditionally)
  const [contributionAmount, setContributionAmount] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [date, setDate] = useState<Date>(new Date());
  const [assetId, setAssetId] = useState<string | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // One-time contribution dialog
  const [contributionTarget, setContributionTarget] = useState<string | null>(null);
  const [contributionAmount2, setContributionAmount2] = useState<number | null>(null);
  const [isContributionOpen, setIsContributionOpen] = useState(false);

  // Earnings tracking
  const [earningsTarget, setEarningsTarget] = useState<string | null>(null);
  const [earningsAmount, setEarningsAmount] = useState<number | null>(null);
  const [earningsDescription, setEarningsDescription] = useState("");
  const [isEarningsOpen, setIsEarningsOpen] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Please provide a name");
      return;
    }
    if (initialContribution === null || initialContribution <= 0) {
      toast.error("Please provide an initial contribution");
      return;
    }
    if (autoDeposit) {
      if (contributionAmount === null || contributionAmount <= 0) {
        toast.error("Please provide a contribution amount");
        return;
      }
    }

    addInvestment({
      name: name.trim(),
      contributionAmount: autoDeposit ? (contributionAmount ?? 0) : 0,
      frequency: autoDeposit ? frequency : "Monthly",
      date: autoDeposit ? date.toISOString() : new Date().toISOString(),
      notes: notes.trim(),
      assetId: (autoDeposit ? assetId : null) ?? undefined,
    });

    // If initial contribution, record it
    const inv = investments.find(i => i.name === name.trim());
    if (inv && initialContribution > 0) {
      addEarnings(inv.id, -initialContribution, "Initial contribution");
    }

    toast.success("Investment added");
    setName("");
    setInitialContribution(null);
    setNotes("");
    setAutoDeposit(false);
    setContributionAmount(null);
    setFrequency("Monthly");
    setDate(new Date());
    setAssetId(null);
    setShowForm(false);
  };

  const handleAddContribution = () => {
    if (!contributionTarget || contributionAmount2 === null || contributionAmount2 === 0) {
      toast.error("Please provide amount");
      return;
    }

    addEarnings(contributionTarget, -contributionAmount2, "One-time contribution");
    toast.success("Contribution recorded");
    setContributionTarget(null);
    setContributionAmount2(null);
    setIsContributionOpen(false);
  };

  const handleAddEarnings = () => {
    if (!earningsTarget || earningsAmount === null || earningsAmount === 0) {
      toast.error("Please provide amount");
      return;
    }

    addEarnings(earningsTarget, earningsAmount, earningsDescription);
    toast.success("Earnings recorded");
    setEarningsTarget(null);
    setEarningsAmount(null);
    setEarningsDescription("");
    setIsEarningsOpen(false);
  };

  const handleRemove = (id: string) => {
    removeInvestment(id);
    toast.success("Investment removed");
  };

  const getWalletDisplay = (assetId: string | null | undefined) => {
    if (!assetId) return "External Account";
    return assets.find((a) => a.id === assetId)?.name || "Unknown";
  };

  const totalContributed = investments.reduce((sum, inv) => {
    const monthsContributed = inv.contributedMonths?.length || 0;
    return sum + inv.contributionAmount * monthsContributed;
  }, 0);

  const totalEarned = investments.reduce((sum, inv) => sum + (inv.moneyEarned || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-emerald/10">
          <TrendingUp className="h-6 w-6 text-emerald" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Investments</h2>
          <p className="text-muted-foreground">
            Track recurring investments and earnings
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Contributed</CardTitle>
            <CardDescription>All investments combined</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(totalContributed)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Earned</CardTitle>
            <CardDescription>Interest, gains, dividends</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${totalEarned >= 0 ? "text-success" : "text-destructive"
                }`}
            >
              {formatCurrency(totalEarned)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
            <CardDescription>Contributed + Earned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(totalContributed + totalEarned)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Investment Form - Simplified with collapsible auto-deposit */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Investment</CardTitle>
              <CardDescription>Create a new investment account</CardDescription>
            </div>
            {showForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Investment Name</Label>
                <Input
                  placeholder="e.g., Roth IRA, Brokerage Account"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Initial Contribution</Label>
                <CurrencyInput
                  value={initialContribution}
                  onChange={(v) => setInitialContribution(v)}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g., 401k, tax-advantaged, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Switch
                  checked={autoDeposit}
                  onCheckedChange={setAutoDeposit}
                  id="auto-deposit"
                />
                <Label htmlFor="auto-deposit" className="cursor-pointer">
                  Auto Deposit? (Set up automatic recurring contributions)
                </Label>
              </div>

              {autoDeposit && (
                <>
                  <div className="space-y-2">
                    <Label>Contribution Amount</Label>
                    <CurrencyInput
                      value={contributionAmount}
                      onChange={(v) => setContributionAmount(v)}
                    />
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
                    <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => {
                            if (d) {
                              setDate(d);
                              setIsDateOpen(false);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Fund From Wallet</Label>
                    <Select
                      value={assetId ?? "__external"}
                      onValueChange={(v) => setAssetId(v === "__external" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__external">From External Account</SelectItem>
                        {assets.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} • {a.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Button onClick={handleAdd} className="w-full bg-emerald hover:bg-emerald/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Investments List */}
      <div className="space-y-4">
        {investments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No investments created yet. Click the form above to add one.
              </p>
            </CardContent>
          </Card>
        ) : (
          investments.map((inv) => (
            <Card key={inv.id} className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>{inv.name}</CardTitle>
                    {inv.notes && (
                      <CardDescription>{inv.notes}</CardDescription>
                    )}
                  </div>
                  <span
                    className={`text-lg font-bold ${(inv.moneyEarned || 0) >= 0
                        ? "text-success"
                        : "text-destructive"
                      }`}
                  >
                    {formatCurrency((inv.moneyEarned || 0))}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {inv.contributionAmount > 0 ? (
                    <div>
                      <div className="text-xs text-muted-foreground">Auto Deposit</div>
                      <div className="font-semibold text-foreground">
                        {formatCurrency(inv.contributionAmount)} / {inv.frequency.toLowerCase()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-muted-foreground">Deposits</div>
                      <div className="font-semibold text-foreground">Manual</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Started</div>
                    <div className="font-semibold text-foreground">
                      {new Date(inv.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Funded From</div>
                    <div className="font-semibold text-foreground">
                      {getWalletDisplay(inv.assetId)}
                    </div>
                  </div>
                </div>

                {/* Earnings History */}
                {inv.earningsHistory && inv.earningsHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-semibold mb-2">Recent Activity</div>
                    <ScrollArea className="h-40 border rounded-lg p-2">
                      <div className="space-y-2">
                        {inv.earningsHistory
                          .slice()
                          .reverse()
                          .map((e) => (
                            <div
                              key={e.id}
                              className="flex justify-between items-start text-sm py-1 px-1"
                            >
                              <div className="flex-1">
                                <div className="text-muted-foreground">
                                  {new Date(e.date).toLocaleDateString()}
                                </div>
                                {e.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {e.description}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`font-semibold whitespace-nowrap ml-2 ${e.amount >= 0
                                    ? "text-success"
                                    : "text-destructive"
                                  }`}
                              >
                                {e.amount >= 0 ? "+" : ""}
                                {formatCurrency(Math.abs(e.amount))}
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
                    onClick={() => {
                      setContributionTarget(inv.id);
                      setIsContributionOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Contribute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEarningsTarget(inv.id)}
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Earnings
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(inv.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contribution Dialog */}
      <Dialog
        open={isContributionOpen || contributionTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContributionTarget(null);
            setContributionAmount2(null);
          }
          setIsContributionOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Contribution - {investments.find((i) => i.id === contributionTarget)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput
                value={contributionAmount2}
                onChange={(v) => setContributionAmount2(v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setContributionTarget(null);
                setContributionAmount2(null);
                setIsContributionOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddContribution}>Add Contribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Earnings Dialog */}
      <Dialog
        open={isEarningsOpen || earningsTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEarningsTarget(null);
            setEarningsAmount(null);
            setEarningsDescription("");
          }
          setIsEarningsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Record Earnings - {investments.find((i) => i.id === earningsTarget)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput
                value={earningsAmount}
                onChange={(v) => setEarningsAmount(v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type (optional)</Label>
              <Input
                placeholder="e.g., Interest, Dividend, Capital Gains"
                value={earningsDescription}
                onChange={(e) => setEarningsDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setEarningsTarget(null);
                setEarningsAmount(null);
                setEarningsDescription("");
                setIsEarningsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddEarnings}>Record Earnings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
