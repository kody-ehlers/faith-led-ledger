import React, { useState } from "react";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useFinanceStore, type LiquidAsset } from "@/store/financeStore";
import { formatCurrency, calculateWalletTransactions, calculateWalletBalance } from "@/utils/calculations";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import DatePicker from "@/components/DatePicker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";

export default function Wallet() {
  const { assets, addAsset, removeAsset, updateAsset, removeAssetTransaction, addAssetTransaction, updateAssetTransaction, income, expenses, bills, subscriptions, tithes } =
    useFinanceStore();

  // Helpers to normalize and parse date-only strings safely
  const normalizeDateOnly = (d?: string | null) => {
    if (!d) return "";
    return d.includes("T") ? d.slice(0, 10) : d;
  };

  const parseDateSafe = (d?: string | null) => {
    const s = normalizeDateOnly(d);
    if (!s) return new Date();
    return new Date(s + "T12:00:00");
  };

  const formatDateSafe = (d?: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toLocaleDateString();
    const dt2 = parseDateSafe(d);
    if (!isNaN(dt2.getTime())) return dt2.toLocaleDateString();
    return "-";
  };

  const [name, setName] = useState("");
  const [type, setType] = useState<
    "Cash" | "Checking" | "Savings" | "Credit Card"
  >("Checking");
  // Keep these as strings to make it easy to clear fields in the UI
  const [startingAmount, setStartingAmount] = useState<string>("");
  const [enactDate, setEnactDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [creditLimit, setCreditLimit] = useState<string>("");
  const [paymentDueDay, setPaymentDueDay] = useState<string>("");
  const [isEnactOpen, setIsEnactOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  // Transaction remove dialog state
  const [txRemoveAssetId, setTxRemoveAssetId] = useState<string | null>(null);
  const [txRemoveTxId, setTxRemoveTxId] = useState<string | null>(null);
  const [isTxRemoveOpen, setIsTxRemoveOpen] = useState(false);
  // Edit starting-transaction dialog state
  const [txEditAssetId, setTxEditAssetId] = useState<string | null>(null);
  const [txEditTxId, setTxEditTxId] = useState<string | null>(null);
  const [isTxEditOpen, setIsTxEditOpen] = useState(false);
  const [txEditAmount, setTxEditAmount] = useState<number | null>(null);
  const [txEditDate, setTxEditDate] = useState<Date | null>(null);
  // Adjust Credit Limit dialog state
  const [adjustTarget, setAdjustTarget] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustDate, setAdjustDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  // History modal state
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // Payment dialog state for credit cards
  const [payTarget, setPayTarget] = useState<string | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payFromAssetId, setPayFromAssetId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState<Date>(new Date());

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    const starting = startingAmount === "" ? 0 : Number(startingAmount);
    // store enactDate as a date-only YYYY-MM-DD string
    addAsset({
      name: name.trim(),
      type,
      startingAmount: Number(starting || 0),
      enactDate: enactDate || undefined,
      creditLimit: creditLimit === "" ? null : Number(creditLimit),
      paymentDueDay: paymentDueDay === "" ? null : Number(paymentDueDay),
    });
    toast.success("Wallet item added");
    setName("");
    setStartingAmount("");
    setPaymentDueDay("");
  };

  const handleSubmitPayment = () => {
    if (!payTarget) return;
    if (!payFromAssetId) {
      toast.error("Select a source account");
      return;
    }
    if (!payAmount || payAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const source = assets.find((x) => x.id === payFromAssetId);
    const card = assets.find((x) => x.id === payTarget);
    if (!source || !card) return;

    const dateIso = payDate?.toISOString?.() || new Date().toISOString();

    // From source: outflow (negative)
    addAssetTransaction(source.id, {
      date: dateIso,
      amount: -Math.abs(payAmount),
      memo: `Credit card payment to ${card.name}`,
    });

    // To credit card: inflow (positive) - reduces owed (credit cards store negative balances)
    addAssetTransaction(card.id, {
      date: dateIso,
      amount: Math.abs(payAmount),
      memo: `Payment from ${source.name}`,
    });

    toast.success(`Paid ${formatCurrency(payAmount)} to ${card.name}`);
    setPayTarget(null);
    setIsPayOpen(false);
    setPayAmount(null);
    setPayFromAssetId(null);
  };

  const openHistory = (assetId: string) => {
    setHistoryAssetId(assetId);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-muted-foreground">
            Manage checking, savings, and credit card accounts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Wallet Item</CardTitle>
          <CardDescription>Add an account to track balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(v) => setType(v as LiquidAsset["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder={type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Checking">Checking</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Starting Balance for non-Other account types */}
            {/** Show starting balance for Cash/Checking/Savings/Credit Card */}
            {type !== undefined && (
              <div className="space-y-2">
                <Label>Starting Balance</Label>
                <CurrencyInput
                  value={startingAmount === "" ? null : Number(startingAmount)}
                  onChange={(v) => setStartingAmount(v === null ? "" : String(v))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Date First Available</Label>
              <Popover open={isEnactOpen} onOpenChange={setIsEnactOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start text-left font-normal"
                    variant="outline"
                  >
                    {enactDate
                      ? format(parseDateSafe(enactDate), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseDateSafe(enactDate)}
                    onSelect={(d) => {
                      if (d) {
                        // store date-only in YYYY-MM-DD to avoid TZ shifts
                        setEnactDate(d.toISOString().slice(0, 10));
                        setIsEnactOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {type === "Credit Card" && (
              <>
                <div className="space-y-2">
                  <Label>Payment Due Date (1-28)</Label>
                  <Input
                    className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    min={1}
                    max={28}
                    value={paymentDueDay === "" ? "" : paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>
              Add Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {a.name}{" "}
                  <small className="text-muted-foreground">
                    {a.type}
                    {a.closed ? " • Closed" : ""}
                  </small>
                </span>
                {/* Display calculated balance from all transactions */}
                {(() => {
                  const calculatedBalance = calculateWalletBalance(a, income, expenses, bills, subscriptions, tithes);
                  const cls = calculatedBalance < 0 ? "text-destructive" : "text-success";
                  return (
                    <span className={`font-semibold ${cls}`}>
                      {formatCurrency(calculatedBalance)}
                    </span>
                  );
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">
                Enacted:{" "}
                {a.enactDate
                  ? parseDateSafe(a.enactDate).toLocaleDateString()
                  : "—"}
              </div>

              {a.type === "Credit Card" && a.paymentDueDay && (
                <div className="text-sm text-muted-foreground mb-2">
                  Payment Due:{" "}
                  <span className="font-medium text-foreground">
                    Day {a.paymentDueDay} of each month
                  </span>
                </div>
              )}

              {/* Only show transactions for Credit Card accounts */}
              {a.type === "Credit Card" && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">
                    Recent transactions
                  </div>
                  <div className="mt-2 space-y-1">
                    {(a.transactions || [])
                      .slice()
                      .reverse()
                      .slice(0, 5)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex justify-between text-sm items-center"
                        >
                          <div>
                            {formatDateSafe(t.date)} {t.memo ? `• ${t.memo}` : ""}
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={
                                t.amount >= 0
                                  ? "text-success"
                                  : "text-destructive"
                              }
                            >
                              {formatCurrency(t.amount)}
                            </div>
                            {/* For starting balance, show Edit instead of Remove */}
                            {(t.memo === "Starting balance" || t.memo === "Starting Balance") ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setTxEditAssetId(a.id);
                                  setTxEditTxId(t.id);
                                  // default amount: present positive value to user
                                  const displayAmt = a.type === "Credit Card" ? Math.abs(t.amount) : t.amount;
                                  setTxEditAmount(displayAmt);
                                  // set txEditDate as Date object
                                  const raw = t.date || a.enactDate || new Date().toISOString().slice(0, 10);
                                  const parsed = raw.includes("T") ? new Date(raw) : new Date(raw + "T12:00:00");
                                  setTxEditDate(parsed);
                                  setIsTxEditOpen(true);
                                }}
                              >
                                ✎
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setTxRemoveAssetId(a.id);
                                  setTxRemoveTxId(t.id);
                                  setIsTxRemoveOpen(true);
                                }}
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openHistory(a.id)}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
                {a.type === "Credit Card" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPayTarget(a.id);
                      setIsPayOpen(true);
                      // default select first non-credit asset
                      const src = assets.find((x) => x.type !== "Credit Card" && !x.closed);
                      setPayFromAssetId(src?.id ?? null);
                      setPayAmount(null);
                      setPayDate(new Date());
                    }}
                  >
                    Pay
                  </Button>
                )}
                {!a.closed && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateAsset(a.id, { closed: true });
                      toast.success(
                        "Account closed — no further transactions allowed"
                      );
                    }}
                  >
                    Close Account
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    setRemoveTarget(a.id);
                    setIsRemoveOpen(true);
                  }}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {/* Transaction remove confirmation dialog */}
        <Dialog open={isTxRemoveOpen} onOpenChange={setIsTxRemoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Transaction</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              {txRemoveAssetId && txRemoveTxId ? (
                (() => {
                  const asset = assets.find((x) => x.id === txRemoveAssetId);
                  const tx = asset?.transactions?.find((u) => u.id === txRemoveTxId);
                  return (
                    <div>
                      <div className="mb-2">
                        Are you sure you want to remove this transaction?
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>Date: {tx ? format(new Date(tx.date + "T00:00:00"), "PPP") : "-"}</div>
                        <div>Memo: {tx?.memo ?? "-"}</div>
                        <div>Amount: {tx ? formatCurrency(tx.amount) : "-"}</div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div>Loading...</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsTxRemoveOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-destructive text-white"
                onClick={() => {
                  if (txRemoveAssetId && txRemoveTxId) {
                    removeAssetTransaction(txRemoveAssetId, txRemoveTxId);
                    toast.success("Transaction removed");
                  }
                  setIsTxRemoveOpen(false);
                  setTxRemoveAssetId(null);
                  setTxRemoveTxId(null);
                }}
              >
                Remove Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Starting Balance Dialog */}
        <Dialog open={isTxEditOpen} onOpenChange={setIsTxEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Starting Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <CurrencyInput value={txEditAmount ?? null} onChange={(v) => setTxEditAmount(v)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker selected={txEditDate ?? undefined} onSelect={(d) => setTxEditDate(d)} placeholder="Pick a date" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsTxEditOpen(false); setTxEditAssetId(null); setTxEditTxId(null); }}>Cancel</Button>
              <Button onClick={() => {
                if (!txEditAssetId || !txEditTxId) return;
                const asset = assets.find((x) => x.id === txEditAssetId);
                if (!asset) return;
                const amt = txEditAmount ?? 0;
                const signed = asset.type === "Credit Card" ? -Math.abs(amt) : amt;
                const dateIso = txEditDate ? txEditDate.toISOString() : (asset.enactDate ? (asset.enactDate.includes('T') ? asset.enactDate : `${asset.enactDate}T12:00:00`) : new Date().toISOString());
                // update startingAmount on asset
                updateAsset(txEditAssetId, { startingAmount: signed, currentAmount: undefined });
                // update the transaction
                updateAssetTransaction(txEditAssetId, txEditTxId, { amount: signed, date: dateIso, memo: "Starting balance" });
                toast.success("Starting balance updated");
                setIsTxEditOpen(false);
                setTxEditAssetId(null);
                setTxEditTxId(null);
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove confirmation dialog */}
        <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Account</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              Removing this account will permanently delete its transaction
              history. This action cannot be undone.
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsRemoveOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-destructive text-white"
                onClick={() => {
                  if (removeTarget) {
                    removeAsset(removeTarget);
                    toast.success("Account removed");
                  }
                  setIsRemoveOpen(false);
                }}
              >
                Remove Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Payment Dialog for Credit Cards */}
        <Dialog open={isPayOpen || payTarget !== null} onOpenChange={(open) => {
          if (!open) {
            setPayTarget(null);
            setPayAmount(null);
            setPayFromAssetId(null);
          }
          setIsPayOpen(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pay Credit Card - {assets.find((a) => a.id === payTarget)?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <CurrencyInput value={payAmount} onChange={(v) => setPayAmount(v)} />
              </div>

              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={payFromAssetId ?? "__none"} onValueChange={(v) => setPayFromAssetId(v === "__none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select account</SelectItem>
                    {assets.filter(x => x.type !== "Credit Card" && !x.closed).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} • {s.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker selected={payDate} onSelect={(d) => setPayDate(d)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setPayTarget(null); setIsPayOpen(false); }}>Cancel</Button>
              <Button onClick={handleSubmitPayment}>Pay</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History Modal */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Transaction History -{" "}
                {assets.find((a) => a.id === historyAssetId)?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {historyAssetId && (() => {
                const asset = assets.find((a) => a.id === historyAssetId);
                if (!asset) return null;

                const transactions = calculateWalletTransactions(
                  historyAssetId,
                  asset,
                  income,
                  expenses,
                  bills,
                  subscriptions,
                  tithes
                );

                if (transactions.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      No transactions recorded for this account.
                    </div>
                  );
                }

                return (
                  <ScrollArea className="h-96 w-full border rounded-lg">
                    <div className="p-4 space-y-3">
                      {transactions.map((tx, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {tx.description}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDateSafe(tx.date)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div
                              className={`font-semibold flex items-center gap-1 ${tx.amount >= 0
                                ? "text-success"
                                : "text-destructive"
                                }`}
                            >
                              <span>
                                {tx.amount >= 0 ? "+" : ""}
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Balance: {formatCurrency(tx.balance)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                );
              })()}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
