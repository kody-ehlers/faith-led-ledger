import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { calculateMonthlyExpenses, calculateCategoryTotals, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = [
  "Groceries",
  "Dining",
  "Shopping",
  "Fuel",
  "Transportation",
  "Entertainment",
  "Healthcare",
  "Personal Care",
  "Education",
  "Gifts",
  "Other",
];

export default function Expenses() {
  const { expenses, addExpense, removeExpense, assets } = useFinanceStore();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [type, setType] = useState<"need" | "want">("need");
  const [assetId, setAssetId] = useState<string | null>(null);

  const handleAddExpense = () => {
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    addExpense({
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      type,
      date: new Date().toISOString(),
      assetId: assetId ?? undefined,
    });

    toast.success("Expense added successfully");
    setName("");
    setAmount("");
    setCategory("Groceries");
    setType("need");
  };

  const handleRemoveExpense = (id: string) => {
    removeExpense(id);
    toast.success("Expense removed");
  };

  const monthlyTotal = calculateMonthlyExpenses(expenses);
  const categoryTotals = calculateCategoryTotals(expenses.filter(e => 
    new Date(e.date).getMonth() === new Date().getMonth()
  ));

  const needsTotal = expenses
    .filter(e => e.type === "need" && new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);

  const wantsTotal = expenses
    .filter(e => e.type === "want" && new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-destructive/10">
          <ShoppingCart className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Expenses</h2>
          <p className="text-muted-foreground">Track your daily spending</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md border-destructive/20">
          <CardHeader>
            <CardTitle>Monthly Total</CardTitle>
            <CardDescription>Total expenses this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle>Needs</CardTitle>
            <CardDescription>Essential expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(needsTotal)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-accent/20">
          <CardHeader>
            <CardTitle>Wants</CardTitle>
            <CardDescription>Discretionary spending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{formatCurrency(wantsTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record a new expense</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseName">Expense Name</Label>
              <Input
                id="expenseName"
                placeholder="e.g., Grocery shopping"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Amount</Label>
              <Input
                id="expenseAmount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseCategory">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="expenseCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType">Type</Label>
              <Select value={type} onValueChange={(value: "need" | "want") => setType(value)}>
                <SelectTrigger id="expenseType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="need">Need</SelectItem>
                  <SelectItem value="want">Want</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Wallet</Label>
              <Select value={assetId ?? '__none'} onValueChange={(v) => setAssetId(v === '__none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} • {a.type}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAddExpense} className="w-full bg-destructive hover:bg-destructive/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending by category this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="font-medium text-foreground">{cat}</span>
                    <span className="text-lg font-bold text-destructive">{formatCurrency(total)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses recorded yet. Start tracking by adding your first expense above.
            </p>
          ) : (
            <div className="space-y-3">
              {expenses
                .slice()
                .reverse()
                .slice(0, 20)
                .map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{expense.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          expense.type === "need" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-accent/10 text-accent"
                        }`}>
                          {expense.type}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatCurrency(expense.amount)}</span>
                        <span>•</span>
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExpense(expense.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
