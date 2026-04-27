import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/utils/calculations";
import {  Target, TrendingUp, PiggyBank, AlertTriangle, ChevronLeft, ChevronRight, Heart, Church } from "lucide-react";
import {
  startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isBefore, isAfter,
} from "date-fns";

export default function Budget() {
  const { expenses, bills, subscriptions, debts, income, tithes, expenseCategories } = useFinanceStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeframe, setTimeframe] = useState("single");

  // Budget goals stored in local state with month key
  const [goals, setGoals] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem("budget-goals");
    return saved ? JSON.parse(saved) : {};
  });

  const saveGoals = (updated: Record<string, Record<string, number>>) => {
    setGoals(updated);
    localStorage.setItem("budget-goals", JSON.stringify(updated));
  };

  // Get month key from a date
  const getMonthKey = (date: Date) => date.toISOString().slice(0, 7);

  // Get the date range based on timeframe
  const getDateRange = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    if (timeframe === "single") {
      return { start, end, label: selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
    }

    const monthsToGoBack = timeframe === "3months" ? 2 : timeframe === "6months" ? 5 : timeframe === "12months" ? 11 : 0;
    const rangeStart = startOfMonth(subMonths(selectedDate, monthsToGoBack));
    const rangeLabel = monthsToGoBack === 0 ? "Single Month" : `Last ${monthsToGoBack + 1} Months`;

    return { start: rangeStart, end, label: rangeLabel };
  };

  const dateRange = getDateRange();
  const currentMonthKey = getMonthKey(selectedDate);

  // Calculate spending per category
  const categorySpending: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (!isBefore(d, dateRange.start) && !isAfter(d, dateRange.end)) {
      categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
    }
  });

  // Calculate fixed monthly costs
  const calculateFixedCosts = () => {
    let totalBills = 0;
    let totalSubs = 0;
    let totalDebt = 0;
    let totalTithe = 0;

    // For single month view, show MTD for current month; for multi-month, show averages
    if (timeframe === "single") {
      totalBills = bills.reduce((sum, b) => {
        if (b.paidMonths?.includes(currentMonthKey)) {
          return sum + (b.variablePrice ? (b.monthlyPrices?.[currentMonthKey] || b.amount) : b.amount);
        }
        if (b.autopay) {
          const day = new Date(b.date).getDate();
          const due = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
          if (due <= selectedDate) return sum + b.amount;
        }
        return sum;
      }, 0);

      totalSubs = subscriptions.reduce((sum, s) => {
        if (s.paidMonths?.includes(currentMonthKey)) {
          return sum + (s.variablePrice ? (s.monthlyPrices?.[currentMonthKey] || s.amount) : s.amount);
        }
        if (s.autopay) {
          const day = new Date(s.date).getDate();
          const due = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
          if (due <= selectedDate) return sum + s.amount;
        }
        return sum;
      }, 0);

      totalDebt = debts.reduce((sum, d) =>
        sum + (d.paymentHistory || []).filter((p) => p.date.startsWith(currentMonthKey)).reduce((s, p) => s + p.amount, 0), 0);

      totalTithe = tithes.filter((t) => t.date.startsWith(currentMonthKey)).reduce((sum, t) => sum + t.amount, 0);
    } else {
      // Average across months in range
      let monthCount = 0;
      let currentMonth = new Date(dateRange.start);

      while (!isAfter(currentMonth, dateRange.end)) {
        monthCount++;
        const monthKey = getMonthKey(currentMonth);

        totalBills += bills.reduce((sum, b) => {
          if (b.paidMonths?.includes(monthKey)) {
            return sum + (b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount);
          }
          if (b.autopay) {
            const day = new Date(b.date).getDate();
            const due = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            if (!isAfter(due, currentMonth)) return sum + b.amount;
          }
          return sum;
        }, 0);

        totalSubs += subscriptions.reduce((sum, s) => {
          if (s.paidMonths?.includes(monthKey)) {
            return sum + (s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount);
          }
          if (s.autopay) {
            const day = new Date(s.date).getDate();
            const due = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            if (!isAfter(due, currentMonth)) return sum + s.amount;
          }
          return sum;
        }, 0);

        totalDebt += debts.reduce((sum, d) =>
          sum + (d.paymentHistory || []).filter((p) => p.date.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0), 0);

        totalTithe += tithes.filter((t) => t.date.startsWith(monthKey)).reduce((sum, t) => sum + t.amount, 0);

        currentMonth = addMonths(currentMonth, 1);
      }

      // Average across months
      totalBills /= monthCount;
      totalSubs /= monthCount;
      totalDebt /= monthCount;
      totalTithe /= monthCount;
    }

    return { totalBills, totalSubs, totalDebt, totalTithe };
  };

  const { totalBills: billsMTD, totalSubs: subsMTD, totalDebt: debtPaymentsMTD, totalTithe: titheMTD } = calculateFixedCosts();
  const fixedCosts = billsMTD + subsMTD + debtPaymentsMTD;

  // Get goals for current month
  const monthGoals = goals[currentMonthKey] || {};

  // Set goal for a category
  const setGoal = (category: string, amount: number) => {
    const updated = { ...goals, [currentMonthKey]: { ...monthGoals, [category]: amount } };
    saveGoals(updated);
  };

  // Estimated monthly income
  const estimatedIncome = income.reduce((sum, inc) => {
    if (inc.preTax) return sum;
    if (inc.suspendedIndefinitely) return sum;
    switch (inc.frequency) {
      case "One-time": return sum;
      case "Weekly": return sum + inc.amount * 4.33;
      case "Biweekly": return sum + inc.amount * 2.17;
      case "Monthly": return sum + inc.amount;
      case "Bimonthly": return sum + inc.amount * 0.5;
      case "Quarterly": return sum + inc.amount / 3;
      case "Yearly": return sum + inc.amount / 12;
      default: return sum + inc.amount;
    }
  }, 0);

  const totalBudgetGoals = Object.values(monthGoals).reduce((s, v) => s + v, 0);
  const totalCategorySpending = Object.values(categorySpending).reduce((s, v) => s + v, 0);
  const potentialSavings = estimatedIncome - fixedCosts - titheMTD - totalBudgetGoals;
  const actualSavings = estimatedIncome - fixedCosts - titheMTD - totalCategorySpending;

  // Get all categories
  const allCategories = [...new Set([...expenseCategories, ...Object.keys(categorySpending), ...Object.keys(monthGoals)])].sort();

  const handlePreviousMonth = () => {
    setSelectedDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => addMonths(prev, 1));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Budget</h2>
          <p className="text-muted-foreground">Set spending goals and track your progress</p>
        </div>
      </div>


      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Church className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                The wise have wealth and luxury, but fools spend whatever they get.
              </p>
              <p className="text-sm text-muted-foreground font-medium">Proverbs 21:20 (NLT)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month/Timeframe Selector */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="timeframe" className="text-sm font-medium">
                Time Period
              </Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger id="timeframe" className="w-full md:w-48 mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="12months">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timeframe === "single" && (
              <div className="flex-1">
                <Label className="text-sm font-medium">Select Month</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                    className="p-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center flex-1">
                    <p className="font-medium">
                      {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    className="p-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 text-right">
              <p className="text-sm font-medium text-muted-foreground">
                {dateRange.label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(estimatedIncome)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fixed Costs (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(fixedCosts + titheMTD)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bills + Subs + Debt + Tithe</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <PiggyBank className="h-4 w-4" />
                If You Meet Goals
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${potentialSavings >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(potentialSavings)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Potential monthly savings</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Actual So Far
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${actualSavings >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(actualSavings)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on current spending</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Budgets */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>Set monthly spending limits for each category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allCategories.map((category) => {
            const spent = categorySpending[category] || 0;
            const goal = monthGoals[category] || 0;
            const percent = goal > 0 ? Math.min((spent / goal) * 100, 100) : 0;
            const over = goal > 0 && spent > goal;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{category}</span>
                    {over && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(spent)} {goal > 0 ? `/ ${formatCurrency(goal)}` : ""}
                    </span>
                    <div className="w-28">
                      <CurrencyInput
                        value={goal || null}
                        onChange={(v) => setGoal(category, v ?? 0)}
                        placeholder="Goal"
                      />
                    </div>
                  </div>
                </div>
                {goal > 0 && (
                  <Progress
                    value={percent}
                    className={`h-2 ${over ? "[&>div]:bg-destructive" : "[&>div]:bg-success"}`}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Savings Projection */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Monthly Savings Projection</CardTitle>
          <CardDescription>How meeting your budget goals impacts savings over time</CardDescription>
        </CardHeader>
        <CardContent>
          {potentialSavings > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[3, 6, 12].map((months) => (
                <Card key={months} className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">{months} Months</p>
                    <p className="text-2xl font-bold text-success mt-1">
                      {formatCurrency(potentialSavings * months)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your projected expenses exceed income. Try lowering some category budgets to see savings potential.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
