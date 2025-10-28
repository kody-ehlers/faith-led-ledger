import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { calculateMonthlyIncome, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  DollarSign,
  MessageSquareText,
  Calendar as CalendarIcon,
  SquarePen,
  Pause,
  Play
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Income() {
  const { income, addIncome, removeIncome, updateIncome, suspendIncome, resumeIncome } = useFinanceStore();

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Biweekly" | "Quarterly" | "Yearly" | "One-time">("One-time");
  const [preTax, setPreTax] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showOneTimeList, setShowOneTimeList] = useState(false);

  const [editingIncome, setEditingIncome] = useState<typeof income[0] | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAddIncome = () => {
    if (!source.trim() || !amount || parseFloat(amount) <= 0 || !date) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    addIncome({
      source: source.trim(),
      amount: parseFloat(amount),
      frequency,
      preTax,
      date: date.toISOString(),
      notes: notes.trim()
    });

    toast.success("Income added successfully");
    setSource("");
    setAmount("");
    setFrequency("One-time");
    setPreTax(false);
    setDate(new Date());
    setNotes("");
  };

  const handleRemoveIncome = (id: string) => {
    removeIncome(id);
    toast.success("Income source removed");
  };

  const handleEditIncome = (entry: typeof income[0]) => {
    setEditingIncome(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingIncome || !editingIncome.source || !editingIncome.amount) return;

    updateIncome(editingIncome.id, { ...editingIncome, date: editingIncome.date });
    toast.success("Income updated");
    setIsEditModalOpen(false);
    setEditingIncome(null);
  };

  const monthlyTotal = calculateMonthlyIncome(income);
  const annualProjection = monthlyTotal * 12;

  const recurringIncomes = income.filter((i) => i.frequency !== "One-time");
  const oneTimeIncomes = income.filter((i) => i.frequency === "One-time");
  const sortedOneTime = [...oneTimeIncomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const IncomeCard = ({ entry }: { entry: typeof income[0] }) => {
    const isPast = entry.frequency === "One-time" ? new Date(entry.date) <= new Date() : false;

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

    return (
      <Card key={entry.id} className="shadow-sm border border-border bg-card">
        <CardContent className="flex justify-between items-center py-4">
          {/* Left: Source + Frequency/PreTax */}
          <div className="flex-1 flex flex-col justify-center">
            <h4 className="font-semibold text-foreground">{entry.source}</h4>
            <div className="flex gap-2 text-sm text-muted-foreground items-center">
              {entry.frequency !== "One-time" && <span>{entry.frequency}</span>}
              {entry.frequency !== "One-time" && <span>•</span>}
              <span>{entry.preTax ? "Pre-tax" : "Post-tax"}</span>
              {entry.frequency === "One-time" && <span>•</span>}
              {entry.frequency === "One-time" && <span>{format(new Date(entry.date), "PPP")}</span>}
            </div>
          </div>

          {/* Right: Amount + Notes + Edit/Delete */}
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold w-24 text-right", isPast ? "text-green-700" : "text-foreground")}>
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
            {isCurrentlySuspended() && (
              <div className="mr-2">
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{
                  entry.suspendedIndefinitely ? 'Suspended (indefinite)' : `Suspended until ${entry.suspendedTo ? format(new Date(entry.suspendedTo), 'PPP') : ''}`
                }</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditIncome(entry)}
              className="text-primary hover:bg-primary/10 hover:text-primary"
              aria-label="Edit income"
              title="Edit"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            {entry.frequency !== "One-time" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isCurrentlySuspended()) {
                    // Resume
                    resumeIncome(entry.id);
                    toast.success("Income resumed");
                  } else {
                    // Open suspend dialog
                    setSuspendStart(new Date());
                    setSuspendEnd(null);
                    setSuspendIndefinite(true);
                    setIsSuspendOpen(true);
                  }
                }}
                className={isCurrentlySuspended() ? "text-success hover:bg-success/10" : "text-amber-600 hover:bg-amber-600/10"}
                aria-label={isCurrentlySuspended() ? "Resume income" : "Suspend income"}
                title={isCurrentlySuspended() ? "Resume income" : "Suspend income"}
              >
                {isCurrentlySuspended() ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            )}
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{suspendStart ? format(suspendStart, 'PPP') : 'Pick a date'}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={suspendStart}
                      onSelect={(d) => d && setSuspendStart(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={suspendIndefinite}>
                        {suspendEnd ? format(suspendEnd, 'PPP') : 'Pick an end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={suspendEnd ?? undefined}
                        onSelect={(d) => d && setSuspendEnd(d)}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center space-x-2">
                    <Switch checked={suspendIndefinite} onCheckedChange={setSuspendIndefinite} />
                    <span className="text-sm text-muted-foreground">Indefinite</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  // Save suspension
                  suspendIncome(
                    entry.id,
                    suspendStart.toISOString(),
                    suspendIndefinite ? null : suspendEnd ? suspendEnd.toISOString() : null,
                    suspendIndefinite
                  );
                  toast.success('Income suspended');
                  setIsSuspendOpen(false);
                }}
              >
                Save
              </Button>
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
          <p className="text-muted-foreground">Track and manage your income sources</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-md border-success/20">
          <CardHeader>
            <CardTitle>Monthly Total</CardTitle>
            <CardDescription>Average monthly income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle>Annual Projection</CardTitle>
            <CardDescription>Estimated yearly income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(annualProjection)}</p>
          </CardContent>
        </Card>
      </div>

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
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-time">One-time</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pre-Tax */}
            <div className="space-y-2">
              <Label htmlFor="preTax">Pre-Tax Income?</Label>
              <div className="flex items-center space-x-2 h-10">
                <Switch id="preTax" checked={preTax} onCheckedChange={setPreTax} />
                <span className="text-sm text-muted-foreground">
                  {preTax ? "Yes (before taxes)" : "No (after taxes)"}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="date">{frequency === "One-time" ? "Date" : "Start Date"}</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" /> {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
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
          </div>

          <Button onClick={handleAddIncome} className="w-full bg-success hover:bg-success/90">
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
            <p className="text-center text-muted-foreground py-8">No recurring income recorded.</p>
          ) : (
            recurringIncomes.map((entry) => <IncomeCard key={entry.id} entry={entry} />)
          )}
        </CardContent>
      </Card>

      {/* One-Time Income Toggle */}
      {sortedOneTime.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowOneTimeList(!showOneTimeList)}>
            {showOneTimeList ? "Hide One-Time Incomes" : "View One-Time Incomes"}
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
                  onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={editingIncome.amount}
                    onChange={(e) =>
                      setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) })
                    }
                    className="pl-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editingIncome.frequency}
                  onValueChange={(value: any) => setEditingIncome({ ...editingIncome, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One-time">One-time</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Biweekly">Biweekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pre-Tax Income?</Label>
                <Switch
                  checked={editingIncome.preTax}
                  onCheckedChange={(val) => setEditingIncome({ ...editingIncome, preTax: val })}
                />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      {editingIncome.date ? format(new Date(editingIncome.date), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(editingIncome.date)}
                      onSelect={(newDate) =>
                        newDate &&
                        setEditingIncome({ ...editingIncome, date: newDate.toISOString() })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editingIncome.notes}
                  onChange={(e) => setEditingIncome({ ...editingIncome, notes: e.target.value.slice(0, 200) })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSaveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
