import { useFinanceStore } from "@/store/financeStore";
import {
  calculateMonthlyIncome,
  calculatePostTaxIncome,
  calculateTitheAmount,
  calculateMonthlyExpenses,
  calculateNetWorth,
  formatCurrency,
  calculateCategoryTotals,
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

  // Prepare last 12 months of income data
  const now = new Date();
  const monthlyIncomeData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthName = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    const monthlyAmount = income
      .filter((inc) => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === date.getMonth() && incDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, inc) => sum + inc.amount, 0);
    return { month: monthName, year, income: monthlyAmount, label: `${monthName} ${year}` };
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={({ x, y, payload, index }) => {
                  const prev = monthlyIncomeData[index - 1];
                  const showYearDivider = prev && prev.year !== payload.year;
                  return (
                    <g transform={`translate(${x},${y + 10})`}>
                      {/* Year divider line */}
                      {showYearDivider && (
                        <line x1={0} y1={-30} x2={0} y2={0} stroke="#888" strokeWidth={1} />
                      )}
                      {/* Month label */}
                      <text x={0} y={15} textAnchor="middle" fill="#000">
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="income" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
