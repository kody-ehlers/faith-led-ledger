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
import { Trash2, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/calculations";
import { ScrollArea } from "@/components/ui/scroll-area";

type Frequency = "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Yearly";

export default function Investments() {
  const {
    investments,
    addInvestment,
    removeInvestment,
    addEarnings,
    assets,
  } = useFinanceStore();

  const [name, setName] = useState("");
  const [contributionAmount, setContributionAmount] = useState<number | null>(
    null
  );
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);

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
    if (contributionAmount === null || contributionAmount <= 0) {
      toast.error("Please provide a contribution amount");
      return;
    }

    addInvestment({
      name: name.trim(),
      contributionAmount,
      frequency,
      date: date.toISOString(),
      notes: notes.trim(),
      assetId: assetId ?? undefined,
    });
    toast.success("Investment added");
    setName("");
    setContributionAmount(null);
    setFrequency("Monthly");
    setDate(new Date());
    setNotes("");
    setAssetId(null);
  };

  const handleRemove = (id: string) => {
    removeInvestment(id);
    toast.success("Investment removed");
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

      {/* Add Investment Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Add Investment</CardTitle>
          <CardDescription>Set up an automatic recurring investment</CardDescription>
        </CardHeader>
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

            <div className="space-y-2">
              <Label>Linked Wallet (optional)</Label>
              <Select
                value={assetId ?? "__none"}
                onValueChange={(v) => setAssetId(v === "__none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} • {a.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="e.g., 401k, tax-advantaged"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full bg-emerald hover:bg-emerald/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Investment
          </Button>
        </CardContent>
      </Card>

      {/* Investments List */}
      <div className="space-y-4">
        {investments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No investments created yet. Add one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          investments.map((inv) => (
            <Card key={inv.id} className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{inv.name}</span>
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <span
                      className={`${(inv.moneyEarned || 0) >= 0
                          ? "text-success"
                          : "text-destructive"
                        }`}
                    >
                      {formatCurrency((inv.moneyEarned || 0))}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Contribution</div>
                    <div className="font-semibold text-foreground">
                      {formatCurrency(inv.contributionAmount)} / {frequency.toLowerCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Start Date</div>
                    <div className="font-semibold text-foreground">
                      {new Date(inv.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Contributions Made</div>
                    <div className="font-semibold text-foreground">
                      {inv.contributedMonths?.length || 0}
                    </div>
                  </div>
                </div>

                {inv.notes && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Notes:</span> {inv.notes}
                  </div>
                )}

                {inv.assetId && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Funded from:</span>{" "}
                    {assets.find((a) => a.id === inv.assetId)?.name}
                  </div>
                )}

                {/* Earnings History */}
                {inv.earningsHistory && inv.earningsHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-semibold mb-2">Recent Earnings</div>
                    <ScrollArea className="h-32 border rounded-lg p-2">
                      <div className="space-y-2">
                        {inv.earningsHistory
                          .slice()
                          .reverse()
                          .slice(0, 5)
                          .map((e) => (
                            <div
                              key={e.id}
                              className="flex justify-between text-xs"
                            >
                              <div>
                                <div className="text-muted-foreground">
                                  {new Date(e.date).toLocaleDateString()}
                                </div>
                                {e.description && (
                                  <div className="text-muted-foreground">
                                    {e.description}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`font-semibold ${e.amount >= 0
                                    ? "text-success"
                                    : "text-destructive"
                                  }`}
                              >
                                {e.amount >= 0 ? "+" : ""}
                                {formatCurrency(e.amount)}
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
                    onClick={() => setEarningsTarget(inv.id)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Record Earnings
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

      {/* Add Earnings Dialog */}
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
              <Label>Earnings Amount</Label>
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
            <Button onClick={handleAddEarnings}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
