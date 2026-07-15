import { useEffect, useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculatePostTaxIncomeForMonth,
  formatCurrency,
  getRecurringOccurrencesInMonth,
  calculateTitheAmount,
  getRecurringAmountForOccurrence,
} from "@/utils/calculations";
import { Target, TrendingUp, PiggyBank, TriangleAlert as AlertTriangle, ChevronLeft, ChevronRight, Heart, Church, Copy, StickyNote } from "lucide-react";
import {
  startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isBefore, isAfter,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { RecurringFrequency } from "@/store/financeStore";

export default function Budget() {
  const { expenses, bills, subscriptions, debts, income, tithes, expenseCategories, investments } = useFinanceStore();

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

  // Budget notes: per-month, per-category free-form text.
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>(() => {
    const saved = localStorage.getItem("budget-notes");
    return saved ? JSON.parse(saved) : {};
  });

  const saveNotes = (updated: Record<string, Record<string, string>>) => {
    setNotes(updated);
    localStorage.setItem("budget-notes", JSON.stringify(updated));
  };

  const [openNotesCategory, setOpenNotesCategory] = useState<string | null>(null);

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

  // ---- Shared helpers for recurring bill/subscription math ----
  const today = new Date();

  const isCancelledOn = (
    item: { cancelledFrom?: string | null; cancelledTo?: string | null; cancelledIndefinitely?: boolean },
    date: Date
  ) => {
    if (!item.cancelledFrom) return false;
    const from = new Date(item.cancelledFrom);
    if (date < from) return false;
    if (item.cancelledIndefinitely) return true;
    if (item.cancelledTo) return date <= new Date(item.cancelledTo);
    return false;
  };

  type RecurringItem = {
    amount: number;
    date: string;
    frequency: RecurringFrequency;
    autopay?: boolean;
    variablePrice?: boolean;
    monthlyPrices?: { [m: string]: number };
    paidMonths?: string[];
    cancelledFrom?: string | null;
    cancelledTo?: string | null;
    cancelledIndefinitely?: boolean;
  };

  // Sum for a single month. `mtdOnly` caps autopay occurrences at "today" when
  // the month is the current month. `paidMonths` always counts (already paid).
  const sumRecurringForMonthKey = (
    item: RecurringItem,
    monthKey: string,
    mtdOnly: boolean
  ): number => {
    const [year, month] = monthKey.split("-").map(Number);
    const monthStartDate = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);

    const startDate = new Date(item.date);
    if (startDate > monthEndDate) return 0;

    const paidForMonth = item.paidMonths?.includes(monthKey) ?? false;
    if (!paidForMonth && !item.autopay) return 0;

    const occurrences = getRecurringOccurrencesInMonth(
      startDate,
      item.frequency as never,
      monthStartDate
    );
    const cutoff = paidForMonth || !mtdOnly || !isSameMonth(monthStartDate, today) ? monthEndDate : today;
    const counted = occurrences.filter((occ) => occ <= cutoff && !isCancelledOn(item, occ));
    return counted.reduce((sum, occ) => sum + getRecurringAmountForOccurrence(item, occ), 0);
  };

  // Calculate spending per category
  const categorySpending: Record<string, number> = {};
  const isInRange = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isBefore(d, dateRange.start) && !isAfter(d, dateRange.end);
  };

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (!isBefore(d, dateRange.start) && !isAfter(d, dateRange.end)) {
      categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
    }
  });

  const investmentContributionsInRange = investments.reduce((sum, inv) => {
    return sum + (inv.earningsHistory || [])
      .filter((e) => e.amount < 0 && isInRange(e.date))
      .reduce((s, e) => s + Math.abs(e.amount), 0);
  }, 0);
  if (investmentContributionsInRange > 0) {
    categorySpending["Investments"] = (categorySpending["Investments"] || 0) + investmentContributionsInRange;
  }

  const debtPaymentsInRange = debts.reduce((sum, d) => {
    return sum + (d.paymentHistory || [])
      .filter((p) => isInRange(p.date))
      .reduce((s, p) => s + p.amount, 0);
  }, 0);
  if (debtPaymentsInRange > 0) {
    categorySpending["Debt Payments"] = (categorySpending["Debt Payments"] || 0) + debtPaymentsInRange;
  }

  // Build month keys inside the range up front so we can reuse the helper.
  const rangeMonthKeys: string[] = (() => {
    const keys: string[] = [];
    let cur = startOfMonth(dateRange.start);
    while (!isAfter(cur, dateRange.end)) {
      keys.push(getMonthKey(cur));
      cur = addMonths(cur, 1);
    }
    return keys;
  })();

  const billSpendingInRange = bills.reduce(
    (sum, b) => sum + rangeMonthKeys.reduce((s, k) => s + sumRecurringForMonthKey(b, k, true), 0),
    0
  );
  if (billSpendingInRange > 0) {
    categorySpending["Bills"] = (categorySpending["Bills"] || 0) + billSpendingInRange;
  }

  const subscriptionSpendingInRange = subscriptions.reduce(
    (sum, s) => sum + rangeMonthKeys.reduce((k2, k) => k2 + sumRecurringForMonthKey(s, k, true), 0),
    0
  );
  if (subscriptionSpendingInRange > 0) {
    categorySpending["Subscriptions"] = (categorySpending["Subscriptions"] || 0) + subscriptionSpendingInRange;
  }

  const titheSpendingInRange = tithes
    .filter((t) => isInRange(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  if (titheSpendingInRange > 0) {
    categorySpending["Tithe"] = (categorySpending["Tithe"] || 0) + titheSpendingInRange;
  }

  const getMonthKeysInRange = () => {
    return rangeMonthKeys;
  };

  // Calculate fixed monthly costs
  const calculateFixedCosts = () => {
    const monthKeys = getMonthKeysInRange();

    let totalBills = 0;
    let totalSubs = 0;
    for (const key of monthKeys) {
      for (const b of bills) totalBills += sumRecurringForMonthKey(b, key, timeframe === "single");
      for (const s of subscriptions) totalSubs += sumRecurringForMonthKey(s, key, timeframe === "single");
    }

    let totalDebt = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    let totalTithe = tithes
      .filter((t) => monthKeys.some((k) => t.date.startsWith(k)))
      .reduce((sum, t) => sum + t.amount, 0);

    if (timeframe !== "single" && monthKeys.length > 0) {
      totalBills /= monthKeys.length;
      totalSubs /= monthKeys.length;
      totalTithe /= monthKeys.length;
    }

    return { totalBills, totalSubs, totalDebt, totalTithe };
  };

  const { totalBills: billsMTD, totalSubs: subsMTD, totalDebt: debtPaymentsMTD, totalTithe: titheMTD } = calculateFixedCosts();
  const fixedCosts = billsMTD + subsMTD + debtPaymentsMTD;

  // ---- Projected (full-period, not MTD) totals for each fixed category ----
  // Used to auto-suggest a default goal amount when the user hasn't set one.
  const projectedBills = bills.reduce(
    (sum, b) => sum + rangeMonthKeys.reduce((s, k) => s + sumRecurringForMonthKey(b, k, false), 0),
    0
  );
  const projectedSubs = subscriptions.reduce(
    (sum, s) => sum + rangeMonthKeys.reduce((s2, k) => s2 + sumRecurringForMonthKey(s, k, false), 0),
    0
  );
  const projectedDebt = debts.reduce((s, d) => s + d.minimumPayment, 0) * rangeMonthKeys.length;
  // Tithe projection: 10% of titheable post-tax income across the range.
  const titheableIncome = income.filter((i) => !i.notTitheable);
  const projectedTithe = rangeMonthKeys.reduce((sum, k) => {
    const [y, m] = k.split("-").map(Number);
    const monthDate = new Date(y, m - 1, 1);
    return sum + calculateTitheAmount(calculatePostTaxIncomeForMonth(titheableIncome, monthDate));
  }, 0);

  const categoryProjected: Record<string, number> = {
    Bills: projectedBills,
    Subscriptions: projectedSubs,
    "Debt Payments": projectedDebt,
    Tithe: projectedTithe,
  };

  // Get goals for current month
  const monthGoals = goals[currentMonthKey] || {};
  const monthNotes = notes[currentMonthKey] || {};

  // Set goal for a category
  const setGoal = (category: string, amount: number) => {
    const updated = { ...goals, [currentMonthKey]: { ...monthGoals, [category]: amount } };
    saveGoals(updated);
  };

  const setNote = (category: string, text: string) => {
    const next = { ...notes };
    const cur = { ...(next[currentMonthKey] || {}) };
    if (text.trim()) cur[category] = text;
    else delete cur[category];
    next[currentMonthKey] = cur;
    saveNotes(next);
  };

  const previousMonthKey = getMonthKey(subMonths(selectedDate, 1));
  const previousMonthGoals = goals[previousMonthKey] || {};
  const hasPreviousGoals = Object.keys(previousMonthGoals).length > 0;

  const goalMonths = Object.keys(goals)
    .filter((key) => key !== currentMonthKey && Object.keys(goals[key] || {}).length > 0)
    .sort((a, b) => (a < b ? 1 : -1));

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyDialogCategory, setCopyDialogCategory] = useState<string | null>(null);
  const firstGoalMonth = goalMonths[0] || previousMonthKey;
  const [copyDialogMonth, setCopyDialogMonth] = useState<string>(firstGoalMonth);

  useEffect(() => {
    setCopyDialogMonth(firstGoalMonth);
  }, [firstGoalMonth]);

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const copyGoalsFromMonth = (sourceMonthKey: string, category?: string) => {
    if (timeframe !== "single") {
      toast.error("Carry-over only works in single month view.");
      return;
    }

    const sourceGoals = goals[sourceMonthKey] || {};
    if (!sourceGoals || Object.keys(sourceGoals).length === 0) {
      toast.error("No goals found for the selected month.");
      return;
    }

    const updatedCurrentGoals = { ...monthGoals };
    if (category) {
      if (!(category in sourceGoals)) {
        toast.error("No saved goal for that category in the selected month.");
        return;
      }
      updatedCurrentGoals[category] = sourceGoals[category];
      toast.success(`Copied ${category} from ${formatMonthLabel(sourceMonthKey)}.`);
    } else {
      Object.assign(updatedCurrentGoals, sourceGoals);
      toast.success(`Copied budgets from ${formatMonthLabel(sourceMonthKey)}.`);
    }

    saveGoals({
      ...goals,
      [currentMonthKey]: updatedCurrentGoals,
    });
  };

  const monthlyIncome = calculatePostTaxIncomeForMonth(income, selectedDate);
  const recurringMonthlyIncome = calculatePostTaxIncomeForMonth(
    income.filter((item) => item.frequency !== "One-time"),
    selectedDate
  );

  const totalBudgetGoals = Object.values(monthGoals).reduce((s, v) => s + v, 0);
  const totalCategorySpending = Object.values(categorySpending).reduce((s, v) => s + v, 0);

  // Build the full-period "effective" budget: user-set goal per category, or the
  // projected/default cost when no goal is set (bills, subscriptions, debt min
  // payments, tithe). This makes "If You Meet Goals" account for recurring
  // fixed costs even when the user hasn't manually entered a goal for them.
  const categoriesForEffective = new Set<string>([
    ...Object.keys(monthGoals),
    ...Object.keys(categoryProjected),
  ]);
  const effectiveGoalsTotal = Array.from(categoriesForEffective).reduce((sum, cat) => {
    const userGoal = monthGoals[cat] || 0;
    const projected = categoryProjected[cat] || 0;
    return sum + (userGoal > 0 ? userGoal : projected);
  }, 0);

  const potentialSavings = monthlyIncome - effectiveGoalsTotal;
  const projectedSavings = recurringMonthlyIncome - effectiveGoalsTotal;
  const actualSpendingAboveMinDebt = Math.max(0, totalCategorySpending - debtPaymentsMTD);
  const actualSavings = monthlyIncome - fixedCosts - titheMTD - actualSpendingAboveMinDebt;

  // Compute total budget goals across the selected date range.
  // For fixed categories (Bills/Subs/Debt/Tithe) without a user-set goal,
  // fall back to the projected/expected cost so the "budgeted" figure
  // stays comparable to the "spent" figure (which counts those fixed costs).
  const monthKeysInRange = getMonthKeysInRange();
  const fixedFallbackCategories: Record<string, number> = {
    Bills: projectedBills,
    Subscriptions: projectedSubs,
    "Debt Payments": projectedDebt,
    Tithe: projectedTithe,
  };
  const totalBudgetGoalsRange = (() => {
    const userSum = monthKeysInRange.reduce((sum, key) => {
      const g = goals[key] || {};
      return sum + Object.values(g).reduce((s, v) => s + v, 0);
    }, 0);
    // Add projected fallback for fixed categories with no user goal in ANY month of the range.
    let fallback = 0;
    for (const [cat, projected] of Object.entries(fixedFallbackCategories)) {
      const userHasGoal = monthKeysInRange.some((k) => (goals[k]?.[cat] || 0) > 0);
      if (!userHasGoal) fallback += projected;
    }
    return userSum + fallback;
  })();

  // totalCategorySpending already sums spending across the dateRange
  const totalSpentRange = totalCategorySpending;
  const overUnderRange = totalSpentRange - totalBudgetGoalsRange; // positive = over, negative = under

  // Get all categories
  const allCategories = [...new Set([
    ...expenseCategories,
    ...Object.keys(categorySpending),
    ...Object.keys(monthGoals),
    "Investments",
    "Debt Payments",
    "Bills",
    "Subscriptions",
    "Tithe",
  ])].sort();

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fixed Costs (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(fixedCosts + titheMTD)}</p>
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
          </CardContent>
        </Card>
      </div>

      {/* Category Budgets */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Category Budgets</CardTitle>
            <CardDescription>Set monthly spending limits for each category</CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setCopyDialogCategory(null);
                    setCopyDialogOpen(true);
                  }}
                  disabled={timeframe !== "single" || goalMonths.length === 0}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Copy From another month
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                Copy all category goals from a previous month into this month.
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allCategories.map((category) => {
            const spent = categorySpending[category] || 0;

            // Sum goals across the timeframe for this category
            const userGoalRange = timeframe === "single"
              ? (monthGoals[category] || 0)
              : monthKeysInRange.reduce((s, key) => s + ((goals[key]?.[category]) || 0), 0);
            // Fall back to projected/expected for fixed categories when unset.
            const projected = categoryProjected[category] || 0;
            const goalRange = userGoalRange > 0 ? userGoalRange : projected;
            const isDefaultGoal = userGoalRange === 0 && projected > 0;

            const percent = goalRange > 0 ? Math.min((spent / goalRange) * 100, 100) : 0;
            const over = goalRange > 0 && spent > goalRange;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{category}</span>
                    {over && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                    <div className="text-sm text-muted-foreground text-right md:text-left">
                      <div>
                        {formatCurrency(spent)} {"/"} {formatCurrency(goalRange)}
                        {isDefaultGoal && (
                          <span className="ml-1 text-xs italic">(projected)</span>
                        )}
                      </div>
                      {projected > 0 && spent < projected && (
                        <div className="text-xs">
                          Upcoming: {formatCurrency(Math.max(0, projected - spent))}
                        </div>
                      )}
                    </div>
                    {timeframe === "single" && (
                      <>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                  setCopyDialogCategory(category);
                                  setCopyDialogOpen(true);
                                }}
                                disabled={goalMonths.length === 0}
                              >
                                <Copy className="mr-1 h-4 w-4" />
                                Copy From
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Copy this category's budget from another month.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={monthNotes[category] ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() =>
                                  setOpenNotesCategory(
                                    openNotesCategory === category ? null : category
                                  )
                                }
                              >
                                <StickyNote className="mr-1 h-4 w-4" />
                                Notes
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Add notes for this category (e.g. what you're budgeting for).
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="w-28">
                          <CurrencyInput
                            value={(monthGoals[category] || 0) || null}
                            onChange={(v) => setGoal(category, v ?? 0)}
                            placeholder={projected > 0 ? formatCurrency(projected) : "Goal"}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {timeframe === "single" && openNotesCategory === category && (
                  <Textarea
                    value={monthNotes[category] ?? ""}
                    onChange={(e) => setNote(category, e.target.value)}
                    placeholder="e.g. bags of sand, new shovel, birthday gift..."
                    rows={2}
                    className="text-sm"
                  />
                )}
                {timeframe === "single" && openNotesCategory !== category && monthNotes[category] && (
                  <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                    {monthNotes[category]}
                  </p>
                )}
                {goalRange > 0 && (
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

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Copy Budget Goals</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-3">
              <p className="text-sm font-medium mb-1">Copy from month</p>
              <Select
                value={copyDialogMonth}
                onValueChange={setCopyDialogMonth}
                disabled={goalMonths.length === 0}
              >
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue placeholder="Select source month" />
                </SelectTrigger>
                <SelectContent>
                  {goalMonths.map((monthKey) => (
                    <SelectItem key={monthKey} value={monthKey}>
                      {formatMonthLabel(monthKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {copyDialogCategory ? (
              <p className="text-sm text-muted-foreground">
                Copy only the <span className="font-medium">{copyDialogCategory}</span> category goal.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Copy all category goals from the selected month into this month.
              </p>
            )}
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                copyGoalsFromMonth(copyDialogMonth, copyDialogCategory || undefined);
                setCopyDialogOpen(false);
              }}
              disabled={goalMonths.length === 0}
            >
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeframe Summary */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Timeframe Summary</CardTitle>
          <CardDescription>Totals for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Budgeted</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudgetGoalsRange)}</p>
              <p className="text-xs text-muted-foreground mt-1">{timeframe === "single" ? "This month" : `${monthKeysInRange.length} months total`}</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpentRange)}</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground">Over / Under</p>
              <p className={`text-2xl font-bold ${overUnderRange > 0 ? "text-destructive" : "text-success"}`}>
                {overUnderRange >= 0 ? `Over ${formatCurrency(Math.abs(overUnderRange))}` : `Under ${formatCurrency(Math.abs(overUnderRange))}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Projection */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Monthly Savings Projection</CardTitle>
          <CardDescription>
            How meeting your budget goals impacts savings from recurring income.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectedSavings > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[3, 6, 12].map((months) => (
                <Card key={months} className="bg-muted/30">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">{months} Months</p>
                    <p className="text-2xl font-bold text-success mt-1">
                      {formatCurrency(projectedSavings * months)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Recurring monthly income does not cover these goals. One-time income is excluded from this longer-term projection.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
