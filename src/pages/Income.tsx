import { formatMonthlyLabel, formatWeekOfLabel, formatMonthOfLabel } from "@/utils/formatDate";
import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  calculateMonthlyIncome,
  calculatePostTaxIncomeForMonth,
  calculatePostTaxIncomeReceivedSoFar,
  formatCurrency,
  getEntryIncomeForMonth,
} from "@/utils/calculations";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  DollarSign,
  MessageSquareText,
  Calendar as CalendarIcon,
  SquarePen,
  Pause,
  Play,
  TrendingUp,
  Settings,
} from "lucide-react";
import { subDays, addDays, addMonths, addYears } from "date-fns";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import DatePicker from "@/components/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Income() {
  const {
    income,
    addIncome,
    removeIncome,
    updateIncome,
    suspendIncome,
    resumeIncome,
    assets,
  } = useFinanceStore();

  type Frequency =
    | "Monthly"
    | "Weekly"
    | "Biweekly"
    | "Bimonthly"
    | "Quarterly"
    | "Yearly"
    | "One-time";

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("One-time");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [applyRetroactive, setApplyRetroactive] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showOneTimeList, setShowOneTimeList] = useState(false);

  const [editingIncome, setEditingIncome] = useState<(typeof income)[0] | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);

  const handleAddIncome = () => {
    if (!source.trim() || amount === null || amount <= 0 || !date) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    addIncome({
      source: source.trim(),
      amount: amount,
      frequency,
      preTax: false, // Always after-tax now
      date: date.toISOString(),
      assetId: assetId ?? undefined,
      notes: notes.trim(),
    });

    // Retroactive application is now informational only — wallet sync handles actual allocation
    if (applyRetroactive && assetId) {
      const now = new Date();
      const startDate = new Date(date);
      let count = 0;

      if (frequency === "One-time") {
        if (startDate <= now) count = 1;
      } else {
        let curr = new Date(startDate);
        while (curr <= now) {
          count++;
          if (frequency === "Weekly") curr = addDays(curr, 7);
          else if (frequency === "Biweekly") curr = addDays(curr, 14);
          else if (frequency === "Monthly") curr = addMonths(curr, 1);
          else if (frequency === "Bimonthly") curr = addMonths(curr, 2);
          else if (frequency === "Quarterly") curr = addMonths(curr, 3);
          else if (frequency === "Yearly") curr = addYears(curr, 1);
          else curr = addMonths(curr, 1);
        }
      }

      if (count > 0) {
        const totalAmount = count * amount;
        toast.success(`Wallet sync will allocate ${formatCurrency(totalAmount)} (${count} occurrences) on next refresh`);
      }
    }

    toast.success("Income added successfully");
    setSource("");
    setAmount(null);
    setFrequency("One-time");
    setDate(new Date());
    setNotes("");
    setAssetId(null);
    setApplyRetroactive(false);
  };

  const handleRemoveIncome = (id: string) => {
    removeIncome(id);
    toast.success("Income source removed");
  };

  const handleEditIncome = (entry: (typeof income)[0]) => {
    setEditingIncome(entry);
    setIsEditModalOpen(true);
  };
  const applyEditAndTruncateHistory = () => {
    if (!editingIncome) return;
    const original = income.find((i) => i.id === editingIncome.id);
    if (!original) return;

    // Truncate changes that start on/after the new date, and add a new change starting at the edited date
    const newDate = new Date(editingIncome.date);
    // normalize to date-only at noon to avoid timezone shifts when converting to ISO
    const newDateStart = new Date(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate(),
      12,
      0,
      0,
      0
    );

    // copy changes deeply so we don't mutate store objects in-place
    const prevChanges = original.changes
      ? original.changes.map((c) => ({ ...c }))
      : [];
    const kept = prevChanges.filter((ch) => new Date(ch.start) < newDateStart);

    // If there is a kept last change, close it the day before the new date
    if (kept.length > 0) {
      const lastKept = kept[kept.length - 1];
      if (!lastKept.end) {
        lastKept.end = subDays(newDateStart, 1).toISOString();
      }
    }

    // Add new change representing edited amount starting at edited date (stored at noon to avoid tz shifts)
    kept.push({
      amount: editingIncome.amount,
      start: newDateStart.toISOString(),
      end: null,
    });

    updateIncome(editingIncome.id, {
      ...editingIncome,
      changes: kept,
      amount: editingIncome.amount,
    });
    toast.success("Income updated; subsequent history truncated");
    setEditConfirmOpen(false);
    setIsEditModalOpen(false);
    setEditingIncome(null);
  };

  const handleSaveEdit = () => {
    if (!editingIncome || !editingIncome.source) return;

    // Only allow editing non-amount/date fields here (source, frequency, preTax, notes)
    const updates: Partial<typeof editingIncome> = {
      source: editingIncome.source,
      frequency: editingIncome.frequency,
      preTax: editingIncome.preTax,
      notes: editingIncome.notes,
      assetId: editingIncome.assetId,
    };

    updateIncome(editingIncome.id, updates);
    toast.success("Income updated");
    setIsEditModalOpen(false);
    setEditingIncome(null);
  };

  const monthlyTotal = calculateMonthlyIncome(income);
  const annualProjection = monthlyTotal * 12;

  // Prepare last 12 months of income data for the chart (uses per-entry helper so it respects changes/suspensions)
  const now = new Date();
  const monthlyIncomeData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthName = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    const incomeBreakdown: { source: string; amount: number }[] = [];

    const monthlyAmount = income.reduce((sum, inc) => {
      const contributionAmount = getEntryIncomeForMonth(
        inc,
        date,
        /*includePreTax*/ true
      );
      if (contributionAmount > 0) {
        incomeBreakdown.push({
          source: inc.source,
          amount: contributionAmount,
        });
      }
      return sum + contributionAmount;
    }, 0);

    return {
      month: monthName,
      year,
      income: monthlyAmount,
      label: `${monthName} ${year}`,
      breakdown: incomeBreakdown,
    };
  });

  const recurringIncomes = income.filter((i) => i.frequency !== "One-time");
  const oneTimeIncomes = income.filter((i) => i.frequency === "One-time");
  const sortedOneTime = [...oneTimeIncomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const IncomeCard = ({ entry }: { entry: (typeof income)[0] }) => {
    const isPast =
      entry.frequency === "One-time"
        ? new Date(entry.date) <= new Date()
        : false;

    const now = new Date();
    const isCurrentlySuspended = () => {
      if (!entry.suspendedFrom) return false;
      const from = new Date(entry.suspendedFrom);
      if (now < from) return false;
      if (entry.suspendedIndefinitely) return true;
      if (entry.suspendedTo) {
        const to = new Date(entry.suspendedTo);
        return now <= to;
      }
      return false;
    };

    // Suspend dialog state
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    const [suspendStart, setSuspendStart] = useState<Date>(new Date());
    const [suspendEnd, setSuspendEnd] = useState<Date | null>(null);
    const [suspendIndefinite, setSuspendIndefinite] = useState<boolean>(true);
    const [suspendComment, setSuspendComment] = useState<string>(
      entry.suspendedNote ?? ""
    );
    // Settings dialog state (collapses multiple per-card icons into one)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // Adjust pay dialog state
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState<string>(
      entry.amount.toString()
    );
    const [adjustDate, setAdjustDate] = useState<Date>(new Date());
    // History dialog state
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const suspendedNow = isCurrentlySuspended();
    const cardClass = cn(
      "shadow-sm border border-border bg-card",
      suspendedNow ? "ring-2 ring-amber-200/50 border-amber-300" : ""
    );

    return (
      <Card key={entry.id} className={cardClass}>
        <CardContent className="flex justify-between items-center py-4">
          {/* Left: Source + Frequency/PreTax */}
          <div className="flex-1 flex flex-col justify-center">
            {suspendedNow && (
              <div className="mb-1 text-yellow-700 font-semibold text-sm">
                {entry.suspendedIndefinitely
                  ? "Suspended — Indefinitely"
                  : `Suspended until ${entry.suspendedTo
                    ? format(new Date(entry.suspendedTo), "PPP")
                    : ""
                  }`}
                {entry.suspendedNote && (
                  <span className="ml-2 text-sm text-muted-foreground italic">
                    ({entry.suspendedNote})
                  </span>
                )}
              </div>
            )}
            <h4 className="font-semibold text-foreground">{entry.source}</h4>
            <div className="flex gap-2 text-sm text-muted-foreground items-center">
              {entry.frequency !== "One-time" && <span>{entry.frequency}</span>}
              {entry.frequency !== "One-time" && <span>•</span>}
              <span>{entry.preTax ? "Pre-tax" : "Post-tax"}</span>
              {entry.frequency === "One-time" && <span>•</span>}
              {entry.frequency === "One-time" && (
                <span>{format(new Date(entry.date), "PPP")}</span>
              )}
            </div>
          </div>

          {/* Right: Amount + Notes + Edit/Delete */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-semibold w-24 text-right",
                isPast ? "text-green-700" : "text-foreground"
              )}
            >
              {formatCurrency(entry.amount)}
            </span>
            <div className="w-10 flex justify-center">
              {entry.notes && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                      aria-label="View notes"
                      title="View notes"
                    >
                      <MessageSquareText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <p className="text-sm text-foreground">{entry.notes}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Settings button (collapses Adjust/History/Suspend/Edit into one modal) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:bg-muted-foreground/10"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {/* suspended badge removed - border + heading indicate suspension */}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveIncome(entry.id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        {/* Suspend Dialog (per-card) */}
        <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Suspend Income</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker selected={suspendStart} onSelect={(d) => setSuspendStart(d)} placeholder="Pick a date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="flex items-center gap-3">
                  <DatePicker selected={suspendEnd ?? undefined} onSelect={(d) => setSuspendEnd(d)} placeholder="Pick an end date" />
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={suspendIndefinite}
                      onCheckedChange={setSuspendIndefinite}
                    />
                    <span className="text-sm text-muted-foreground">
                      Indefinite
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Input
                  value={suspendComment}
                  onChange={(e) =>
                    setSuspendComment(e.target.value.slice(0, 200))
                  }
                  placeholder="Why is this suspended?"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  // Save suspension
                  suspendIncome(
                    entry.id,
                    suspendStart.toISOString(),
                    suspendIndefinite
                      ? null
                      : suspendEnd
                        ? suspendEnd.toISOString()
                        : null,
                    suspendIndefinite,
                    suspendComment || undefined
                  );
                  toast.success("Income suspended");
                  setIsSuspendOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust pay dialog (per-card) */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Pay</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Amount</Label>
                <CurrencyInput
                  value={parseFloat(adjustAmount) || null}
                  onChange={(v) => setAdjustAmount(v !== null ? v.toString() : "")}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <DatePicker selected={adjustDate} onSelect={(d) => setAdjustDate(d)} />
                <p className="text-sm text-muted-foreground">
                  If the date is in the future, the current income will stop the
                  day before and a new income will start on the effective date.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  const parsed = parseFloat(adjustAmount);
                  if (isNaN(parsed) || parsed <= 0) {
                    toast.error("Please enter a valid amount");
                    return;
                  }

                  const eff = adjustDate;
                  // create date-at-noon to avoid timezone shifts when converting to ISO
                  const effStart = new Date(
                    eff.getFullYear(),
                    eff.getMonth(),
                    eff.getDate(),
                    12,
                    0,
                    0,
                    0
                  );
                  const todayStart = new Date();
                  todayStart.setHours(12, 0, 0, 0);

                  // deep copy existing changes to avoid mutating store objects
                  const prevChanges = entry.changes
                    ? entry.changes.map((c) => ({ ...c }))
                    : [];

                  // Keep only changes that start before the effective date (truncate future changes)
                  const kept = prevChanges.filter(
                    (ch) => new Date(ch.start) < effStart
                  );

                  // Close the last kept change the day before effStart
                  if (kept.length > 0) {
                    const lastKept = kept[kept.length - 1];
                    if (!lastKept.end) {
                      lastKept.end = subDays(effStart, 1).toISOString();
                    }
                  }

                  // Insert the new change starting at effStart
                  kept.push({
                    amount: parsed,
                    start: effStart.toISOString(),
                    end: null,
                  });

                  // If effective date is today or earlier, apply immediately (update current amount)
                  if (effStart.getTime() <= todayStart.getTime()) {
                    updateIncome(entry.id, { amount: parsed, changes: kept });
                    toast.success("Income updated");
                  } else {
                    updateIncome(entry.id, { changes: kept });
                    toast.success("Income change scheduled");
                  }

                  setIsAdjustOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History dialog (per-card) */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pay History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {entry.changes && entry.changes.length > 0 ? (
                entry.changes.map((ch, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {format(new Date(ch.start), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ch.end ? format(new Date(ch.end), "PPP") : "to now"}
                      </p>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(ch.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No history available
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Settings dialog (per-card) - collapses multiple actions into one place */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Quick actions for this income
              </p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    // open edit modal (handled globally)
                    handleEditIncome(entry);
                  }}
                >
                  <SquarePen className="mr-2 h-4 w-4" /> Edit
                </Button>

                {entry.frequency !== "One-time" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setAdjustAmount(entry.amount.toString());
                        setAdjustDate(new Date());
                        setIsAdjustOpen(true);
                      }}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" /> Adjust Pay
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsHistoryOpen(true);
                      }}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      View History
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        if (isCurrentlySuspended()) {
                          resumeIncome(entry.id);
                          toast.success("Income resumed");
                          setIsSettingsOpen(false);
                        } else {
                          setSuspendStart(new Date());
                          setSuspendEnd(null);
                          setSuspendIndefinite(true);
                          setIsSuspendOpen(true);
                          setIsSettingsOpen(false);
                        }
                      }}
                    >
                      {isCurrentlySuspended()
                        ? "Resume Income"
                        : "Suspend Income"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  // Suspend Dialog rendered inside page so it can be controlled per-card via state in each card
  // But we create dialog instances per card inside IncomeCard above (using its state)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-success/10">
          <DollarSign className="h-6 w-6 text-success" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Income</h2>

          <p className="text-muted-foreground">
            Track and manage your income sources
          </p>
        </div>
      </div>

      {/* Income Over Past Year Bar Chart (moved from Home) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Income Over the Past Year</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={monthlyIncomeData}
              margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
              barSize={40}
              barCategoryGap="10%"
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                className="text-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-md p-3 shadow-lg">
                        <p className="font-semibold mb-2">{data.label}</p>
                        <p className="text-success font-bold mb-2">
                          Total: {formatCurrency(data.income)}
                        </p>
                        {data.breakdown && data.breakdown.length > 0 && (
                          <div className="space-y-1 border-t border-border pt-2">
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              Sources:
                            </p>
                            {data.breakdown.map(
                              (
                                item: { source: string; amount: number },
                                idx: number
                              ) => (
                                <div
                                  key={idx}
                                  className="text-sm flex justify-between gap-4"
                                >
                                  <span className="text-muted-foreground">
                                    {item.source}
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="income"
                fill="hsl(var(--success))"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-md border-success/20">
          <CardHeader>
            <CardTitle>Income Received</CardTitle>
            <CardDescription>To date this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(calculatePostTaxIncomeReceivedSoFar(income))}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle>Expected Monthly</CardTitle>
            <CardDescription>Projected for full month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(calculatePostTaxIncomeForMonth(income))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income Progress Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Monthly Income Progress</CardTitle>
          <CardDescription>Income received vs. projected</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const received = calculatePostTaxIncomeReceivedSoFar(income);
            const projected = calculatePostTaxIncomeForMonth(income);
            const receivedPercent = projected > 0 ? (received / projected) * 100 : 0;
            const remaining = Math.max(0, projected - received);

            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Received: {formatCurrency(received)}
                    </span>
                    <span className="font-medium text-foreground">
                      {receivedPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-success transition-all duration-300"
                      style={{ width: `${Math.min(receivedPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Remaining: {formatCurrency(remaining)}</span>
                    <span>Total: {formatCurrency(projected)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Add Income Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Add Income</CardTitle>
          <CardDescription>Record a new source of income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Salary, Freelance"
                autoComplete="off"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (After Taxes)</Label>
              <CurrencyInput
                id="amount"
                value={amount}
                onChange={(v) => setAmount(v)}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value: Frequency) => setFrequency(value)}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-time">One-time</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Bimonthly">Bimonthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="date">
                {frequency === "One-time" ? "Date" : "Start Date"}
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />{" "}
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                placeholder="Add notes (max 200 chars)"
              />
            </div>

            {/* Wallet */}
            <div className="space-y-2 md:col-span-2">
              <Label>Wallet</Label>
              <Select
                value={assetId ?? "__none"}
                onValueChange={(v) => setAssetId(v === "__none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No Wallet Selected</SelectItem>
                  {assets
                    .filter((a) => a.type !== "Credit Card" && !a.closed)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} • {a.type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply Retroactive Toggle */}
            {assetId && frequency !== "One-time" && (
              <div className="md:col-span-2 flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Switch
                  checked={applyRetroactive}
                  onCheckedChange={setApplyRetroactive}
                  id="apply-retroactive"
                />
                <Label htmlFor="apply-retroactive" className="cursor-pointer">
                  Apply income from start date to now (allocate total to wallet)
                </Label>
              </div>
            )}
          </div>

          <Button
            onClick={handleAddIncome}
            className="w-full bg-success hover:bg-success/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Income
          </Button>
        </CardContent>
      </Card>

      {/* Recurring Incomes */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recurring Income</CardTitle>
          <CardDescription>All your recurring income sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recurringIncomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recurring income recorded.
            </p>
          ) : (
            recurringIncomes.map((entry) => (
              <IncomeCard key={entry.id} entry={entry} />
            ))
          )}
        </CardContent>
      </Card>

      {/* One-Time Income Toggle */}
      {sortedOneTime.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowOneTimeList(!showOneTimeList)}
          >
            {showOneTimeList
              ? "Hide One-Time Incomes"
              : "View One-Time Incomes"}
          </Button>
        </div>
      )}

      {/* One-Time Income List */}
      {showOneTimeList && (
        <div className="space-y-3 mt-2">
          {sortedOneTime.map((entry) => (
            <IncomeCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingIncome && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Income</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={editingIncome.source}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      source: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="py-2 text-foreground font-medium">
                  {formatCurrency(editingIncome.amount)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editingIncome.frequency}
                  onValueChange={(value: Frequency) =>
                    setEditingIncome({ ...editingIncome, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One-time">One-time</SelectItem>
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
                <div className="py-2 text-foreground">
                  {editingIncome.date
                    ? format(new Date(editingIncome.date), "PPP")
                    : "-"}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editingIncome.notes}
                  onChange={(e) =>
                    setEditingIncome({
                      ...editingIncome,
                      notes: e.target.value.slice(0, 200),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Wallet</Label>
                <Select
                  value={editingIncome.assetId ?? "__none"}
                  onValueChange={(v) =>
                    setEditingIncome({
                      ...editingIncome,
                      assetId: v === "__none" ? null : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No Wallet Selected</SelectItem>
                    {assets
                      .filter((a) => a.type !== "Credit Card" && !a.closed)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} • {a.type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSaveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Confirm edit/truncate history dialog */}
      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Changing the amount or start date will remove any subsequent
              scheduled changes (they will be truncated). Do you want to
              proceed?
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyEditAndTruncateHistory}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
