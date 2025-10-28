import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { calculateMonthlyIncome, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, DollarSign, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Income() {
  const { income, addIncome, removeIncome } = useFinanceStore();
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Biweekly" | "Quarterly" | "Yearly" | "One-time">("Monthly");
  const [preTax, setPreTax] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

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
    });

    toast.success("Income source added successfully");
    setSource("");
    setAmount("");
    setFrequency("Monthly");
    setPreTax(false);
    setDate(new Date());
  };

  const handleRemoveIncome = (id: string) => {
    removeIncome(id);
    toast.success("Income source removed");
  };

  const monthlyTotal = calculateMonthlyIncome(income);
  const annualProjection = monthlyTotal * 12;

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
          <CardTitle>Add Income Source</CardTitle>
          <CardDescription>Record a new source of income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Source Name */}
            <div className="space-y-2">
              <Label htmlFor="source">Source Name</Label>
              <Input
                id="source"
                placeholder="e.g., Salary, Freelance, etc."
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
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

            {/* Pre-Tax Switch */}
            <div className="space-y-2">
              <Label htmlFor="preTax">Pre-Tax Income?</Label>
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  id="preTax"
                  checked={preTax}
                  onCheckedChange={setPreTax}
                />
                <span className="text-sm text-muted-foreground">
                  {preTax ? "Yes (before taxes)" : "No (after taxes)"}
                </span>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={handleAddIncome} className="w-full bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Income Source
          </Button>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <CardDescription>All your recorded income sources</CardDescription>
        </CardHeader>
        <CardContent>
          {income.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No income sources added yet. Start by adding your first source above.
            </p>
          ) : (
            <div className="space-y-3">
              {income.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{entry.source}</h4>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatCurrency(entry.amount)}</span>
                      <span>•</span>
                      <span>{entry.frequency}</span>
                      <span>•</span>
                      <span>{entry.preTax ? "Pre-tax" : "Post-tax"}</span>
                      <span>•</span>
                      <span>{entry.date ? new Date(entry.date).toLocaleDateString() : "-"}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIncome(entry.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
