import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/utils/calculations";
import { Target, TrendingUp, PiggyBank, AlertTriangle } from "lucide-react";

export default function Budget() {
  const { expenses, bills, subscriptions, debts, income, tithes, expenseCategories } = useFinanceStore();

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);

  // Budget goals stored in local state (could be persisted in store later)
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("budget-goals");
    return saved ? JSON.parse(saved) : {};
  });

  const saveGoals = (updated: Record<string, number>) => {
    setGoals(updated);
    localStorage.setItem("budget-goals", JSON.stringify(updated));
  };

  const setGoal = (category: string, amount: number) => {
    saveGoals({ ...goals, [category]: amount });
  };

  // Calculate MTD spending per category from expenses
  const categorySpending: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
    }
  });

  // Fixed monthly costs
  const billsMTD = bills.reduce((sum, b) => {
    if (b.paidMonths?.includes(monthKey)) {
      return sum + (b.variablePrice ? (b.monthlyPrices?.[monthKey] || b.amount) : b.amount);
    }
    if (b.autopay) {
      const day = new Date(b.date).getDate();
      const due = new Date(now.getFullYear(), now.getMonth(), day);
      if (due <= now) return sum + b.amount;
    }
    return sum;
  }, 0);

  const subsMTD = subscriptions.reduce((sum, s) => {
    if (s.paidMonths?.includes(monthKey)) {
      return sum + (s.variablePrice ? (s.monthlyPrices?.[monthKey] || s.amount) : s.amount);
    }
    if (s.autopay) {
      const day = new Date(s.date).getDate();
      const due = new Date(now.getFullYear(), now.getMonth(), day);
      if (due <= now) return sum + s.amount;
    }
    return sum;
  }, 0);

  const debtPaymentsMTD = debts.reduce((sum, d) =>
    sum + (d.paymentHistory || []).filter((p) => p.date.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0), 0);

  const titheMTD = tithes.filter((t) => t.date.startsWith(monthKey)).reduce((sum, t) => sum + t.amount, 0);

  const fixedCosts = billsMTD + subsMTD + debtPaymentsMTD;

  // Estimated monthly income (simple: sum of non-suspended monthly incomes)
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

  const totalBudgetGoals = Object.values(goals).reduce((s, v) => s + v, 0);
  const totalCategorySpending = Object.values(categorySpending).reduce((s, v) => s + v, 0);
  const potentialSavings = estimatedIncome - fixedCosts - titheMTD - totalBudgetGoals;
  const actualSavings = estimatedIncome - fixedCosts - titheMTD - totalCategorySpending;

  // Get all categories that have either a goal or spending
  const allCategories = [...new Set([...expenseCategories, ...Object.keys(categorySpending), ...Object.keys(goals)])].sort();

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
            const goal = goals[category] || 0;
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
