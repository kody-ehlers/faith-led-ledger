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
} from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Heart, ShoppingCart, PiggyBank } from "lucide-react";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function Home() {
  const { income, expenses, savings, debts } = useFinanceStore();
  
  const monthlyIncome = calculateMonthlyIncome(income);
  const postTaxIncome = calculatePostTaxIncome(income);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);
  const titheAmount = calculateTitheAmount(postTaxIncome);
  const netWorth = calculateNetWorth(savings, debts);
  const totalSavings = savings.reduce((sum, acc) => sum + acc.currentAmount, 0);
  
  const categoryData = Object.entries(calculateCategoryTotals(expenses))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Helper function to count occurrences of a payment frequency in a month
  const countOccurrencesInMonth = (startDate: Date, frequency: string, targetMonth: Date, today: Date): number => {
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);
    const endDate = monthEnd < today ? monthEnd : today;
    
    // Normalize start date to beginning of day for comparison
    const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    
    if (normalizedStart > endDate) return 0;
    
    const interval = frequency === 'Weekly' ? 7 : 14;
    let count = 0;
    let currentDate = new Date(normalizedStart);
    
    // Move forward until we're past the end date or in the target month
    while (currentDate <= endDate) {
      // Check if this payment date falls within the target month
      if (currentDate >= monthStart && currentDate <= monthEnd) {
        count++;
      }
      currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000);
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
      const contributionAmount = getEntryIncomeForMonth(inc, date, /*includePreTax*/ true);
      if (contributionAmount > 0) {
        incomeBreakdown.push({ source: inc.source, amount: contributionAmount });
      }
      return sum + contributionAmount;
    }, 0);

    return { month: monthName, year, income: monthlyAmount, label: `${monthName} ${year}`, breakdown: incomeBreakdown };
  });

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
                "Honor the Lord with your wealth and with the best part of everything you produce."
              </p>
              <p className="text-sm text-muted-foreground font-medium">Proverbs 3:9-10 (NLT)</p>
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
          <p className={`text-5xl font-bold ${netWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
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
            <div className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</div>
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
            <div className="text-2xl font-bold text-destructive">{formatCurrency(monthlyExpenses)}</div>
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
            <div className="text-2xl font-bold text-accent">{formatCurrency(titheAmount)}</div>
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
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalSavings)}</div>
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Income Over Past Year Bar Chart */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Income Over the Past Year</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyIncomeData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                className="text-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
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
                            <p className="text-xs text-muted-foreground font-medium mb-1">Sources:</p>
                            {data.breakdown.map((item: { source: string; amount: number }, idx: number) => (
                              <div key={idx} className="text-sm flex justify-between gap-4">
                                <span className="text-muted-foreground">{item.source}</span>
                                <span className="font-medium">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
