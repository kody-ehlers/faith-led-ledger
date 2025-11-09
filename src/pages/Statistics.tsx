import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useFinanceStore } from "@/store/financeStore";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

type TimePeriod = "MTD" | "3M" | "6M" | "12M" | "YTD";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

export default function Statistics() {
  const { expenses, subscriptions, bills, savings } = useFinanceStore();
  const [period, setPeriod] = useState<TimePeriod>("MTD");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "MTD":
        return { start: startOfMonth(now), end: now };
      case "3M":
        return { start: subMonths(now, 3), end: now };
      case "6M":
        return { start: subMonths(now, 6), end: now };
      case "12M":
        return { start: subMonths(now, 12), end: now };
      case "YTD":
        return { start: startOfYear(now), end: now };
    }
  };

  const { start, end } = getDateRange();

  // Calculate expenses in period
  const expensesInPeriod = expenses.filter((e) => {
    const expenseDate = new Date(e.date);
    return expenseDate >= start && expenseDate <= end;
  });

  // Calculate subscriptions in period
  const subsInPeriod = subscriptions.filter((s) => {
    const subDate = new Date(s.date);
    return subDate >= start && subDate <= end;
  });

  // Calculate bills in period
  const billsInPeriod = bills.filter((b) => {
    const billDate = new Date(b.date);
    return billDate >= start && billDate <= end;
  });

  // Calculate total expenses by category
  const expensesByCategory = expensesInPeriod.reduce((acc, exp) => {
    const category = exp.category || "Other";
    acc[category] = (acc[category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  // Add subscriptions and bills
  const totalSubs = subsInPeriod.reduce((sum, s) => sum + s.amount, 0);
  const totalBills = billsInPeriod.reduce((sum, b) => sum + b.amount, 0);

  if (totalSubs > 0) expensesByCategory["Subscriptions"] = totalSubs;
  if (totalBills > 0) expensesByCategory["Bills"] = totalBills;

  const expenseData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0);

  // Calculate income for the period (using monthly income for simplicity)
  const { income: incomeEntries } = useFinanceStore.getState();
  const totalIncome = incomeEntries.reduce((sum, inc) => {
    if (inc.frequency === "One-time") {
      const incomeDate = new Date(inc.date);
      if (incomeDate >= start && incomeDate <= end) {
        return sum + inc.amount;
      }
    } else {
      // For recurring income, calculate based on period
      const monthsInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const monthlyAmount = inc.amount;
      return sum + (monthlyAmount * monthsInPeriod);
    }
    return sum;
  }, 0);

  // Calculate net savings (income - expenses)
  const netSavings = Math.max(0, totalIncome - totalExpenses);

  // Overall data including net savings
  const overallData = [
    { name: "Expenses", value: totalExpenses },
    { name: "Savings", value: netSavings },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M3 3v18h18"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Statistics</h2>
          <p className="text-muted-foreground">Financial insights and trends</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Period</CardTitle>
          <CardDescription>Select a time period to view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(["MTD", "3M", "6M", "12M", "YTD"] as TimePeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses vs Savings</CardTitle>
          <CardDescription>
            Overview of expenses and savings for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallData.length > 0 && overallData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={overallData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {overallData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(value)
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              No data available for this period.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of expenses by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(value)
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {expenseData.map((item) => (
                  <div
                    key={item.name}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No expenses recorded for this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
