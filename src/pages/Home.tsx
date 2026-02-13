import { useFinanceStore } from "@/store/financeStore";
import {
  calculateMonthlyIncome,
  calculatePostTaxIncome,
  calculatePostTaxIncomeReceivedSoFar,
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
  isToday,
} from "date-fns";
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
  Clock,
} from "lucide-react";
import CleanPieChart from "@/components/CleanPieChart";

export default function Home() {
  const { income, expenses, savings, debts, bills, subscriptions, tithes, assets, investments } =
    useFinanceStore();

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);

  // ── MTD Income ──
  const incomeReceivedMTD = calculatePostTaxIncomeReceivedSoFar(income, now);
  const investmentEarningsMTD = investments.reduce((sum, inv) => {
    return sum + (inv.earningsHistory || [])
      .filter((e) => e.amount > 0 && e.date.startsWith(monthKey))
      .reduce((s, e) => s + e.amount, 0);
  }, 0);
  const savingsInterestMTD = savings.reduce((sum, s) => {
    return sum + (s.interestHistory || [])
      .filter((h) => h.date.startsWith(monthKey))
      .reduce((s2, h) => s2 + h.amount, 0);
  }, 0);
  const monthlyIncomeMTD = incomeReceivedMTD + investmentEarningsMTD + savingsInterestMTD;

  // ── MTD Expenses ──
  const expensesMTD = expenses
    .filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((sum, e) => sum + e.amount, 0);
  const billsMTD = bills.reduce((sum, b) => {
    if (!b.paidMonths?.includes(monthKey)) return sum;
    return sum + (b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount);
  }, 0);
  const subsMTD = subscriptions.reduce((sum, s) => {
    if (!s.paidMonths?.includes(monthKey)) {
      if (s.autopay) {
        try {
          const day = new Date(s.date).getDate();
          const due = new Date(now.getFullYear(), now.getMonth(), day);
          if (due <= now) return sum + (s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount);
        } catch { /* ignore */ }
      }
      return sum;
    }
    return sum + (s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount);
  }, 0);
  const debtPaymentsMTD = debts.reduce((sum, d) => {
    return sum + (d.paymentHistory || [])
      .filter((p) => p.date.startsWith(monthKey))
      .reduce((s, p) => s + p.amount, 0);
  }, 0);
  const monthlyExpensesMTD = expensesMTD + billsMTD + subsMTD + debtPaymentsMTD;

  // ── MTD Tithe ──
  const titheMTD = tithes
    .filter((t) => t.date.startsWith(monthKey) && new Date(t.date) <= now)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSavingsMTD = monthlyIncomeMTD - monthlyExpensesMTD - titheMTD;

  const netWorth = calculateNetWorth(assets, debts);

  // ── Spending by Category (includes bills & subs) ──
  const categoryTotals: Record<string, number> = {};
  expenses
    .filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .forEach((e) => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });

  // Add bills to category data
  bills.forEach((b) => {
    if (b.paidMonths?.includes(monthKey) || (b.autopay && new Date(now.getFullYear(), now.getMonth(), new Date(b.date).getDate()) <= now)) {
      const amt = b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount;
      categoryTotals["Bills"] = (categoryTotals["Bills"] || 0) + amt;
    }
  });

  // Add subscriptions to category data
  subscriptions.forEach((s) => {
    if (s.paidMonths?.includes(monthKey) || (s.autopay && new Date(now.getFullYear(), now.getMonth(), new Date(s.date).getDate()) <= now)) {
      const amt = s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount;
      categoryTotals["Subscriptions"] = (categoryTotals["Subscriptions"] || 0) + amt;
    }
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Today's Activity ──
  const todayItems: { label: string; amount: number; type: "income" | "expense" | "bill" | "subscription" | "debt" }[] = [];

  // Income due today
  const getIncomeForDay = (day: Date) => {
    const list: { source: string; amount: number }[] = [];
    for (const inc of income) {
      const start = new Date(inc.date);
      const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const isSuspendedOn = (entry: typeof inc, d: Date) => {
        if (!entry.suspendedFrom) return false;
        const from = new Date(entry.suspendedFrom);
        if (from > d) return false;
        if (entry.suspendedIndefinitely) return true;
        if (entry.suspendedTo) return d <= new Date(entry.suspendedTo);
        return false;
      };
      if (inc.frequency === "One-time") {
        if (isSameDay(new Date(inc.date), dayOnly) && !isSuspendedOn(inc, dayOnly))
          list.push({ source: inc.source, amount: getAmountForDate(inc, dayOnly) });
        continue;
      }
      let occ = new Date(start);
      const advance = (d: Date) => {
        switch (inc.frequency) {
          case "Weekly": return addDays(d, 7);
          case "Biweekly": return addDays(d, 14);
          case "Monthly": return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
          case "Bimonthly": return new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
          case "Quarterly": return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate());
          case "Yearly": return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
          default: return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
      };
      let guard = 0;
      while (occ < dayOnly && guard++ < 500) occ = advance(occ);
      if (isSameDay(occ, dayOnly) && !isSuspendedOn(inc, dayOnly))
        list.push({ source: inc.source, amount: getAmountForDate(inc, dayOnly) });
    }
    return list;
  };

  const todayIncome = getIncomeForDay(now);
  todayIncome.forEach((i) => todayItems.push({ label: i.source, amount: i.amount, type: "income" }));

  // Bills due today
  bills.forEach((b) => {
    const day = new Date(b.date).getDate();
    if (day === now.getDate()) {
      const paid = b.paidMonths?.includes(monthKey);
      todayItems.push({
        label: `${b.name}${paid ? " ✓" : b.autopay ? " (autopay)" : " ⚠"}`,
        amount: b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount,
        type: "bill",
      });
    }
  });

  // Subscriptions due today
  subscriptions.forEach((s) => {
    const day = new Date(s.date).getDate();
    if (day === now.getDate()) {
      const paid = s.paidMonths?.includes(monthKey);
      todayItems.push({
        label: `${s.name}${paid ? " ✓" : s.autopay ? " (autopay)" : " ⚠"}`,
        amount: s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount,
        type: "subscription",
      });
    }
  });

  // Debt autopayments today
  debts.forEach((d) => {
    if (d.autopay && d.autopayDay === now.getDate()) {
      todayItems.push({ label: `${d.name} (autopay)`, amount: d.minimumPayment, type: "debt" });
    }
  });

  // Calendar helpers
  const getExpensesForDay = (day: Date) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === dayStart.getFullYear() && d.getMonth() === dayStart.getMonth() && d.getDate() === dayStart.getDate();
    });
  };

  const getTithesForDay = (day: Date) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return tithes.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === dayStart.getFullYear() && d.getMonth() === dayStart.getMonth() && d.getDate() === dayStart.getDate();
    });
  };

  const getSubscriptionsForDay = (day: Date) => {
    const list: { name: string; amount: number }[] = [];
    for (const s of subscriptions) {
      const start = new Date(s.date);
      const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const isCancelledOn = (entry: typeof s, d: Date) => {
        if (!entry.cancelledFrom) return false;
        const from = new Date(entry.cancelledFrom);
        if (from > d) return false;
        if (entry.cancelledIndefinitely) return true;
        if (entry.cancelledTo) return d <= new Date(entry.cancelledTo);
        return false;
      };
      if ((s.frequency as string) === "One-time") {
        if (isSameDay(new Date(s.date), dayOnly) && !isCancelledOn(s, dayOnly))
          list.push({ name: s.name, amount: getAmountForDate(s as unknown as IncomeEntry, dayOnly) });
        continue;
      }
      let occ = new Date(start);
      const advance = (d: Date) => {
        switch (s.frequency) {
          case "Weekly": return addDays(d, 7);
          case "Biweekly": return addDays(d, 14);
          case "Monthly": return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
          case "Bimonthly": return new Date(d.getFullYear(), d.getMonth() + 2, d.getDate());
          case "Quarterly": return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate());
          case "Yearly": return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
          default: return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
      };
      let guard = 0;
      while (occ < dayOnly && guard++ < 500) occ = advance(occ);
      if (isSameDay(occ, dayOnly) && !isCancelledOn(s, dayOnly))
        list.push({ name: s.name, amount: getAmountForDate(s as unknown as IncomeEntry, dayOnly) });
    }
    return list;
  };

  const getBillsForDay = (day: Date) => {
    const list: { name: string; amount: number }[] = [];
    bills.forEach((b) => {
      const billDay = new Date(b.date).getDate();
      if (billDay === day.getDate() && isSameMonth(day, now)) {
        list.push({ name: b.name, amount: b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount });
      }
    });
    return list;
  };

  const [focusedMonth, setFocusedMonth] = useState<Date>(startOfMonth(now));
  const monthsToShow = [startOfMonth(focusedMonth)];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                "Honor the Lord with your wealth and with the best part of everything you produce."
              </p>
              <p className="text-sm text-muted-foreground font-medium">Proverbs 3:9-10 (NLT)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Worth */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-5xl font-bold ${netWorth >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(netWorth)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Assets - Liabilities</p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income (MTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(monthlyIncomeMTD)}</div>
            <p className="text-xs text-muted-foreground mt-1">All income + interest + earnings</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses (MTD)</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(monthlyExpensesMTD)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bills + subs + expenses + debt</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tithe (MTD)</CardTitle>
            <Heart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(titheMTD)}</div>
            <p className="text-xs text-muted-foreground mt-1">Contributions this month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Savings (MTD)</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSavingsMTD >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(totalSavingsMTD)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Income − Expenses − Tithe</p>
          </CardContent>
        </Card>
      </div>

      {/* Today Section */}
      {todayItems.length > 0 && (
        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today — {format(now, "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === "income" ? "bg-success" : "bg-destructive"
                    }`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    item.type === "income" ? "text-success" : "text-destructive"
                  }`}>
                    {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spending by Category */}
      {categoryData.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Spending by Category (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CleanPieChart data={categoryData} height={300} />
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Calendar — Cashflow by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded hover:bg-muted/10" onClick={() => setFocusedMonth(addMonths(focusedMonth, -1))}><ChevronLeft className="h-4 w-4" /></button>
                <button className="p-2 rounded hover:bg-muted/10" onClick={() => setFocusedMonth(startOfMonth(new Date()))}><CalendarIcon className="h-4 w-4" /></button>
                <button className="p-2 rounded hover:bg-muted/10" onClick={() => setFocusedMonth(addMonths(focusedMonth, 1))}><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="text-sm text-muted-foreground">Use arrows to navigate months</div>
            </div>
            <div className="px-2">
              {monthsToShow.map((month) => {
                const mStart = startOfMonth(month);
                const mEnd = endOfMonth(month);
                const gStart = startOfWeek(mStart, { weekStartsOn: 0 });
                const gEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
                const monthDays: Date[] = [];
                for (let d = gStart; d <= gEnd; d = addDays(d, 1)) monthDays.push(new Date(d));

                return (
                  <div key={month.toISOString()} className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{format(mStart, "MMMM yyyy")}</div>
                      <div className="text-xs text-muted-foreground">
                        {isSameMonth(month, now) ? "This month" : ""}
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {monthDays.map((d) => {
                        const inList = getIncomeForDay(d);
                        const incomeTotal = inList.reduce((s, it) => s + it.amount, 0);
                        const expensesList = getExpensesForDay(d);
                        const expensesTotal = expensesList.reduce((s, e) => s + e.amount, 0);
                        const subsList = getSubscriptionsForDay(d);
                        const subsTotal = subsList.reduce((s, it) => s + it.amount, 0);
                        const billsList = getBillsForDay(d);
                        const billsTotal = billsList.reduce((s, it) => s + it.amount, 0);
                        const titheList = getTithesForDay(d);
                        const titheTotal = titheList.reduce((s, t) => s + t.amount, 0);
                        const muted = !isSameMonth(d, mStart);
                        const today = isToday(d);

                        return (
                          <Tooltip key={d.toISOString()}>
                            <TooltipTrigger asChild>
                              <div className={`min-h-[80px] p-2 rounded border ${
                                today ? "border-primary/50 bg-primary/5" :
                                muted ? "bg-muted/5 text-muted-foreground" : "bg-card"
                              } hover:shadow-sm`}>
                                <div className="flex justify-between items-start">
                                  <div className={`text-sm font-medium ${muted ? "opacity-60" : ""} ${today ? "text-primary font-bold" : ""}`}>
                                    {format(d, "d")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{format(d, "EEE")}</div>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {incomeTotal > 0 && (
                                    <div className="text-success font-semibold text-sm">+{formatCurrency(incomeTotal)}</div>
                                  )}
                                  {expensesTotal + subsTotal + billsTotal + titheTotal > 0 && (
                                    <div className="text-destructive font-semibold text-sm">
                                      -{formatCurrency(expensesTotal + subsTotal + billsTotal + titheTotal)}
                                    </div>
                                  )}
                                  {incomeTotal === 0 && expensesTotal + subsTotal + billsTotal === 0 && (
                                    <div className="text-sm text-muted-foreground">No activity</div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="w-80">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm">{format(d, "PPP")}</Label>
                                  <div className="text-sm">
                                    Net: {formatCurrency(incomeTotal - (expensesTotal + subsTotal + billsTotal))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Income</div>
                                  {inList.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">None</div>
                                  ) : (
                                    <div className="space-y-1">
                                      {inList.map((it, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <div className="text-sm">{it.source}</div>
                                          <div className="text-sm font-medium">{formatCurrency(it.amount)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Expenses, Bills & Tithe</div>
                                  {expensesList.length === 0 && subsList.length === 0 && billsList.length === 0 && titheList.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">None</div>
                                  ) : (
                                    <div className="space-y-1">
                                      {expensesList.map((e) => (
                                        <div key={e.id} className="flex justify-between">
                                          <div className="text-sm">{e.name || e.category}</div>
                                          <div className="text-sm font-medium">{formatCurrency(e.amount)}</div>
                                        </div>
                                      ))}
                                      {billsList.map((b, idx) => (
                                        <div key={`bill-${idx}`} className="flex justify-between">
                                          <div className="text-sm">{b.name} (Bill)</div>
                                          <div className="text-sm font-medium">{formatCurrency(b.amount)}</div>
                                        </div>
                                      ))}
                                      {subsList.map((s, idx) => (
                                        <div key={`sub-${idx}`} className="flex justify-between">
                                          <div className="text-sm">{s.name}</div>
                                          <div className="text-sm font-medium">{formatCurrency(s.amount)}</div>
                                        </div>
                                      ))}
                                      {titheList.map((t) => (
                                        <div key={t.id} className="flex justify-between">
                                          <div className="text-sm">Tithe</div>
                                          <div className="text-sm font-medium">{formatCurrency(t.amount)}</div>
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
        </CardContent>
      </Card>
    </div>
  );
}
