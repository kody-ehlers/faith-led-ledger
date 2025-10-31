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
    | "Quarterly"
    | "Yearly";
  preTax: boolean;
  date: string;
  notes: string;
  // Optional suspension fields
  suspendedFrom?: string | null;
  suspendedTo?: string | null;
  suspendedIndefinitely?: boolean;
  suspendedNote?: string | null;
  // Change history: records amount changes over time for this income
  changes?: Array<{
    amount: number;
    start: string; // ISO date when this amount became active
    end?: string | null; // ISO date when this amount ended (inclusive) or null if current
  }>;
  // Optional association to a wallet asset
  assetId?: string | null;
}

export interface ExpenseEntry {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  type: "need" | "want";
  // Optional association to a wallet asset
  assetId?: string | null;
}

export interface TithePayment {
  id: string;
  amount: number;
  date: string;
  given: boolean;
  // Optional asset this tithe was paid from
  assetId?: string | null;
}

export interface SubscriptionEntry {
  id: string;
  name: string;
  amount: number;
  frequency: "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Yearly";
  date: string; // start date ISO
  notes?: string;
  // cancellation fields
  cancelledFrom?: string | null;
  cancelledTo?: string | null;
  cancelledIndefinitely?: boolean;
  cancelledNote?: string | null;
  // change history similar to incomes
  changes?: Array<{
    amount: number;
    start: string;
    end?: string | null;
  }>;
  // Optional asset association
  assetId?: string | null;
}

export interface LiquidAsset {
  id: string;
  name: string;
  type: "Cash" | "Checking" | "Savings" | "Credit Card";
  startingAmount: number;
  currentAmount: number;
  enactDate?: string; // when the account becomes active
  closed?: boolean; // when true no new transactions can be created through the UI
  // Credit card specific fields
  creditLimit?: number | null;
  // credit limit change history
  creditLimitChanges?: Array<{
    amount: number;
    start: string; // YYYY-MM-DD
    end?: string | null;
  }>;
  paymentDueDay?: number | null; // day of month
  // simple transaction history
  transactions?: Array<{
    id: string;
    date: string;
    amount: number; // positive for inflow to this asset, negative for outflow (payments)
    memo?: string;
  }>;
}

export interface SavingsAccount {
  id: string;
  name: string;
  currentAmount: number;
  goalAmount: number;
  targetDate?: string;
}

export interface DebtEntry {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
}

interface FinanceState {
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  tithes: TithePayment[];
  savings: SavingsAccount[];
  debts: DebtEntry[];
  assets: LiquidAsset[];
  subscriptions: SubscriptionEntry[];

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
  removeAssetTransaction: (assetId: string, txId: string) => void;
  updateAssetCreditLimit: (
    assetId: string,
    newLimit: number,
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
          debts: [...state.debts, { ...debt, id: crypto.randomUUID() }],
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
              // For credit cards we store starting/current amounts as negative values to represent money owed
              startingAmount:
                asset.type === "Credit Card"
                  ? -Math.abs(asset.startingAmount ?? 0)
                  : asset.startingAmount ?? 0,
              currentAmount:
                asset.type === "Credit Card"
                  ? -Math.abs(asset.startingAmount ?? 0)
                  : asset.startingAmount ?? 0,
              // Only create a starting transaction for credit card accounts; other account types have no transactions
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
              // Initialize credit limit change history if provided
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
            // For non-credit accounts, disallow transactions that would drive the balance below zero.
            const curr = a.currentAmount ?? 0;
            let amt = tx.amount;
            if (a.type !== "Credit Card" && amt < 0) {
              // Allowed outflow is at most current balance
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
      removeAssetTransaction: (assetId, txId) =>
        set((state) => ({
          assets: state.assets.map((a) => {
            if (a.id !== assetId) return a;
            const newTransactions = (a.transactions || []).filter(
              (t) => t.id !== txId
            );
            // Recompute currentAmount conservatively from starting amount + remaining transactions
            const starting = a.startingAmount ?? 0;
            const computed = newTransactions.reduce(
              (s, t) => s + t.amount,
              starting
            );
            return {
              ...a,
              transactions: newTransactions,
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
            const newStart = startDate; // expected YYYY-MM-DD

            // keep only changes that start before the new start
            const kept = prev.filter(
              (c) => new Date(c.start) < new Date(newStart + "T12:00:00")
            );

            // close the last kept change the day before newStart
            if (kept.length > 0) {
              const last = kept[kept.length - 1];
              if (!last.end) {
                const dayBefore = new Date(newStart + "T12:00:00");
                dayBefore.setDate(dayBefore.getDate() - 1);
                last.end = dayBefore.toISOString().slice(0, 10);
              }
            }

            kept.push({ amount: newLimit, start: newStart, end: null });

            // If effective date is today or earlier, apply immediately
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
    }),
    {
      name: "finance-storage",
    }
  )
);
