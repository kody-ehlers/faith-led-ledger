import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import {
  calculateMonthlyExpenses,
  calculateCategoryTotals,
  formatCurrency,
} from "@/utils/calculations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {  Plus, Trash2, ShoppingCart, Settings, CalendarIcon, Church } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export default function Expenses() {
  const {
    expenses,
    addExpense,
    removeExpense,
    assets,
    expenseCategories,
    addExpenseCategory,
    removeExpenseCategory,
  } = useFinanceStore();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState(expenseCategories[0] || "Other");
  const [type, setType] = useState<"need" | "want">("need");
  const [assetId, setAssetId] = useState<string | null>(null);

  // Date selection mode
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Category management
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Recent expenses filter
  const [filterDateRange, setFilterDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days by default
    to: new Date(),
  });
  const [isFilterDateOpen, setIsFilterDateOpen] = useState(false);

  // Category breakdown modal
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDetailOpen, setIsCategoryDetailOpen] = useState(false);

  const handleAddExpense = () => {
    if (!name.trim() || amount === null || amount <= 0) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    if (dateMode === "single") {
      // Add single expense
      addExpense({
        name: name.trim(),
        amount: amount,
        category,
        type,
        date: singleDate.toISOString(),
        assetId: assetId ?? undefined,
      });
      toast.success("Expense added successfully");
    } else {
      // Split amount proportionally by month based on days in each month
      const rangeGroupId = crypto.randomUUID();
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Group by month and calculate days in each month
      const monthSegments: { startDate: Date; endDate: Date; daysInSegment: number }[] = [];
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

      while (currentDate <= endDate) {
        // Get last day of current month
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Calculate segment boundaries
        const segmentStart = currentDate > startDate ? currentDate : startDate;
        const segmentEnd = monthEnd < endDate ? monthEnd : endDate;

        // Count days in this segment (inclusive)
        const daysInSegment = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        monthSegments.push({
          startDate: new Date(segmentStart),
          endDate: new Date(segmentEnd),
          daysInSegment,
        });

        // Move to first day of next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }

      // Calculate total days
      const totalDays = monthSegments.reduce((sum, seg) => sum + seg.daysInSegment, 0);

      // Create expense for each month segment with proportional amount
      for (const segment of monthSegments) {
        const segmentAmount = (amount * segment.daysInSegment) / totalDays;

        // Format dates as YYYY-MM-DD to avoid timezone issues
        const formatDateString = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        addExpense({
          name: name.trim(),
          amount: parseFloat(segmentAmount.toFixed(2)),
          category,
          type,
          date: segment.startDate.toISOString(),
          assetId: assetId ?? undefined,
          dateRangeStart: formatDateString(segment.startDate),
          dateRangeEnd: formatDateString(segment.endDate),
          rangeGroupId,
        });
      }
      toast.success(`Expense added for ${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`);
    }

    setName("");
    setAmount(null);
    setCategory(expenseCategories[0] || "Other");
    setType("need");
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
      return;
    }
    if (expenseCategories.includes(trimmed)) {
      toast.error("Category already exists");
      return;
    }
    addExpenseCategory(trimmed);
    toast.success(`Category "${trimmed}" added`);
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    removeExpenseCategory(cat);
    toast.success(`Category "${cat}" removed`);
    // If we just removed the currently selected category, reset
    if (category === cat) {
      setCategory(expenseCategories.filter(c => c !== cat)[0] || "Other");
    }
  };

  const handleRemoveExpense = (id: string) => {
    removeExpense(id);
    toast.success("Expense removed");
  };

  const now = new Date();
  const monthlyTotal = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = calculateCategoryTotals(
    expenses.filter(
      (e) => new Date(e.date).getMonth() === new Date().getMonth()
    )
  );

  const needsTotal = expenses
    .filter(
      (e) =>
        e.type === "need" &&
        new Date(e.date).getMonth() === new Date().getMonth()
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const wantsTotal = expenses
    .filter(
      (e) =>
        e.type === "want" &&
        new Date(e.date).getMonth() === new Date().getMonth()
    )
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


      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Church className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                Don't love money; be satisfied with what you have. For God has said,
                "I will never fail you. I will never abandon you."
              </p>
              <p className="text-sm text-muted-foreground font-medium">Hebrews 13:5 (NLT)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md border-destructive/20">
          <CardHeader>
            <CardTitle>Monthly Total</CardTitle>
            <CardDescription>Total expenses this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {formatCurrency(monthlyTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-emerald-500/20">
          <CardHeader>
            <CardTitle>Needs</CardTitle>
            <CardDescription>Essential expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700">
              {formatCurrency(needsTotal)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-amber-500/20">
          <CardHeader>
            <CardTitle>Wants</CardTitle>
            <CardDescription>Discretionary spending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">
              {formatCurrency(wantsTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record a new expense or batch entry for a date range</CardDescription>
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
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseAmount">
                Amount {dateMode === "range" ? "(will be split across days)" : ""}
              </Label>
              <CurrencyInput
                value={amount}
                onChange={(v) => setAmount(v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date Mode</Label>
              <Select value={dateMode} onValueChange={(v: "single" | "range") => setDateMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Date</SelectItem>
                  <SelectItem value="range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{dateMode === "single" ? "Date" : "Date Range"}</Label>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateMode === "single"
                      ? format(singleDate, "PPP")
                      : `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {dateMode === "single" ? (
                    <Calendar
                      mode="single"
                      selected={singleDate}
                      onSelect={(d) => {
                        if (d) {
                          setSingleDate(d);
                          setIsDateOpen(false);
                        }
                      }}
                    />
                  ) : (
                    <div className="space-y-2 p-2">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from) {
                            setDateRange({
                              from: range.from,
                              to: range.to || range.from
                            });
                          }
                        }}
                        numberOfMonths={2}
                      />
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDateOpen(false)}
                          className="flex-1"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="expenseCategory">Category</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="expenseCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...expenseCategories].sort((a, b) => a.localeCompare(b)).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType">Type</Label>
              <Select
                value={type}
                onValueChange={(value: "need" | "want") => setType(value)}
              >
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
              <Select
                value={assetId ?? "__external"}
                onValueChange={(v) => setAssetId(v === "__external" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__external">External Account</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} • {a.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAddExpense}
            className="w-full bg-destructive hover:bg-destructive/90"
          >
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
            <CardDescription>Spending by category this month (click for details)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, total]) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryDetailOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors cursor-pointer text-left"
                  >
                    <span className="font-medium text-foreground">{cat}</span>
                    <span className="text-lg font-bold text-destructive">
                      {formatCurrency(total)}
                    </span>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </div>
            <Popover open={isFilterDateOpen} onOpenChange={setIsFilterDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-fit justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filterDateRange.from, "MMM d")} - {format(filterDateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 pb-2 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        setFilterDateRange({
                          from: new Date(now.getFullYear(), now.getMonth(), 1),
                          to: now,
                        });
                      }}
                    >
                      Month to Date
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        setFilterDateRange({
                          from: new Date(now.getFullYear(), 0, 1),
                          to: now,
                        });
                      }}
                    >
                      Year to Date
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const from = new Date();
                        from.setDate(now.getDate() - 30);
                        setFilterDateRange({ from, to: now });
                      }}
                    >
                      Last 30 Days
                    </Button>
                  </div>
                  <Calendar
                    mode="range"
                    selected={{ from: filterDateRange.from, to: filterDateRange.to }}
                    onSelect={(range) => {
                      if (range?.from) {
                        setFilterDateRange({
                          from: range.from,
                          to: range.to || range.from
                        });
                      }
                    }}
                    numberOfMonths={2}
                  />
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilterDateOpen(false)}
                      className="flex-1"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses recorded yet. Start tracking by adding your first
              expense above.
            </p>
          ) : (
            <div className="space-y-3">
              {(() => {
                // Group range expenses by rangeGroupId so we display them as one entry
                const displayedRangeGroups = new Set<string>();
                const expensesToShow: typeof expenses = [];

                // Sort expenses by date descending (newest first)
                const sortedExpenses = [...expenses].sort((a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                for (const expense of sortedExpenses) {
                  const expDate = new Date(expense.date);
                  if (expDate < filterDateRange.from || expDate > filterDateRange.to) {
                    continue;
                  }

                  if (expense.rangeGroupId) {
                    if (!displayedRangeGroups.has(expense.rangeGroupId)) {
                      displayedRangeGroups.add(expense.rangeGroupId);
                      expensesToShow.push(expense);
                    }
                  } else {
                    expensesToShow.push(expense);
                  }
                  if (expensesToShow.length >= 20) break;
                }

                return expensesToShow.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No expenses found in this date range.
                  </p>
                ) : (
                  expensesToShow.map((expense) => {
                    // Calculate total amount if it's a range expense
                    const isRangeExpense = expense.rangeGroupId && expense.dateRangeStart && expense.dateRangeEnd;
                    let displayAmount = expense.amount;

                    if (isRangeExpense) {
                      displayAmount = expenses
                        .filter(e => e.rangeGroupId === expense.rangeGroupId)
                        .reduce((sum, e) => sum + e.amount, 0);
                    }

                    const handleRemoveGroup = () => {
                      if (isRangeExpense) {
                        // Remove all expenses in this range group
                        const toRemove = expenses.filter(e => e.rangeGroupId === expense.rangeGroupId);
                        toRemove.forEach(e => removeExpense(e.id));
                        toast.success("Expense range removed");
                      } else {
                        handleRemoveExpense(expense.id);
                      }
                    };

                    return (
                      <div
                        key={expense.rangeGroupId || expense.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {expense.name}
                            </h4>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${expense.type === "need"
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-amber-500/10 text-amber-700"
                                }`}
                            >
                              {expense.type === "need" ? "Need" : "Want"}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{formatCurrency(displayAmount)}</span>
                            <span>•</span>
                            <span>{expense.category}</span>
                            <span>•</span>
                            <span>
                              {isRangeExpense
                                ? `${format(new Date(expense.dateRangeStart!), "MMM d")} - ${format(new Date(expense.dateRangeEnd!), "MMM d, yyyy")}`
                                : new Date(expense.date).toLocaleDateString()
                              }
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveGroup}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Expense Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Subscriptions"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Existing Categories</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {expenseCategories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2 rounded-lg border border-border"
                  >
                    <span className="text-sm">{cat}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveCategory(cat)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Removing a category won't delete existing expenses in that category.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCategoryDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Detail Modal */}
      <Dialog open={isCategoryDetailOpen} onOpenChange={setIsCategoryDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedCategory} - This Month</DialogTitle>
            <DialogDescription>
              All expenses in this category
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedCategory && (() => {
              const categoryExpenses = expenses.filter(
                (e) =>
                  e.category === selectedCategory &&
                  new Date(e.date).getFullYear() === new Date().getFullYear() &&
                  new Date(e.date).getMonth() === new Date().getMonth()
              ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              if (categoryExpenses.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    No expenses in this category this month.
                  </p>
                );
              }

              return (
                <div className="space-y-2 pr-4">
                  {categoryExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {expense.name}
                          </h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${expense.type === "need"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-amber-500/10 text-amber-700"
                              }`}
                          >
                            {expense.type === "need" ? "Need" : "Want"}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{formatCurrency(expense.amount)}</span>
                          <span>•</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          removeExpense(expense.id);
                          toast.success("Expense removed");
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCategoryDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
