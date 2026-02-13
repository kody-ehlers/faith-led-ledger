import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { useFinanceStore } from "@/store/financeStore";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from "date-fns";
import { formatCurrency } from "@/utils/calculations";
import CleanPieChart from "@/components/CleanPieChart";

type TimePeriod = "MTD" | "3M" | "6M" | "12M" | "YTD" | "MONTH";

export default function Statistics() {
  const { expenses, subscriptions, bills, savings, debts, investments, income, tithes } = useFinanceStore();
  const [period, setPeriod] = useState<TimePeriod>("MTD");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  const getDateRange = () => {
    const now = new Date();
    if (period === "MONTH") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    switch (period) {
      case "MTD": return { start: startOfMonth(now), end: now };
      case "3M": return { start: subMonths(now, 3), end: now };
      case "6M": return { start: subMonths(now, 6), end: now };
      case "12M": return { start: subMonths(now, 12), end: now };
      case "YTD": return { start: startOfYear(now), end: now };
    }
  };

  const { start, end } = getDateRange();

  // ── ALL Money Out (expenses + bills + subs + debt payments + tithe) ──
  const expensesInPeriod = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const billsInPeriod = bills.reduce((sum, b) => {
    return sum + (b.paidMonths || []).filter((pm) => {
      const [y, m] = pm.split("-").map(Number);
      const d = new Date(y, m - 1, 15);
      return d >= start && d <= end;
    }).reduce((s, pm) => s + (b.variablePrice ? (b.monthlyPrices?.[pm] || b.amount) : b.amount), 0);
  }, 0);

  const subsInPeriod = subscriptions.reduce((sum, s) => {
    return sum + (s.paidMonths || []).filter((pm) => {
      const [y, m] = pm.split("-").map(Number);
      const d = new Date(y, m - 1, 15);
      return d >= start && d <= end;
    }).reduce((s2, pm) => s2 + (s.variablePrice ? (s.monthlyPrices?.[pm] || s.amount) : s.amount), 0);
  }, 0);

  const debtPaymentsInPeriod = debts.reduce((sum, d) => {
    return sum + (d.paymentHistory || [])
      .filter((p) => { const pd = new Date(p.date); return pd >= start && pd <= end; })
      .reduce((s, p) => s + p.amount, 0);
  }, 0);

  const titheInPeriod = tithes
    .filter((t) => { const d = new Date(t.date); return d >= start && d <= end; })
    .reduce((sum, t) => sum + t.amount, 0);

  // ── ALL Money In (income + investment earnings + savings interest) ──
  const incomeInPeriod = income.reduce((sum, inc) => {
    if (inc.preTax) return sum;
    if (inc.frequency === "One-time") {
      const d = new Date(inc.date);
      if (d >= start && d <= end) return sum + inc.amount;
      return sum;
    }
    // Estimate recurring: months * amount
    const monthsInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    let monthlyEquiv = inc.amount;
    switch (inc.frequency) {
      case "Weekly": monthlyEquiv = inc.amount * 4.33; break;
      case "Biweekly": monthlyEquiv = inc.amount * 2.17; break;
      case "Bimonthly": monthlyEquiv = inc.amount * 0.5; break;
      case "Quarterly": monthlyEquiv = inc.amount / 3; break;
      case "Yearly": monthlyEquiv = inc.amount / 12; break;
    }
    return sum + monthlyEquiv * monthsInPeriod;
  }, 0);

  const investmentEarningsInPeriod = investments.reduce((sum, inv) => {
    return sum + (inv.earningsHistory || [])
      .filter((e) => e.amount > 0 && new Date(e.date) >= start && new Date(e.date) <= end)
      .reduce((s, e) => s + e.amount, 0);
  }, 0);

  const savingsInterestInPeriod = savings.reduce((sum, s) => {
    return sum + (s.interestHistory || [])
      .filter((h) => new Date(h.date) >= start && new Date(h.date) <= end)
      .reduce((s2, h) => s2 + h.amount, 0);
  }, 0);

  const totalMoneyIn = incomeInPeriod + investmentEarningsInPeriod + savingsInterestInPeriod;
  const expenseTotal = expensesInPeriod.reduce((s, e) => s + e.amount, 0);
  const totalMoneyOut = expenseTotal + billsInPeriod + subsInPeriod + debtPaymentsInPeriod + titheInPeriod;
  const netSavings = Math.max(0, totalMoneyIn - totalMoneyOut);

  const overallData = [
    { name: "Money Out", value: totalMoneyOut },
    { name: "Net Savings", value: netSavings },
  ];

  // Expense breakdown by category
  const expensesByCategory: Record<string, number> = {};
  expensesInPeriod.forEach((e) => {
    const cat = e.category || "Other";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
  });
  if (subsInPeriod > 0) expensesByCategory["Subscriptions"] = subsInPeriod;
  if (billsInPeriod > 0) expensesByCategory["Bills"] = billsInPeriod;
  if (debtPaymentsInPeriod > 0) expensesByCategory["Debt Payments"] = debtPaymentsInPeriod;
  if (titheInPeriod > 0) expensesByCategory["Tithe"] = titheInPeriod;

  const expenseData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const periodLabel = period === "MONTH"
    ? monthOptions.find((m) => m.value === selectedMonth)?.label
    : period;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 3v18h18" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Statistics</h2>
          <p className="text-muted-foreground">Financial insights and trends</p>
        </div>
      </div>

      {/* Time Period */}
      <Card>
        <CardHeader>
          <CardTitle>Time Period</CardTitle>
          <CardDescription>Select a time period to view</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["MTD", "3M", "6M", "12M", "YTD", "MONTH"] as TimePeriod[]).map((p) => (
              <Button key={p} variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
                {p === "MONTH" ? "Month" : p}
              </Button>
            ))}
          </div>
          {period === "MONTH" && (
            <div className="max-w-xs">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Money In vs Money Out */}
      <Card>
        <CardHeader>
          <CardTitle>Money In vs Money Out</CardTitle>
          <CardDescription>All income sources vs all outflows for {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total In</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalMoneyIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Out</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalMoneyOut)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Net</p>
              <p className={`text-2xl font-bold ${netSavings >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(netSavings)}
              </p>
            </div>
          </div>
          <CleanPieChart data={overallData.filter((d) => d.value > 0)} height={280} />
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Breakdown</CardTitle>
          <CardDescription>All outflows by category</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseData.length > 0 ? (
            <>
              <CleanPieChart data={expenseData} height={300} />
              <div className="mt-4 space-y-2">
                {expenseData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No expenses recorded for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
