import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { calculatePostTaxIncomeForMonth, calculatePostTaxIncomeReceivedSoFar, calculateTitheAmount, formatCurrency, getEntryIncomeForMonth } from "@/utils/calculations";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, CheckCircle2, Circle, SquarePen, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function Tithe() {
  const { income, tithes, addTithe, markTitheGiven, updateTithe, removeTithe } = useFinanceStore();
  const postTaxIncome = calculatePostTaxIncomeForMonth(income);
  const postTaxReceivedSoFar = calculatePostTaxIncomeReceivedSoFar(income);
  const recommendedTithe = calculateTitheAmount(postTaxReceivedSoFar);
  
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  // Only consider tithe payments that have occurred up to now in the current month
  const monthlyTithes = tithes.filter(t => t.date.startsWith(currentMonth) && new Date(t.date) <= now);
  const totalTithed = monthlyTithes.reduce((sum, t) => sum + t.amount, 0);
  const remaining = Math.max(0, recommendedTithe - totalTithed);
  const percentageGiven = recommendedTithe > 0 ? (totalTithed / recommendedTithe) * 100 : 0;

  const [fullDialogOpen, setFullDialogOpen] = useState(false);
  const [fullDate, setFullDate] = useState<Date>(new Date());
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [partialDate, setPartialDate] = useState<Date>(new Date());

  // Editing existing tithe
  const [editingTithe, setEditingTithe] = useState<typeof tithes[0] | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleMarkAsTithed = () => setFullDialogOpen(true);

  const handlePartialTithe = () => {
    setPartialAmount('');
    setPartialDate(new Date());
    setPartialDialogOpen(true);
  };

  const saveFullTithe = () => {
    if (remaining <= 0) {
      toast.info("You've already given your full tithe this month!");
      setFullDialogOpen(false);
      return;
    }
    addTithe({ amount: remaining, date: fullDate.toISOString(), given: true });
    toast.success('Tithe marked as given. Thank you!');
    setFullDialogOpen(false);
  };

  const savePartialTithe = () => {
    const parsed = parseFloat(partialAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    addTithe({ amount: parsed, date: partialDate.toISOString(), given: true });
    toast.success('Tithe recorded. Thank you!');
    setPartialDialogOpen(false);
  };

  const handleEditSave = () => {
    if (!editingTithe) return;
    if (!editingTithe.amount || editingTithe.amount <= 0) {
      toast.error('Invalid amount');
      return;
    }
    updateTithe(editingTithe.id, { amount: editingTithe.amount, date: editingTithe.date, given: editingTithe.given });
    toast.success('Tithe updated');
    setEditDialogOpen(false);
    setEditingTithe(null);
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTitheId, setDeletingTitheId] = useState<string | null>(null);

  const handleDeleteTithe = (id: string) => {
    setDeletingTitheId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTithe = () => {
    if (!deletingTitheId) return;
    removeTithe(deletingTitheId);
    toast.success('Tithe record removed');
    setDeleteDialogOpen(false);
    setDeletingTitheId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-accent/10">
          <Heart className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Tithe</h2>
          <p className="text-muted-foreground">Honor God with the first fruits</p>
        </div>
      </div>

      {/* Scripture Card */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-lg italic text-foreground">
              "Bring all the tithes into the storehouse so there will be enough food in my Temple. 
              If you do, I will pour out a blessing so great you won't have enough room to take it in!"
            </p>
            <p className="text-sm text-muted-foreground font-medium">Malachi 3:10 (NLT)</p>
          </div>
        </CardContent>
      </Card>

      {/* Tithe Over the Past Year (stacked region showing tithe vs remaining) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tithe Over the Past Year</CardTitle>
          <CardDescription className="text-muted-foreground">Tithe shown as a portion of monthly income (10%)</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Build last 12 months using income change history so chart matches other views */}
          {(() => {
            const now = new Date();
            const monthlyIncomeData = Array.from({ length: 12 }).map((_, i) => {
              const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
              const monthName = date.toLocaleString("default", { month: "short" });
              const year = date.getFullYear();
              const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

              const monthlyAmount = income.reduce((sum, inc) => {
                return sum + getEntryIncomeForMonth(inc, date, /*includePreTax*/ false);
              }, 0);

              return { month: monthName, year, income: monthlyAmount, label: `${monthName} ${year}`, monthKey };
            });

            const chartData = monthlyIncomeData.map(d => {
              const target = d.income * 0.1;
              // Sum tithe payments recorded in that month
              const paid = tithes
                .filter(t => t.date.startsWith(d.monthKey))
                .reduce((s, t) => s + t.amount, 0);

              const paidCapped = Math.min(paid, target);
              const remainingToTarget = Math.max(0, target - paidCapped);
              const overpaid = Math.max(0, paid - target);

              return { ...d, target, paid, paidCapped, remainingToTarget, overpaid };
            });

            return (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-muted-foreground" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} interval={0} padding={{ left: 20, right: 20 }} />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(Number(value))}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percent = data.target > 0 ? (Math.min(data.paid, data.target) / data.target) * 100 : 0;
                        return (
                          <div className="bg-background border border-border rounded-md p-3 shadow-lg">
                            <p className="font-semibold mb-2">{data.label}</p>
                            <p className="text-accent font-bold mb-1">Paid toward tithe: {formatCurrency(data.paid)}</p>
                            <p className="text-sm text-muted-foreground mb-1">Target: {formatCurrency(data.target)}</p>
                            <p className="font-medium">Progress: {percent.toFixed(1)}%</p>
                            {data.overpaid > 0 && <p className="text-sm text-success">Overpaid: {formatCurrency(data.overpaid)}</p>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* paidCapped + remainingToTarget stack to represent the target bar and progress */}
                    <Bar dataKey="paidCapped" stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="remainingToTarget" stackId="a" fill="rgba(59,130,246,0.12)" radius={[6, 6, 0, 0]} />
                    {/* show any overpayment as an extra bar extending beyond the target */}
                    <Bar dataKey="overpaid" stackId="b" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </CardContent>
      </Card>

      {/* Tithe Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle>Post-Tax Income</CardTitle>
            <CardDescription>Received this month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(postTaxReceivedSoFar)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-accent/20">
          <CardHeader>
            <CardTitle>Recommended Tithe</CardTitle>
            <CardDescription>10% of post-tax income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{formatCurrency(recommendedTithe)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-success/20">
          <CardHeader>
            <CardTitle>Remaining</CardTitle>
            <CardDescription>To reach full tithe</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(remaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tithe Progress</CardTitle>
          <CardDescription>Your giving progress this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Given: {formatCurrency(totalTithed)}</span>
              <span className="font-medium text-foreground">
                {percentageGiven.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(percentageGiven, 100)} className="h-3" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 pt-4">
            <Button
              onClick={handleMarkAsTithed}
              disabled={remaining <= 0}
              className="bg-accent hover:bg-accent/90"
            >
              <Heart className="h-4 w-4 mr-2" />
              Mark Full Tithe as Given
            </Button>
            <Button
              onClick={handlePartialTithe}
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
            >
              Record Partial Tithe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full tithe dialog */}
      <Dialog open={fullDialogOpen} onOpenChange={setFullDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Full Tithe as Given</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              This will record a tithe of <strong>{formatCurrency(remaining)}</strong> for this month.
            </p>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">{format(fullDate, 'PPP')}</Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar mode="single" selected={fullDate} onSelect={(d) => d && setFullDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveFullTithe}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial tithe dialog */}
      <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Partial Tithe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-6"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">{format(partialDate, 'PPP')}</Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar mode="single" selected={partialDate} onSelect={(d) => d && setPartialDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePartialTithe}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit tithe dialog */}
      {editingTithe && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Tithe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    className="pl-6"
                    type="text"
                    inputMode="decimal"
                    value={editingTithe.amount}
                    onChange={(e) => setEditingTithe({ ...editingTithe, amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">{editingTithe.date ? format(new Date(editingTithe.date), 'PPP') : 'Pick a date'}</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingTithe.date ? new Date(editingTithe.date) : new Date()}
                      onSelect={(d) => d && setEditingTithe({ ...editingTithe, date: d.toISOString() })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEditSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tithe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this tithe record? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingTitheId(null); }}>
              Cancel
            </Button>
            <Button className="ml-2 text-destructive bg-destructive/5 hover:bg-destructive/10" onClick={confirmDeleteTithe}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tithe History */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tithe History</CardTitle>
          <CardDescription>Your recent giving record</CardDescription>
        </CardHeader>
        <CardContent>
          {tithes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tithe payments recorded yet. Start by marking your first tithe above.
            </p>
          ) : (
            <div className="space-y-3">
              {tithes
                .slice()
                .reverse()
                .slice(0, 10)
                .map((tithe) => (
                  <div
                    key={tithe.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {tithe.given ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{formatCurrency(tithe.amount)}</p>
                        <p className="text-sm text-muted-foreground">{new Date(tithe.date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:bg-primary/10"
                        onClick={() => {
                          setEditingTithe(tithe);
                          setEditDialogOpen(true);
                        }}
                        aria-label="Edit tithe"
                        title="Edit"
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTithe(tithe.id)}
                        aria-label="Delete tithe"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
