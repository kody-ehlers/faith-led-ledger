import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RecurringFrequency } from "@/store/financeStore";
type Frequency = RecurringFrequency;

// Growth projection row
interface GrowthRow {
  month: number;
  contribution: number;
  earnings: number;
  balance: number;
}

function buildGrowthProjection(
  currentValue: number,
  monthlyContribution: number,
  annualReturnRate: number,
  months = 120
): GrowthRow[] {
  const rows: GrowthRow[] = [];
  let balance = currentValue;
  const monthlyRate = annualReturnRate / 100 / 12;
  for (let i = 1; i <= months; i++) {
    const earnings = balance * monthlyRate;
    balance += earnings + monthlyContribution;
    rows.push({
      month: i,
      contribution: monthlyContribution,
      earnings: parseFloat(earnings.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
    });
  }
  return rows;
}

export default function Investments() {
  const {
    investments,
    addInvestment,
    removeInvestment,
    addEarnings,
    assets,
  } = useFinanceStore();

  const [name, setName] = useState("");
  const [initialContribution, setInitialContribution] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [autoDeposit, setAutoDeposit] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expectedReturn, setExpectedReturn] = useState<string>("");

  const [contributionAmount, setContributionAmount] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [date, setDate] = useState<Date>(new Date());
  const [assetId, setAssetId] = useState<string | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // One-time contribution dialog
  const [contributionTarget, setContributionTarget] = useState<string | null>(null);
  const [contributionAmount2, setContributionAmount2] = useState<number | null>(null);

  // Earnings dialog
  const [earningsTarget, setEarningsTarget] = useState<string | null>(null);
  const [earningsAmount, setEarningsAmount] = useState<number | null>(null);
  const [earningsDescription, setEarningsDescription] = useState("");

  // Growth projection dialog
  const [projectionTarget, setProjectionTarget] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Please provide a name"); return; }
    if (initialContribution === null || initialContribution <= 0) { toast.error("Please provide an initial contribution"); return; }
    if (autoDeposit && (contributionAmount === null || contributionAmount <= 0)) { toast.error("Please provide a contribution amount"); return; }

    addInvestment({
      name: name.trim(),
      contributionAmount: autoDeposit ? (contributionAmount ?? 0) : 0,
      frequency: autoDeposit ? frequency : "Monthly",
      date: autoDeposit ? date.toISOString() : new Date().toISOString(),
      notes: notes.trim(),
      assetId: (autoDeposit ? assetId : null) ?? undefined,
      expectedReturnRate: expectedReturn ? parseFloat(expectedReturn) : undefined,
    });

    const inv = investments.find(i => i.name === name.trim());
    if (inv && initialContribution > 0) {
      addEarnings(inv.id, -initialContribution, "Initial contribution");
    }

    toast.success("Investment added");
    setName(""); setInitialContribution(null); setNotes(""); setAutoDeposit(false);
    setContributionAmount(null); setFrequency("Monthly"); setDate(new Date());
    setAssetId(null); setExpectedReturn(""); setShowForm(false);
  };

  const handleAddContribution = () => {
    if (!contributionTarget || contributionAmount2 === null || contributionAmount2 === 0) { toast.error("Please provide amount"); return; }
    addEarnings(contributionTarget, -contributionAmount2, "One-time contribution");
    toast.success("Contribution recorded");
    setContributionTarget(null); setContributionAmount2(null);
  };

  const handleAddEarnings = () => {
    if (!earningsTarget || earningsAmount === null || earningsAmount === 0) { toast.error("Please provide amount"); return; }
    addEarnings(earningsTarget, earningsAmount, earningsDescription);
    toast.success("Earnings recorded");
    setEarningsTarget(null); setEarningsAmount(null); setEarningsDescription("");
  };

  const getWalletDisplay = (assetId: string | null | undefined) => {
    if (!assetId) return "External Account";
    return assets.find((a) => a.id === assetId)?.name || "Unknown";
  };

  const getInvestmentValue = (inv: InvestmentEntry) => {
    const contributions = (inv.earningsHistory || [])
      .filter((e) => e.amount < 0)
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const earnings = (inv.earningsHistory || [])
      .filter((e) => e.amount > 0)
      .reduce((s, e) => s + e.amount, 0);
    return contributions + earnings;
  };

  const totalValue = investments.reduce((sum, inv) => sum + getInvestmentValue(inv), 0);
  const totalContributed = investments.reduce((sum, inv) => {
    return sum + (inv.earningsHistory || []).filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  }, 0);
  const totalEarned = investments.reduce((sum, inv) => sum + (inv.moneyEarned || 0), 0);

  // Growth projection for selected investment
  const projInv = investments.find((i) => i.id === projectionTarget);
  const projTable = useMemo(() => {
    if (!projInv) return [];
    const currentValue = getInvestmentValue(projInv);
    return buildGrowthProjection(
      currentValue,
      projInv.contributionAmount,
      projInv.expectedReturnRate || 7,
      120
    );
  }, [projInv]);

  // Contribution preview
  const contribPreview = useMemo(() => {
    if (!contributionTarget || !contributionAmount2 || contributionAmount2 <= 0) return null;
    const inv = investments.find((i) => i.id === contributionTarget);
    if (!inv) return null;
    const currentVal = getInvestmentValue(inv);
    const rate = inv.expectedReturnRate || 7;
    const monthlyRate = rate / 100 / 12;
    const projectedEarnings1yr = (currentVal + contributionAmount2) * monthlyRate * 12;
    return { currentVal, newVal: currentVal + contributionAmount2, projectedEarnings1yr };
  }, [contributionTarget, contributionAmount2, investments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-emerald/10">
          <TrendingUp className="h-6 w-6 text-emerald" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Investments</h2>
          <p className="text-muted-foreground">Track investments and earnings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader><CardTitle>Total Contributed</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">{formatCurrency(totalContributed)}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle>Total Earned</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${totalEarned >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totalEarned)}</p></CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader><CardTitle>Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{formatCurrency(totalValue)}</p></CardContent>
        </Card>
      </div>

      {/* Add Investment Form */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => setShowForm(!showForm)}>
          <div className="flex items-center justify-between">
            <div><CardTitle>Add Investment</CardTitle><CardDescription>Create a new investment account</CardDescription></div>
            {showForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Investment Name</Label>
                <Input placeholder="e.g., Roth IRA" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Initial Contribution</Label>
                <CurrencyInput value={initialContribution} onChange={(v) => setInitialContribution(v)} />
              </div>
              <div className="space-y-2">
                <Label>Expected Annual Return (%)</Label>
                <Input type="text" inputMode="decimal" placeholder="e.g., 7" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="e.g., 401k, tax-advantaged" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Switch checked={autoDeposit} onCheckedChange={setAutoDeposit} id="auto-deposit" />
                <Label htmlFor="auto-deposit" className="cursor-pointer">Auto Deposit? (Set up recurring contributions)</Label>
              </div>
              {autoDeposit && (
                <>
                  <div className="space-y-2">
                    <Label>Contribution Amount</Label>
                    <CurrencyInput value={contributionAmount} onChange={(v) => setContributionAmount(v)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={(v: Frequency) => setFrequency(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Biweekly">Biweekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Bimonthly">Bimonthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">{format(date, "PPP")}</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setIsDateOpen(false); } }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Fund From Wallet</Label>
                    <Select value={assetId ?? "__external"} onValueChange={(v) => setAssetId(v === "__external" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__external">External Account</SelectItem>
                        {assets.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name} • {a.type}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <Button onClick={handleAdd} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Investment</Button>
          </CardContent>
        )}
      </Card>

      {/* Investments List - Wallet Card Style */}
      <div className="grid gap-4 md:grid-cols-2">
        {investments.length === 0 ? (
          <Card className="md:col-span-2"><CardContent className="py-8"><p className="text-center text-muted-foreground">No investments yet.</p></CardContent></Card>
        ) : (
          investments.map((inv) => {
            const value = getInvestmentValue(inv);
            const contributed = (inv.earningsHistory || []).filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
            const earned = (inv.earningsHistory || []).filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);

            return (
              <Card key={inv.id} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{inv.name}</CardTitle>
                      {inv.notes && <CardDescription>{inv.notes}</CardDescription>}
                    </div>
                    <span className="text-xl font-bold text-success">{formatCurrency(value)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Contributed</div>
                      <div className="font-semibold">{formatCurrency(contributed)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Earned</div>
                      <div className={`font-semibold ${earned >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(earned)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {inv.contributionAmount > 0 ? "Auto" : "Deposits"}
                      </div>
                      <div className="font-semibold text-xs">
                        {inv.contributionAmount > 0
                          ? `${formatCurrency(inv.contributionAmount)}/${inv.frequency.toLowerCase().slice(0, 3)}`
                          : "Manual"}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  {inv.earningsHistory && inv.earningsHistory.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-semibold mb-1">Recent Activity</div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {inv.earningsHistory.slice().reverse().slice(0, 3).map((e) => (
                          <div key={e.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{e.description || new Date(e.date).toLocaleDateString()}</span>
                            <span className={`font-semibold ${e.amount >= 0 ? "text-success" : "text-foreground"}`}>
                              {e.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(e.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setContributionTarget(inv.id); setContributionAmount2(null); }} className="flex-1">
                      <Plus className="h-4 w-4 mr-1" />Contribute
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEarningsTarget(inv.id)} className="flex-1">
                      <TrendingUp className="h-4 w-4 mr-1" />Earnings
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setProjectionTarget(inv.id)}>📊</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { removeInvestment(inv.id); toast.success("Investment removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Contribution Dialog with preview */}
      <Dialog open={contributionTarget !== null} onOpenChange={(open) => { if (!open) { setContributionTarget(null); setContributionAmount2(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contribute — {investments.find((i) => i.id === contributionTarget)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <CurrencyInput value={contributionAmount2} onChange={(v) => setContributionAmount2(v)} />
            </div>
            {contribPreview && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="font-semibold mb-2">Contribution Preview</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Value:</span>
                    <span>{formatCurrency(contribPreview.currentVal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">After Contribution:</span>
                    <span className="text-success font-semibold">{formatCurrency(contribPreview.newVal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Est. Earnings (1yr):</span>
                    <span className="text-accent">{formatCurrency(contribPreview.projectedEarnings1yr)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setContributionTarget(null); setContributionAmount2(null); }}>Cancel</Button>
            <Button onClick={handleAddContribution}>Add Contribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Earnings Dialog */}
      <Dialog open={earningsTarget !== null} onOpenChange={(open) => { if (!open) { setEarningsTarget(null); setEarningsAmount(null); setEarningsDescription(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Earnings — {investments.find((i) => i.id === earningsTarget)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount</Label><CurrencyInput value={earningsAmount} onChange={(v) => setEarningsAmount(v)} /></div>
            <div className="space-y-2"><Label>Type (optional)</Label><Input placeholder="e.g., Interest, Dividend" value={earningsDescription} onChange={(e) => setEarningsDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEarningsTarget(null); setEarningsAmount(null); setEarningsDescription(""); }}>Cancel</Button>
            <Button onClick={handleAddEarnings}>Record Earnings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Growth Projection Dialog */}
      <Dialog open={!!projectionTarget} onOpenChange={(open) => { if (!open) setProjectionTarget(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Growth Projection — {projInv?.name}</DialogTitle>
          </DialogHeader>
          {projInv && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current:</span>{" "}
                  <span className="font-semibold">{formatCurrency(getInvestmentValue(projInv))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly:</span>{" "}
                  <span className="font-semibold">{formatCurrency(projInv.contributionAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Return:</span>{" "}
                  <span className="font-semibold">{projInv.expectedReturnRate || 7}%</span>
                </div>
              </div>
              {projTable.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  10-year projection • Final value: <strong className="text-success">{formatCurrency(projTable[projTable.length - 1].balance)}</strong>
                </div>
              )}
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Contribution</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projTable.filter((_, i) => i % 12 === 11 || i === 0).map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{row.month} ({(row.month / 12).toFixed(1)} yr)</TableCell>
                        <TableCell>{formatCurrency(row.contribution)}</TableCell>
                        <TableCell className="text-success">{formatCurrency(row.earnings)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setProjectionTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
