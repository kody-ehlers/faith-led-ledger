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

  // Helper function to count occurrences of a payment frequency in a month
  const countOccurrencesInMonth = (startDate: Date, frequency: string, targetMonth: Date, today: Date): number => {
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const endDate = monthEnd < today ? monthEnd : today;
    
    if (startDate > endDate) return 0;
    
    const interval = frequency === 'Weekly' ? 7 : 14;
    let count = 0;
    let currentDate = new Date(startDate);
    
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
    
    const monthlyAmount = income
      .filter((inc) => {
        const incDate = new Date(inc.date);
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return incDate <= lastDayOfMonth && incDate <= now;
      })
      .reduce((sum, inc) => {
        const incDate = new Date(inc.date);
        
        // For one-time income, only count in the month it occurred
        if (inc.frequency === 'One-time') {
          if (incDate.getMonth() === date.getMonth() && incDate.getFullYear() === date.getFullYear()) {
            return sum + inc.amount;
          }
          return sum;
        }
        
        // For weekly and biweekly, count actual occurrences
        if (inc.frequency === 'Weekly' || inc.frequency === 'Biweekly') {
          const occurrences = countOccurrencesInMonth(incDate, inc.frequency, date, now);
          return sum + (inc.amount * occurrences);
        }
        
        // For other recurring income, calculate monthly amount
        let monthlyAmount = 0;
        switch (inc.frequency) {
          case 'Monthly':
            monthlyAmount = inc.amount;
            break;
          case 'Quarterly':
            monthlyAmount = inc.amount / 3;
            break;
          case 'Yearly':
            monthlyAmount = inc.amount / 12;
            break;
        }
        return sum + monthlyAmount;
      }, 0);
    
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
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-muted-foreground"
                tick={({ x, y, payload, index }) => {
                  const prev = monthlyIncomeData[index - 1];
                  const showYearDivider = prev && prev.year !== payload.year;
                  return (
                    <g transform={`translate(${x},${y + 10})`}>
                      {showYearDivider && (
                        <line x1={0} y1={-30} x2={0} y2={0} className="stroke-border" strokeWidth={1} />
                      )}
                      <text x={0} y={15} textAnchor="middle" className="fill-muted-foreground text-sm">
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis className="text-muted-foreground" />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
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
