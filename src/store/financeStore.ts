import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  frequency: 'One-time' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly';
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
}

export interface ExpenseEntry {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  type: 'need' | 'want';
}

export interface TithePayment {
  id: string;
  amount: number;
  date: string;
  given: boolean;
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
  
  // Actions
  addIncome: (entry: Omit<IncomeEntry, 'id'>) => void;
  removeIncome: (id: string) => void;
  updateIncome: (id: string, updates: Partial<IncomeEntry>) => void;
  suspendIncome: (id: string, from: string, to?: string | null, indefinite?: boolean, comment?: string | null) => void;
  resumeIncome: (id: string) => void;
  
  addExpense: (entry: Omit<ExpenseEntry, 'id'>) => void;
  removeExpense: (id: string) => void;
  
  addTithe: (tithe: Omit<TithePayment, 'id'>) => void;
  markTitheGiven: (id: string) => void;
  updateTithe: (id: string, updates: Partial<TithePayment>) => void;
  removeTithe: (id: string) => void;
  
  addSavings: (account: Omit<SavingsAccount, 'id'>) => void;
  updateSavings: (id: string, updates: Partial<SavingsAccount>) => void;
  removeSavings: (id: string) => void;
  
  addDebt: (debt: Omit<DebtEntry, 'id'>) => void;
  updateDebt: (id: string, updates: Partial<DebtEntry>) => void;
  removeDebt: (id: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      income: [],
      expenses: [],
      tithes: [],
      savings: [],
      debts: [],
      
      addIncome: (entry) =>
        set((state) => ({
          income: [...state.income, { ...entry, id: crypto.randomUUID(), suspendedFrom: undefined, suspendedTo: undefined, suspendedIndefinitely: false, changes: [{ amount: entry.amount, start: entry.date, end: null }] }],
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

      suspendIncome: (id, from, to = null, indefinite = false, comment = undefined) =>
        set((state) => ({
          income: state.income.map((i) =>
            i.id === id
              ? { ...i, suspendedFrom: from, suspendedTo: to, suspendedIndefinitely: indefinite, suspendedNote: comment }
              : i
          ),
        })),

      resumeIncome: (id) =>
        set((state) => ({
          income: state.income.map((i) =>
            i.id === id ? { ...i, suspendedFrom: undefined, suspendedTo: undefined, suspendedIndefinitely: false, suspendedNote: undefined } : i
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
          tithes: state.tithes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
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
    }),
    {
      name: 'finance-storage',
    }
  )
);
