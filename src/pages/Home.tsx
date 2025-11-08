import { useFinanceStore } from "@/store/financeStore";
import {
  calculateMonthlyIncome,
  calculatePostTaxIncome,
  calculateTitheAmount,
  calculateMonthlyExpenses,
  calculateNetWorth,
  formatCurrency,
  calculateCategoryTotals,
  getEntryIncomeForMonth,
  getAmountForDate,
} from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncomeEntry, SubscriptionEntry } from "@/store/financeStore";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Heart,
  ShoppingCart,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

export default function Home() {
  const { income, expenses, savings, debts, subscriptions, tithes, assets } =
    useFinanceStore();

  const monthlyIncome = calculateMonthlyIncome(income);
  const postTaxIncome = calculatePostTaxIncome(income);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);
  const titheAmount = calculateTitheAmount(postTaxIncome);
  const netWorth = calculateNetWorth(assets, debts);
  const totalSavings = savings.reduce((sum, acc) => sum + acc.currentAmount, 0);

  const categoryData = Object.entries(calculateCategoryTotals(expenses))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Helper function to count occurrences of a payment frequency in a month
  const countOccurrencesInMonth = (
    startDate: Date,
    frequency: string,
    targetMonth: Date,
    today: Date
  ): number => {
    const monthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    const endDate = monthEnd < today ? monthEnd : today;

    // Normalize start date to beginning of day for comparison
    const normalizedStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    if (normalizedStart > endDate) return 0;

    const interval = frequency === "Weekly" ? 7 : 14;
    let count = 0;
    let currentDate = new Date(normalizedStart);

    // Move forward until we're past the end date or in the target month
    while (currentDate <= endDate) {
      // Check if this payment date falls within the target month
      if (currentDate >= monthStart && currentDate <= monthEnd) {
        count++;
      }
      currentDate = new Date(
        currentDate.getTime() + interval * 24 * 60 * 60 * 1000
      );
    }

    return count;
  };

  // Prepare last 12 months of income data
  const now = new Date();
  const monthlyIncomeData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthName = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    const incomeBreakdown: { source: string; amount: number }[] = [];

    // Use the shared calculation helper so amounts respect change history and suspensions
    const monthlyAmount = income.reduce((sum, inc) => {
      const contributionAmount = getEntryIncomeForMonth(
        inc,
        date,
        /*includePreTax*/ true,
        new Date()
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

  // Month navigation: keep track of the focused month (show one at a time)
  const [focusedMonth, setFocusedMonth] = useState<Date>(startOfMonth(now));
  const monthsToShow = [startOfMonth(focusedMonth)];

  const getIncomeForDay = (day: Date) => {
    // returns list of {source, amount}
    const list: { source: string; amount: number }[] = [];
    for (const inc of income) {
      // determine if an occurrence falls on this day
      const start = new Date(inc.date);
      const dayOnly = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      const isSuspendedOn = (entry: (typeof income)[0], d: Date) => {
        if (!entry.suspendedFrom) return false;
        const from = new Date(entry.suspendedFrom);
        if (from > d) return false;
        if (entry.suspendedIndefinitely) return true;
        if (entry.suspendedTo) {
          const to = new Date(entry.suspendedTo);
          return d <= to;
        }
        return false;
      };

      if (inc.frequency === "One-time") {
        const occ = new Date(inc.date);
        if (isSameDay(occ, dayOnly) && !isSuspendedOn(inc, dayOnly)) {
          list.push({
            source: inc.source,
            amount: getAmountForDate(inc, dayOnly),
          });
        }
        continue;
      }

      // recurring: walk occurrences forward from start until past the day (small loops, month-sized)
      let occ = new Date(start);
      const advance = (d: Date) => {
        switch (inc.frequency) {
          case "Weekly":
            return addDays(d, 7);
          case "Biweekly":
            return addDays(d, 14);
          case "Monthly":
            return addDays(
              new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
              0
            );
          case "Quarterly":
            return addDays(
              new Date(d.getFullYear(), d.getMonth() + 3, d.getDate()),
              0
            );
          case "Yearly":
            return addDays(
              new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()),
              0
            );
          default:
            return addDays(
              new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
              0
            );
        }
      };

      // fast-forward until occ >= dayOnly or beyond reasonable guard
      let guard = 0;
      while (occ < dayOnly && guard++ < 500) {
        occ = advance(occ);
      }

      if (isSameDay(occ, dayOnly) && !isSuspendedOn(inc, dayOnly)) {
        list.push({
          source: inc.source,
          amount: getAmountForDate(inc, dayOnly),
        });
      }
    }

    return list;
  };

  const getExpensesForDay = (day: Date) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return (
        d.getFullYear() === dayStart.getFullYear() &&
        d.getMonth() === dayStart.getMonth() &&
        d.getDate() === dayStart.getDate()
      );
    });
  };

  const getTithesForDay = (day: Date) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return tithes.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getFullYear() === dayStart.getFullYear() &&
        d.getMonth() === dayStart.getMonth() &&
        d.getDate() === dayStart.getDate()
      );
    });
  };

  const getSubscriptionsForDay = (day: Date) => {
    const list: { name: string; amount: number }[] = [];
    for (const s of subscriptions) {
      const start = new Date(s.date);
      const dayOnly = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      );

      const isCancelledOn = (entry: (typeof subscriptions)[0], d: Date) => {
        if (!entry.cancelledFrom) return false;
        const from = new Date(entry.cancelledFrom);
        if (from > d) return false;
        if (entry.cancelledIndefinitely) return true;
        if (entry.cancelledTo) {
          const to = new Date(entry.cancelledTo);
          return d <= to;
        }
        return false;
      };

      if ((s.frequency as string) === "One-time") {
        const occ = new Date(s.date);
        if (isSameDay(occ, dayOnly) && !isCancelledOn(s, dayOnly)) {
          list.push({
            name: s.name,
            amount: getAmountForDate(s as unknown as IncomeEntry, dayOnly),
          });
        }
        continue;
      }

      let occ = new Date(start);
      const advance = (d: Date) => {
        switch (s.frequency) {
          case "Weekly":
            return addDays(d, 7);
          case "Biweekly":
            return addDays(d, 14);
          case "Monthly":
            return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
          case "Quarterly":
            return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate());
          case "Yearly":
            return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
          default:
            return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
      };

      let guard = 0;
      while (occ < dayOnly && guard++ < 500) {
        occ = advance(occ);
      }

      if (isSameDay(occ, dayOnly) && !isCancelledOn(s, dayOnly)) {
        list.push({
          name: s.name,
          amount: getAmountForDate(s as unknown as IncomeEntry, dayOnly),
        });
      }
    }

    return list;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Scripture Section */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                "Honor the Lord with your wealth and with the best part of
                everything you produce."
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Proverbs 3:9-10 (NLT)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Worth Hero Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-5xl font-bold ${
              netWorth >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {formatCurrency(netWorth)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Assets - Liabilities
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(monthlyIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(monthlyExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tithe (10%)
            </CardTitle>
            <Heart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatCurrency(titheAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Savings
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalSavings)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Category */}
      {categoryData.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {/* Monthly Calendar: daily inflows vs outflows */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calendar — Cashflow by Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              <div className="text-center">Sun</div>
              <div className="text-center">Mon</div>
              <div className="text-center">Tue</div>
              <div className="text-center">Wed</div>
              <div className="text-center">Thu</div>
              <div className="text-center">Fri</div>
              <div className="text-center">Sat</div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded hover:bg-muted/10"
                  onClick={() => setFocusedMonth(addMonths(focusedMonth, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded hover:bg-muted/10"
                  onClick={() => setFocusedMonth(startOfMonth(new Date()))}
                  aria-label="Go to current month"
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded hover:bg-muted/10"
                  onClick={() => setFocusedMonth(addMonths(focusedMonth, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-muted-foreground">
                Use arrows to navigate months
              </div>
            </div>
            <div>
              <div className="px-2">
                {monthsToShow.map((month) => {
                  const mStart = startOfMonth(month);
                  const mEnd = endOfMonth(month);
                  const gStart = startOfWeek(mStart, { weekStartsOn: 0 });
                  const gEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
                  const monthDays: Date[] = [];
                  for (let d = gStart; d <= gEnd; d = addDays(d, 1))
                    monthDays.push(new Date(d));

                  return (
                    <div key={month.toISOString()} className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {format(mStart, "MMMM yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isSameMonth(month, now) ? "This month" : ""}
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {monthDays.map((d) => {
                          const inList = getIncomeForDay(d);
                          const incomeTotal = inList.reduce(
                            (s, it) => s + it.amount,
                            0
                          );
                          const expensesList = getExpensesForDay(d);
                          const expensesTotal = expensesList.reduce(
                            (s, e) => s + e.amount,
                            0
                          );
                          const subsList = getSubscriptionsForDay(d);
                          const subsTotal = subsList.reduce(
                            (s, it) => s + it.amount,
                            0
                          );
                          const titheList = getTithesForDay(d);
                          const titheTotal = titheList.reduce(
                            (s, t) => s + t.amount,
                            0
                          );
                          const muted = !isSameMonth(d, mStart);

                          return (
                            <Tooltip key={d.toISOString()}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`min-h-[80px] p-2 rounded border ${
                                    muted
                                      ? "bg-muted/5 text-muted-foreground"
                                      : "bg-card"
                                  } hover:shadow-sm`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div
                                      className={`text-sm font-medium ${
                                        muted ? "opacity-60" : ""
                                      }`}
                                    >
                                      {format(d, "d")}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(d, "EEE")}
                                    </div>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {incomeTotal > 0 && (
                                      <div className="text-success font-semibold text-sm">
                                        +{formatCurrency(incomeTotal)}
                                      </div>
                                    )}
                                    {expensesTotal + subsTotal + titheTotal >
                                      0 && (
                                      <div className="text-destructive font-semibold text-sm">
                                        -
                                        {formatCurrency(
                                          expensesTotal + subsTotal + titheTotal
                                        )}
                                      </div>
                                    )}
                                    {incomeTotal === 0 &&
                                      expensesTotal + subsTotal === 0 && (
                                        <div className="text-sm text-muted-foreground">
                                          No activity
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="w-80">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-sm">
                                      {format(d, "PPP")}
                                    </Label>
                                    <div className="text-sm">
                                      Net:{" "}
                                      {formatCurrency(
                                        incomeTotal -
                                          (expensesTotal + subsTotal)
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Income
                                    </div>
                                    {inList.length === 0 ? (
                                      <div className="text-sm text-muted-foreground">
                                        None
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {inList.map((it, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between"
                                          >
                                            <div className="text-sm">
                                              {it.source}
                                            </div>
                                            <div className="text-sm font-medium">
                                              {formatCurrency(it.amount)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Expenses & Tithe
                                    </div>
                                    {expensesList.length === 0 &&
                                    subsList.length === 0 &&
                                    titheList.length === 0 ? (
                                      <div className="text-sm text-muted-foreground">
                                        None
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {expensesList.map((e) => (
                                          <div
                                            key={e.id}
                                            className="flex justify-between"
                                          >
                                            <div className="text-sm">
                                              {e.name || e.category}
                                            </div>
                                            <div className="text-sm font-medium">
                                              {formatCurrency(e.amount)}
                                            </div>
                                          </div>
                                        ))}
                                        {subsList.map((s, idx) => (
                                          <div
                                            key={`sub-${idx}`}
                                            className="flex justify-between"
                                          >
                                            <div className="text-sm">
                                              {s.name}
                                            </div>
                                            <div className="text-sm font-medium">
                                              {formatCurrency(s.amount)}
                                            </div>
                                          </div>
                                        ))}
                                        {titheList.map((t) => (
                                          <div
                                            key={t.id}
                                            className="flex justify-between"
                                          >
                                            <div className="text-sm">Tithe</div>
                                            <div className="text-sm font-medium">
                                              {formatCurrency(t.amount)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
