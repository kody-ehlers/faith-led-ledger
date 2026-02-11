import { formatMonthlyLabel, formatWeekOfLabel, formatMonthOfLabel } from "@/utils/formatDate";
import { useState } from "react";
import { useFinanceStore, SubscriptionEntry } from "@/store/financeStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import DatePicker from "@/components/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

import type { RecurringFrequency } from "@/store/financeStore";
type Frequency = RecurringFrequency;

export default function Subscriptions() {
  const {
    subscriptions,
    addSubscription,
    removeSubscription,
    updateSubscription,
    cancelSubscription,
    renewSubscription,
    assets,
  } = useFinanceStore();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [variablePrice, setVariablePrice] = useState(false);
  const [autopay, setAutopay] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);

  // Editing
  const [editing, setEditing] = useState<SubscriptionEntry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleAdd = () => {
    if (!variablePrice && (amount === null || amount <= 0)) {
      toast.error("Please provide valid price");
      return;
    }
    if (!name.trim()) {
      toast.error("Please provide a name");
      return;
    }

    addSubscription({
      name: name.trim(),
      amount: variablePrice ? 0 : (amount ?? 0),
      frequency,
      date: date.toISOString(),
      notes: notes.trim(),
      variablePrice,
      autopay,
      monthlyPrices: {},
      paidMonths: [],
      assetId: assetId ?? undefined,
    });
    toast.success("Subscription added");
    setName("");
    setAmount(null);
    setFrequency("Monthly");
    setDate(new Date());
    setNotes("");
    setVariablePrice(false);
    setAutopay(false);
    setAssetId(null);
  };

  const handleRemove = (id: string) => {
    removeSubscription(id);
    toast.success("Subscription removed");
  };

  function SubscriptionCard({ entry }: { entry: SubscriptionEntry }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState<string>(
      entry.amount.toString()
    );
    const [adjustDate, setAdjustDate] = useState<Date>(new Date());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [cancelStart, setCancelStart] = useState<Date>(new Date());
    const [cancelEnd, setCancelEnd] = useState<Date | null>(null);
    const [cancelIndefinite, setCancelIndefinite] = useState<boolean>(true);
    const [cancelNote, setCancelNote] = useState<string>(
      entry.cancelledNote ?? ""
    );
    const [isMonthlyPricesOpen, setIsMonthlyPricesOpen] = useState(false);
    const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
    const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
    const [tempPrice, setTempPrice] = useState<string>("");

    const isCancelledNow = () => {
      if (!entry.cancelledFrom) return false;
      const from = new Date(entry.cancelledFrom);
      const now = new Date();
      if (now < from) return false;
      if (entry.cancelledIndefinitely) return true;
      if (entry.cancelledTo) return now <= new Date(entry.cancelledTo);
      return false;
    };

    const cancelledNow = isCancelledNow();

    // Determine if this subscription should be paid in the current iteration
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const currentYear = now.getFullYear().toString();
    const startDate = new Date(entry.date);

    // Check if paid for current iteration based on frequency
    let isPaidCurrentIteration = false;
    let iterationLabel = "Month";

    if (entry.frequency === "Yearly") {
      isPaidCurrentIteration = (entry.paidMonths || []).some((m) => m.startsWith(currentYear));
      iterationLabel = "Year";
    }
    // If not marked paid but on autopay, treat as paid when the scheduled due date
    // for the current cycle has passed (handles Monthly and Yearly schedules).
    if (!isPaidCurrentIteration && entry.autopay) {
      try {
        const today = new Date();
        if (entry.frequency === "Monthly") {
          const day = new Date(entry.date).getDate();
          const due = new Date(today.getFullYear(), today.getMonth(), day);
          if (due.getTime() <= today.getTime()) isPaidCurrentIteration = true;
        } else if (entry.frequency === "Yearly") {
          const d = new Date(entry.date);
          const due = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (due.getTime() <= today.getTime()) isPaidCurrentIteration = true;
        }
      } catch {
        // ignore parse errors
      }
    } else if (entry.frequency === "Quarterly") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterMonths = [currentQuarter * 3, currentQuarter * 3 + 1, currentQuarter * 3 + 2].map(
        (m) => format(new Date(now.getFullYear(), m, 1), "yyyy-MM")
      );
      isPaidCurrentIteration = (entry.paidMonths || []).some((m) => quarterMonths.includes(m));
      iterationLabel = "Qtr";
    } else if (entry.frequency === "Bimonthly") {
      // Every other month — check if current month or previous month (within the 2-month window)
      const monthsSinceStart = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
      const isPayMonth = monthsSinceStart % 2 === 0;
      const checkMonth = isPayMonth ? currentMonth : format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM");
      isPaidCurrentIteration = (entry.paidMonths || []).includes(checkMonth);
      iterationLabel = "Period";
    } else {
      isPaidCurrentIteration = entry.paidMonths?.includes(currentMonth) ?? false;
      iterationLabel = "Month";
    }

    const currentMonthPrice = entry.variablePrice ? (entry.monthlyPrices?.[currentMonth] ?? null) : null;

    const togglePaidThisMonth = () => {
      let updated;
      if (entry.frequency === "Yearly") {
        const monthToToggle = `${currentYear}-01`;
        updated = isPaidCurrentIteration
          ? (entry.paidMonths || []).filter((m) => !m.startsWith(currentYear))
          : [...(entry.paidMonths || []), monthToToggle];
      } else {
        updated = isPaidCurrentIteration
          ? (entry.paidMonths || []).filter((m) => m !== currentMonth)
          : [...(entry.paidMonths || []), currentMonth];
      }
      updateSubscription(entry.id, { paidMonths: updated });
      toast.success(isPaidCurrentIteration ? `Marked as unpaid` : `Marked as paid`);
    };

    // Card background based on payment status - green only if actually paid for current cycle
    const cardBg = isPaidCurrentIteration
      ? "bg-green-500/10 border-green-500/30"
      : "bg-red-500/10 border-red-500/30";

    return (
      <div
        className={`flex items-center justify-between p-4 rounded-lg border ${cardBg}`}
      >
        <div className="flex items-center gap-3">
          {!entry.autopay && (
            <div className="flex flex-col items-center gap-1">
              <Checkbox
                checked={isPaidCurrentIteration}
                onCheckedChange={togglePaidThisMonth}
              />
              <span className="text-xs text-muted-foreground">
                {entry.frequency === "Yearly"
                  ? format(new Date(), "yyyy")
                  : format(new Date(), "MMM")}
              </span>
            </div>
          )}
          <div>
            {cancelledNow && (
              <div className="mb-1 text-yellow-700 font-semibold text-sm">
                Cancelled{" "}
                {entry.cancelledIndefinitely
                  ? "— Indefinitely"
                  : `until ${entry.cancelledTo
                    ? format(new Date(entry.cancelledTo), "PPP")
                    : ""
                  }`}
                {entry.cancelledNote && (
                  <span className="ml-2 text-sm text-muted-foreground italic">
                    ({entry.cancelledNote})
                  </span>
                )}
              </div>
            )}
            <p className="font-semibold">{entry.name}</p>
            <p className="text-sm text-muted-foreground">
              {entry.frequency} • {
                entry.frequency === "Yearly"
                  ? format(new Date(entry.date), "MMMM d")  // Just month and day for yearly
                  : entry.frequency === "Monthly"
                    ? formatMonthlyLabel(entry.date)
                    : format(new Date(entry.date), "PPP")
              }
              {entry.autopay && (
                <span className="ml-2 text-xs text-primary">(Autopay)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-semibold">
            {entry.variablePrice ? (
              currentMonthPrice !== null ? (
                <span>${currentMonthPrice.toFixed(2)}</span>
              ) : (
                <span className="text-muted-foreground">Variable</span>
              )
            ) : (
              `$${entry.amount.toFixed(2)}`
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.65 0 1.2-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.31 3.46A2 2 0 0 1 7.14.64l.06.06c.5.51 1.12.88 1.82.98.49.08.95.34 1.26.74.31.4.41.91.3 1.39-.07.34-.02.69.14.99.3.59.94.96 1.61.96.67 0 1.31-.37 1.61-.96.16-.3.21-.65.14-.99-.11-.48-.01-.99.3-1.39.31-.4.77-.66 1.26-.74.7-.1 1.32-.47 1.82-.98l.06-.06A2 2 0 0 1 22 4.31l-.06.06c-.51.5-.88 1.12-.98 1.82-.08.49-.34.95-.74 1.26-.4.31-.91.41-1.39.3-.34-.07-.69-.02-.99.14-.59.3-.96.94-.96 1.61 0 .67.37 1.31.96 1.61.3.16.65.21.99.14.48-.11.99-.01 1.39.3.4.31.66.77.74 1.26.1.7.47 1.32.98 1.82l.06.06A2 2 0 0 1 19.4 15z" />
            </svg>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => handleRemove(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Settings dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Subscription Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Quick actions for this subscription
              </p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setEditing(entry);
                    setIsEditOpen(true);
                  }}
                >
                  <SquarePen className="mr-2 h-4 w-4" /> Edit
                </Button>

                {!entry.variablePrice && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setAdjustAmount(entry.amount.toString());
                      setAdjustDate(new Date());
                      setIsAdjustOpen(true);
                    }}
                  >
                    <SquarePen className="mr-2 h-4 w-4" /> Adjust Price
                  </Button>
                )}

                {entry.variablePrice && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsMonthlyPricesOpen(true);
                    }}
                  >
                    <SquarePen className="mr-2 h-4 w-4" /> Set Monthly Prices
                  </Button>
                )}

                {!entry.autopay && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsPaymentHistoryOpen(true);
                    }}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Payment History
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsHistoryOpen(true);
                  }}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  View History
                </Button>

                {cancelledNow ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      renewSubscription(entry.id);
                      toast.success("Subscription renewed");
                      setIsSettingsOpen(false);
                    }}
                  >
                    Renew Subscription
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setCancelStart(new Date());
                      setCancelEnd(null);
                      setCancelIndefinite(true);
                      setCancelNote("");
                      setIsCancelOpen(true);
                    }}
                  >
                    Cancel / Pause Subscription
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Monthly Prices dialog */}
        <Dialog
          open={isMonthlyPricesOpen}
          onOpenChange={(open) => {
            if (!open && tempPrice) {
              // Save on close
              const month = new Date(
                new Date().getFullYear(),
                currentMonthIndex,
                1
              ).toISOString().slice(0, 7);
              const newPrices = {
                ...entry.monthlyPrices,
                [month]: parseFloat(tempPrice) || 0,
              };
              updateSubscription(entry.id, { monthlyPrices: newPrices });
              setTempPrice("");
            }
            setIsMonthlyPricesOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Monthly Prices</DialogTitle>
            </DialogHeader>
            {(() => {
              const month = new Date(
                new Date().getFullYear(),
                currentMonthIndex,
                1
              ).toISOString().slice(0, 7);
              const monthName = format(
                new Date(new Date().getFullYear(), currentMonthIndex, 1),
                "MMMM yyyy"
              );
              const savedPrice = entry.monthlyPrices?.[month] ?? 0;
              const displayPrice = tempPrice !== "" ? tempPrice : savedPrice.toString();

              const saveCurrentPrice = () => {
                if (tempPrice) {
                  const newPrices = {
                    ...entry.monthlyPrices,
                    [month]: parseFloat(tempPrice) || 0,
                  };
                  updateSubscription(entry.id, { monthlyPrices: newPrices });
                  setTempPrice("");
                }
              };

              const goToMonth = (newIndex: number) => {
                saveCurrentPrice();
                setCurrentMonthIndex(newIndex);
              };

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToMonth((currentMonthIndex - 1 + 12) % 12)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </Button>
                    <h3 className="text-lg font-semibold">{monthName}</h3>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToMonth((currentMonthIndex + 1) % 12)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthPrice">Price for {monthName}</Label>
                    <CurrencyInput
                      id="monthPrice"
                      value={tempPrice !== "" ? parseFloat(tempPrice) : savedPrice}
                      onChange={(v) => setTempPrice(v !== null ? v.toString() : "")}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Saved price: ${savedPrice.toFixed(2)}
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button
                onClick={() => {
                  if (tempPrice) {
                    const month = new Date(
                      new Date().getFullYear(),
                      currentMonthIndex,
                      1
                    ).toISOString().slice(0, 7);
                    const newPrices = {
                      ...entry.monthlyPrices,
                      [month]: parseFloat(tempPrice) || 0,
                    };
                    updateSubscription(entry.id, { monthlyPrices: newPrices });
                    setTempPrice("");
                  }
                  setIsMonthlyPricesOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment History dialog */}
        <Dialog
          open={isPaymentHistoryOpen}
          onOpenChange={setIsPaymentHistoryOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Payment History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => {
                const month = new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() - i,
                  1
                );
                const monthKey = format(month, "yyyy-MM");
                const monthName = format(month, "MMMM yyyy");
                const isPaid = entry.paidMonths?.includes(monthKey) ?? false;

                return (
                  <div
                    key={monthKey}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <span className="font-medium">{monthName}</span>
                    <Checkbox
                      checked={isPaid}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...(entry.paidMonths || []), monthKey]
                          : (entry.paidMonths || []).filter(
                            (m) => m !== monthKey
                          );
                        updateSubscription(entry.id, { paidMonths: updated });
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsPaymentHistoryOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Subscription Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Price</Label>
                <CurrencyInput
                  value={parseFloat(adjustAmount) || null}
                  onChange={(v) => setAdjustAmount(v !== null ? v.toString() : "")}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <DatePicker selected={adjustDate} onSelect={(d) => setAdjustDate(d)} />
                <p className="text-sm text-muted-foreground">
                  If the date is in the future, the current price will stop the
                  day before and a new price will start on the effective date.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  const parsed = parseFloat(adjustAmount);
                  if (isNaN(parsed) || parsed <= 0) {
                    toast.error("Please enter a valid price");
                    return;
                  }
                  const eff = adjustDate;
                  const effStart = new Date(
                    eff.getFullYear(),
                    eff.getMonth(),
                    eff.getDate(),
                    12,
                    0,
                    0,
                    0
                  );
                  const todayStart = new Date();
                  todayStart.setHours(12, 0, 0, 0);
                  const prevChanges = entry.changes
                    ? entry.changes.map((c) => ({ ...c }))
                    : [];
                  const kept = prevChanges.filter(
                    (ch) => new Date(ch.start) < effStart
                  );
                  if (kept.length > 0) {
                    const lastKept = kept[kept.length - 1];
                    if (!lastKept.end)
                      lastKept.end = subDays(effStart, 1).toISOString();
                  }
                  kept.push({
                    amount: parsed,
                    start: effStart.toISOString(),
                    end: null,
                  });
                  if (effStart.getTime() <= todayStart.getTime()) {
                    updateSubscription(entry.id, {
                      amount: parsed,
                      changes: kept,
                    });
                    toast.success("Subscription price updated");
                  } else {
                    updateSubscription(entry.id, { changes: kept });
                    toast.success("Subscription price scheduled");
                  }
                  setIsAdjustOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Price History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {entry.changes && entry.changes.length > 0 ? (
                entry.changes.map((ch, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {format(new Date(ch.start), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ch.end ? format(new Date(ch.end), "PPP") : "to now"}
                      </p>
                    </div>
                    <div className="font-semibold">${ch.amount.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No history available
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel dialog */}
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel / Pause Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      {format(cancelStart, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={cancelStart}
                      onSelect={(d) => d && setCancelStart(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={cancelIndefinite}>
                        {cancelEnd
                          ? format(cancelEnd, "PPP")
                          : "Pick an end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={cancelEnd ?? undefined}
                        onSelect={(d) => d && setCancelEnd(d)}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={cancelIndefinite}
                      onCheckedChange={(checked) =>
                        setCancelIndefinite(!!checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      Indefinite
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Input
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value.slice(0, 200))}
                  placeholder="Why cancel or pause?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  cancelSubscription(
                    entry.id,
                    cancelStart.toISOString(),
                    cancelIndefinite
                      ? null
                      : cancelEnd
                        ? cancelEnd.toISOString()
                        : null,
                    cancelIndefinite,
                    cancelNote || undefined
                  );
                  toast.success("Subscription cancelled/paused");
                  setIsCancelOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
              d="M3 7h18M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Subscriptions</h2>
          <p className="text-muted-foreground">
            Manage recurring subscriptions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Subscription</CardTitle>
          <CardDescription>Record a recurring subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Netflix"
              />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v: Frequency) => setFrequency(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Biweekly">Biweekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Bimonthly">Bimonthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                placeholder="optional notes"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={variablePrice}
                onCheckedChange={setVariablePrice}
              />
              <Label>Variable Price</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={autopay} onCheckedChange={setAutopay} />
              <Label>Autopay Enabled</Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Wallet</Label>
              <Select
                value={assetId ?? "__external"}
                onValueChange={(v) => setAssetId(v === "__external" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account (optional)" />
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

          <Button className="w-full" onClick={handleAdd}>
            Add Subscription
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>Active and cancelled subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-muted-foreground">No subscriptions yet.</p>
          ) : (
            subscriptions.map((s) => <SubscriptionCard key={s.id} entry={s} />)
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editing && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editing.frequency}
                  onValueChange={(val) =>
                    setEditing({
                      ...editing,
                      frequency: val as Frequency,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Biweekly">Biweekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Bimonthly">Bimonthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editing.notes || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editing.autopay ?? false}
                  onCheckedChange={(checked) =>
                    setEditing({ ...editing, autopay: checked })
                  }
                />
                <Label>Autopay Enabled</Label>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {format(new Date(editing.date), "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(editing.date)}
                      onSelect={(d) => d && setEditing({ ...editing, date: d.toISOString() })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Wallet</Label>
                <Select
                  value={editing.assetId ?? "__external"}
                  onValueChange={(v) => setEditing({ ...editing, assetId: v === "__external" ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
            <DialogFooter>
              <Button
                onClick={() => {
                  if (editing) {
                    updateSubscription(editing.id, editing);
                    toast.success("Subscription updated");
                    setIsEditOpen(false);
                    setEditing(null);
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
