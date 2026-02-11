import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  frequency:
    | "One-time"
    | "Weekly"
    | "Biweekly"
    | "Monthly"
    | "Bimonthly"
    | "Quarterly"
    | "Yearly";
  preTax: boolean;
  date: string;
  notes: string;
  suspendedFrom?: string | null;
  suspendedTo?: string | null;
  suspendedIndefinitely?: boolean;
  suspendedNote?: string | null;
  changes?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  assetId?: string | null;
}

export interface ExpenseEntry {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  type: "need" | "want";
  assetId?: string | null;
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  rangeGroupId?: string | null;
}

export interface TithePayment {
  id: string;
  amount: number;
  date: string;
  given: boolean;
  assetId?: string | null;
}

export type RecurringFrequency = "Weekly" | "Biweekly" | "Monthly" | "Bimonthly" | "Quarterly" | "Yearly";

export interface SubscriptionEntry {
  id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  date: string;
  notes?: string;
  cancelledFrom?: string | null;
  cancelledTo?: string | null;
  cancelledIndefinitely?: boolean;
  cancelledNote?: string | null;
  changes?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  assetId?: string | null;
  variablePrice?: boolean;
  monthlyPrices?: { [month: string]: number };
  autopay?: boolean;
  paidMonths?: string[];
}

export interface BillEntry {
  id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  date: string;
  notes?: string;
  cancelledFrom?: string | null;
  cancelledTo?: string | null;
  cancelledIndefinitely?: boolean;
  cancelledNote?: string | null;
  changes?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  assetId?: string | null;
  variablePrice?: boolean;
  monthlyPrices?: { [month: string]: number };
  autopay?: boolean;
  paidMonths?: string[];
}

export interface InvestmentEntry {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: RecurringFrequency;
  date: string;
  notes?: string;
  assetId?: string | null;
  moneyEarned: number;
  expectedReturnRate?: number;
  earningsHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    description?: string;
  }>;
  pausedFrom?: string | null;
  pausedTo?: string | null;
  pausedIndefinitely?: boolean;
  pausedNote?: string | null;
  contributedMonths?: string[];
}

export interface LiquidAsset {
  id: string;
  name: string;
  type: "Cash" | "Checking" | "Savings" | "Credit Card";
  startingAmount: number;
  currentAmount: number;
  enactDate?: string;
  closed?: boolean;
  interestRate?: number;
  interestRateChanges?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  interestHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    memo?: string;
  }>;
  creditLimit?: number | null;
  creditLimitChanges?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  paymentDueDay?: number | null;
  transactions?: Array<{
    id: string;
    date: string;
    amount: number;
    memo?: string;
  }>;
}

export interface SavingsAccount {
  id: string;
  name: string;
  currentAmount: number;
  goalAmount: number;
  targetDate?: string;
  interestRate?: number;
  interestHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    memo?: string;
  }>;
}

export interface DebtEntry {
  id: string;
  name: string;
  balance: number;
  originalBalance: number;
  interestRate: number;
  minimumPayment: number;
  termMonths?: number;
  dueDate: string;
  notes?: string;
  assetId?: string | null;
  paymentHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    memo?: string;
  }>;
}

interface FinanceState {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  tithes: TithePayment[];
  savings: SavingsAccount[];
  debts: DebtEntry[];
  assets: LiquidAsset[];
  subscriptions: SubscriptionEntry[];
  bills: BillEntry[];
  investments: InvestmentEntry[];
  appName: string;
  expenseCategories: string[];

  // Actions
  addIncome: (entry: Omit<IncomeEntry, "id">) => void;
  removeIncome: (id: string) => void;
  updateIncome: (id: string, updates: Partial<IncomeEntry>) => void;
  suspendIncome: (
    id: string,
    from: string,
    to?: string | null,
    indefinite?: boolean,
    comment?: string | null
  ) => void;
  resumeIncome: (id: string) => void;

  addExpense: (entry: Omit<ExpenseEntry, "id">) => void;
  removeExpense: (id: string) => void;

  addTithe: (tithe: Omit<TithePayment, "id">) => void;
  markTitheGiven: (id: string) => void;
  updateTithe: (id: string, updates: Partial<TithePayment>) => void;
  removeTithe: (id: string) => void;

  addSavings: (account: Omit<SavingsAccount, "id">) => void;
  updateSavings: (id: string, updates: Partial<SavingsAccount>) => void;
  removeSavings: (id: string) => void;

  addDebt: (debt: Omit<DebtEntry, "id">) => void;
  updateDebt: (id: string, updates: Partial<DebtEntry>) => void;
  removeDebt: (id: string) => void;
  addDebtPayment: (debtId: string, amount: number, memo?: string) => void;
  // Assets
  addAsset: (
    asset: Omit<LiquidAsset, "id" | "currentAmount" | "transactions">
  ) => void;
  updateAsset: (id: string, updates: Partial<LiquidAsset>) => void;
  removeAsset: (id: string) => void;
  addAssetTransaction: (
    assetId: string,
    tx: { date: string; amount: number; memo?: string }
  ) => void;
  updateAssetTransaction: (
    assetId: string,
    txId: string,
    updates: Partial<{ date: string; amount: number; memo?: string }>
  ) => void;
  removeAssetTransaction: (assetId: string, txId: string) => void;
  updateAssetCreditLimit: (
    assetId: string,
    newLimit: number,
    startDate: string
  ) => void;
  applyAssetInterest: (
    assetId: string,
    amount: number,
    memo?: string,
    date?: string
  ) => void;
  updateAssetInterestRate: (
    assetId: string,
    newRate: number,
    startDate: string
  ) => void;
  // Subscriptions
  addSubscription: (entry: Omit<SubscriptionEntry, "id">) => void;
  removeSubscription: (id: string) => void;
  updateSubscription: (id: string, updates: Partial<SubscriptionEntry>) => void;
  cancelSubscription: (
    id: string,
    from: string,
    to?: string | null,
    indefinite?: boolean,
    comment?: string | null
  ) => void;
  renewSubscription: (id: string) => void;
  
  // Bills
  addBill: (entry: Omit<BillEntry, "id">) => void;
  removeBill: (id: string) => void;
  updateBill: (id: string, updates: Partial<BillEntry>) => void;
  cancelBill: (
    id: string,
    from: string,
    to?: string | null,
    indefinite?: boolean,
    comment?: string | null
  ) => void;
  renewBill: (id: string) => void;
  
  // Investments
  addInvestment: (entry: Omit<InvestmentEntry, "id" | "moneyEarned" | "earningsHistory" | "contributedMonths">) => void;
  removeInvestment: (id: string) => void;
  updateInvestment: (id: string, updates: Partial<InvestmentEntry>) => void;
  addEarnings: (investmentId: string, amount: number, description?: string) => void;
  recordContribution: (investmentId: string, month: string) => void;
  
  // Expense Categories
  addExpenseCategory: (category: string) => void;
  removeExpenseCategory: (category: string) => void;
  
  // Settings
  updateAppName: (name: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      income: [],
      expenses: [],
      tithes: [],
      savings: [],
      debts: [],
      subscriptions: [],
      bills: [],
      investments: [],
      appName: "My Finances",
      expenseCategories: [
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
      ],

      addIncome: (entry) =>
        set((state) => ({
          income: [
            ...state.income,
            {
              ...entry,
              id: crypto.randomUUID(),
              suspendedFrom: undefined,
              suspendedTo: undefined,
              suspendedIndefinitely: false,
              changes: [{ amount: entry.amount, start: entry.date, end: null }],
            },
          ],
        })),

      removeIncome: (id) =>
        set((state) => ({
          income: state.income.filter((i) => i.id !== id),
        })),

      updateIncome: (id, updates) =>
        set((state) => ({
          income: state.income.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      suspendIncome: (
        id,
        from,
        to = null,
        indefinite = false,
        comment = undefined
      ) =>
        set((state) => ({
          income: state.income.map((i) =>
            i.id === id
              ? {
                  ...i,
                  suspendedFrom: from,
                  suspendedTo: to,
                  suspendedIndefinitely: indefinite,
                  suspendedNote: comment,
                }
              : i
          ),
        })),

      resumeIncome: (id) =>
        set((state) => ({
          income: state.income.map((i) =>
            i.id === id
              ? {
                  ...i,
                  suspendedFrom: undefined,
                  suspendedTo: undefined,
                  suspendedIndefinitely: false,
                  suspendedNote: undefined,
                }
              : i
          ),
        })),

      addExpense: (entry) =>
        set((state) => ({
          expenses: [...state.expenses, { ...entry, id: crypto.randomUUID() }],
        })),

      removeExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        })),

      addTithe: (tithe) =>
        set((state) => ({
          tithes: [...state.tithes, { ...tithe, id: crypto.randomUUID() }],
        })),

      markTitheGiven: (id) =>
        set((state) => ({
          tithes: state.tithes.map((t) =>
            t.id === id ? { ...t, given: true } : t
          ),
        })),
      updateTithe: (id, updates) =>
        set((state) => ({
          tithes: state.tithes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      removeTithe: (id) =>
        set((state) => ({
          tithes: state.tithes.filter((t) => t.id !== id),
        })),

      addSavings: (account) =>
        set((state) => ({
          savings: [...state.savings, { ...account, id: crypto.randomUUID() }],
        })),

      updateSavings: (id, updates) =>
        set((state) => ({
          savings: state.savings.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      removeSavings: (id) =>
        set((state) => ({
          savings: state.savings.filter((s) => s.id !== id),
        })),

      addDebt: (debt) =>
        set((state) => ({
          debts: [...state.debts, { ...debt, id: crypto.randomUUID(), originalBalance: debt.balance, paymentHistory: [] }],
        })),

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      removeDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        })),

      addDebtPayment: (debtId, amount, memo = "") =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  balance: Math.max(0, d.balance - amount),
                  paymentHistory: [
                    ...(d.paymentHistory || []),
                    {
                      id: crypto.randomUUID(),
                      date: new Date().toISOString(),
                      amount,
                      memo,
                    },
                  ],
                }
              : d
          ),
        })),

      // Assets (wallet accounts) - include a default Cash account
      assets: [
        {
          id: crypto.randomUUID(),
          name: "Cash",
          type: "Cash",
          startingAmount: 0,
          currentAmount: 0,
          enactDate: new Date().toISOString().slice(0, 10),
          closed: false,
          interestRate: undefined,
          interestHistory: [],
          creditLimit: null,
          creditLimitChanges: [],
          paymentDueDay: null,
          transactions: [],
        },
      ],

      addAsset: (asset) =>
        set((state) => ({
          assets: [
            ...state.assets,
            {
              ...asset,
              id: crypto.randomUUID(),
              startingAmount:
                asset.type === "Credit Card"
                  ? -Math.abs(asset.startingAmount ?? 0)
                  : asset.startingAmount ?? 0,
              currentAmount:
                asset.type === "Credit Card"
                  ? -Math.abs(asset.startingAmount ?? 0)
                  : asset.startingAmount ?? 0,
              transactions:
                asset.type === "Credit Card" &&
                (asset.startingAmount ?? 0) !== 0
                  ? [
                      {
                        id: crypto.randomUUID(),
                        date: asset.enactDate
                          ? `${asset.enactDate}T12:00:00`
                          : new Date().toISOString(),
                        amount: -Math.abs(asset.startingAmount ?? 0),
                        memo: "Starting balance",
                      },
                    ]
                  : [],
              creditLimitChanges: asset.creditLimit
                ? [
                    {
                      amount: asset.creditLimit,
                      start:
                        asset.enactDate ??
                        new Date().toISOString().slice(0, 10),
                      end: null,
                    },
                  ]
                : [],
              interestRate: asset.interestRate ?? undefined,
              interestRateChanges: asset.interestRate
                ? [
                    {
                      amount: asset.interestRate,
                      start:
                        asset.enactDate ??
                        new Date().toISOString().slice(0, 10),
                      end: null,
                    },
                  ]
                : [],
              interestHistory: asset.interestHistory ?? [],
              closed: false,
            },
          ],
        })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      removeAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
        })),

      addAssetTransaction: (assetId, tx) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const curr = a.currentAmount ?? 0;
            let amt = tx.amount;
            if (a.type !== "Credit Card" && amt < 0) {
              const allowedOutflow = Math.min(Math.abs(amt), curr);
              amt = -allowedOutflow;
            }
            const newTx = {
              id: crypto.randomUUID(),
              date: tx.date,
              amount: amt,
              memo: tx.memo,
            };
            const newCurrent = (a.currentAmount ?? 0) + amt;
            return {
              ...a,
              transactions: [...(a.transactions || []), newTx],
              currentAmount: newCurrent,
            };
          }),
        })),
      updateAssetTransaction: (assetId, txId, updates) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const newTransactions = (a.transactions || []).map((t) =>
              t.id === txId ? { ...t, ...(updates as any) } : t
            );
            const starting = a.startingAmount ?? 0;
            const computed = newTransactions.reduce((s, t) => s + t.amount, starting);
            return {
              ...a,
              transactions: newTransactions,
              currentAmount: computed,
            };
          }),
        })),
      removeAssetTransaction: (assetId, txId) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const newTransactions = (a.transactions || []).filter(
              (t) => t.id !== txId
            );
            const starting = a.startingAmount ?? 0;
            const removedTx = (a.transactions || []).find((t) => t.id === txId);
            const removedWasStarting =
              removedTx &&
              (removedTx.memo === "Starting balance" || removedTx.memo === "Starting Balance");
            const newStarting = removedWasStarting ? 0 : starting;
            const computed = newTransactions.reduce((s, t) => s + t.amount, newStarting);
            return {
              ...a,
              transactions: newTransactions,
              startingAmount: newStarting,
              currentAmount: computed,
            };
          }),
        })),
      updateAssetCreditLimit: (assetId, newLimit, startDate) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const prev = a.creditLimitChanges
              ? a.creditLimitChanges.map((c) => ({ ...c }))
              : [];
            const newStart = startDate;
            const kept = prev.filter(
              (c) => new Date(c.start) < new Date(newStart + "T12:00:00")
            );
            if (kept.length > 0) {
              const last = kept[kept.length - 1];
              if (!last.end) {
                const dayBefore = new Date(newStart + "T12:00:00");
                dayBefore.setDate(dayBefore.getDate() - 1);
                last.end = dayBefore.toISOString().slice(0, 10);
              }
            }
            kept.push({ amount: newLimit, start: newStart, end: null });
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const eff = new Date(newStart + "T12:00:00");
            const newCreditLimit =
              eff.getTime() <= today.getTime() ? newLimit : a.creditLimit;
            return {
              ...a,
              creditLimit: newCreditLimit,
              creditLimitChanges: kept,
            };
          }),
        })),

      applyAssetInterest: (assetId, amount, memo = "Interest earned", date) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            return {
              ...a,
              currentAmount: a.currentAmount + amount,
              interestHistory: [
                ...(a.interestHistory || []),
                {
                  id: crypto.randomUUID(),
                  date: date || new Date().toISOString(),
                  amount,
                  memo,
                },
              ],
            };
          }),
        })),

      updateAssetInterestRate: (assetId, newRate, startDate) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const prev = a.interestRateChanges
              ? a.interestRateChanges.map((c) => ({ ...c }))
              : [];
            const newStart = startDate;
            const kept = prev.filter(
              (c) => new Date(c.start) < new Date(newStart + "T12:00:00")
            );
            if (kept.length > 0) {
              const last = kept[kept.length - 1];
              if (!last.end) {
                const dayBefore = new Date(newStart + "T12:00:00");
                dayBefore.setDate(dayBefore.getDate() - 1);
                last.end = dayBefore.toISOString().slice(0, 10);
              }
            }
            kept.push({ amount: newRate, start: newStart, end: null });
            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const eff = new Date(newStart + "T12:00:00");
            const newInterestRate =
              eff.getTime() <= today.getTime() ? newRate : a.interestRate;
            return {
              ...a,
              interestRate: newInterestRate,
              interestRateChanges: kept,
            };
          }),
        })),

      addSubscription: (entry) =>
        set((state) => ({
          subscriptions: [
            ...state.subscriptions,
            {
              ...entry,
              id: crypto.randomUUID(),
              changes: [{ amount: entry.amount, start: entry.date, end: null }],
            },
          ],
        })),

      removeSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        })),

      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      cancelSubscription: (
        id,
        from,
        to = null,
        indefinite = false,
        comment = undefined
      ) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  cancelledFrom: from,
                  cancelledTo: to,
                  cancelledIndefinitely: indefinite,
                  cancelledNote: comment,
                }
              : s
          ),
        })),

      renewSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  cancelledFrom: undefined,
                  cancelledTo: undefined,
                  cancelledIndefinitely: false,
                  cancelledNote: undefined,
                }
              : s
          ),
        })),

      addBill: (entry) =>
        set((state) => ({
          bills: [
            ...state.bills,
            {
              ...entry,
              id: crypto.randomUUID(),
              changes: [{ amount: entry.amount, start: entry.date, end: null }],
            },
          ],
        })),

      removeBill: (id) =>
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        })),

      updateBill: (id, updates) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      cancelBill: (
        id,
        from,
        to = null,
        indefinite = false,
        comment = undefined
      ) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id
              ? {
                  ...b,
                  cancelledFrom: from,
                  cancelledTo: to,
                  cancelledIndefinitely: indefinite,
                  cancelledNote: comment,
                }
              : b
          ),
        })),

      renewBill: (id) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id
              ? {
                  ...b,
                  cancelledFrom: undefined,
                  cancelledTo: undefined,
                  cancelledIndefinitely: false,
                  cancelledNote: undefined,
                }
              : b
          ),
        })),

      addInvestment: (entry) =>
        set((state) => ({
          investments: [
            ...state.investments,
            {
              ...entry,
              id: crypto.randomUUID(),
              moneyEarned: 0,
              earningsHistory: [],
              contributedMonths: [],
            },
          ],
        })),

      removeInvestment: (id) =>
        set((state) => ({
          investments: state.investments.filter((inv) => inv.id !== id),
        })),

      updateInvestment: (id, updates) =>
        set((state) => ({
          investments: state.investments.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        })),

      addEarnings: (investmentId, amount, description = "") =>
        set((state) => ({
          investments: state.investments.map((inv) =>
            inv.id === investmentId
              ? {
                  ...inv,
                  moneyEarned: (inv.moneyEarned || 0) + amount,
                  earningsHistory: [
                    ...(inv.earningsHistory || []),
                    {
                      id: crypto.randomUUID(),
                      date: new Date().toISOString(),
                      amount,
                      description,
                    },
                  ],
                }
              : inv
          ),
        })),

      recordContribution: (investmentId, month) =>
        set((state) => ({
          investments: state.investments.map((inv) =>
            inv.id === investmentId
              ? {
                  ...inv,
                  contributedMonths: [
                    ...(inv.contributedMonths || []),
                    month,
                  ].filter((v, i, a) => a.indexOf(v) === i),
                }
              : inv
          ),
        })),
      
      updateAppName: (name) =>
        set(() => ({
          appName: name,
        })),

      addExpenseCategory: (category) =>
        set((state) => ({
          expenseCategories: state.expenseCategories.includes(category)
            ? state.expenseCategories
            : [...state.expenseCategories, category],
        })),

      removeExpenseCategory: (category) =>
        set((state) => ({
          expenseCategories: state.expenseCategories.filter((c) => c !== category),
        })),
    }),
    {
      name: "finance-storage",
    }
  )
);
