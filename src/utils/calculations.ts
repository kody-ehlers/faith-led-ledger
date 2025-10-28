import { IncomeEntry, ExpenseEntry, SavingsAccount, DebtEntry } from '@/store/financeStore';
import {
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isEqual,
} from 'date-fns';

export const calculateMonthlyIncome = (income: IncomeEntry[]): number => {
  const now = new Date();

  const isCurrentlySuspended = (entry: IncomeEntry) => {
    if (!entry.suspendedFrom) return false;
    const from = new Date(entry.suspendedFrom);
    if (now < from) return false; // suspension hasn't started yet
    if (entry.suspendedIndefinitely) return true;
    if (entry.suspendedTo) {
      const to = new Date(entry.suspendedTo);
      return now <= to;
    }
    return false;
  };

  return income.reduce((total, entry) => {
    if (isCurrentlySuspended(entry)) return total;
    let monthlyAmount = 0;
    switch (entry.frequency) {
      case 'Weekly':
        monthlyAmount = entry.amount * 4.33;
        break;
      case 'Biweekly':
        monthlyAmount = entry.amount * 2.17;
        break;
      case 'Monthly':
        monthlyAmount = entry.amount;
        break;
      case 'Quarterly':
        monthlyAmount = entry.amount / 3;
        break;
      case 'Yearly':
        monthlyAmount = entry.amount / 12;
        break;
      default:
        monthlyAmount = 0;
    }
    return total + monthlyAmount;
  }, 0);
};

export const calculatePostTaxIncome = (income: IncomeEntry[]): number => {
  const now = new Date();

  const isCurrentlySuspended = (entry: IncomeEntry) => {
    if (!entry.suspendedFrom) return false;
    const from = new Date(entry.suspendedFrom);
    if (now < from) return false; // suspension hasn't started yet
    if (entry.suspendedIndefinitely) return true;
    if (entry.suspendedTo) {
      const to = new Date(entry.suspendedTo);
      return now <= to;
    }
    return false;
  };

  return income
    .filter(entry => !entry.preTax && !isCurrentlySuspended(entry))
    .reduce((total, entry) => {
      let monthlyAmount = 0;
      switch (entry.frequency) {
        case 'Weekly':
          monthlyAmount = entry.amount * 4.33;
          break;
        case 'Biweekly':
          monthlyAmount = entry.amount * 2.17;
          break;
        case 'Monthly':
          monthlyAmount = entry.amount;
          break;
        case 'Quarterly':
          monthlyAmount = entry.amount / 3;
          break;
        case 'Yearly':
          monthlyAmount = entry.amount / 12;
          break;
        default:
          monthlyAmount = 0;
      }
      return total + monthlyAmount;
    }, 0);
};

export const calculatePostTaxIncomeForMonth = (income: IncomeEntry[], targetDate = new Date()): number => {
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const isDateSuspended = (entry: IncomeEntry, date: Date) => {
    if (!entry.suspendedFrom) return false;
    const from = new Date(entry.suspendedFrom);
    if (isAfter(from, date)) return false; // suspension starts after this date
    if (entry.suspendedIndefinitely) return true;
    if (entry.suspendedTo) {
      const to = new Date(entry.suspendedTo);
      return !isAfter(date, to); // date <= to
    }
    return false;
  };

  let total = 0;

  for (const entry of income) {
    if (entry.preTax) continue; // skip pre-tax incomes for tithe

    const start = new Date(entry.date);

    if (entry.frequency === 'One-time') {
      const d = start;
      if (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth()
      ) {
        if (!isDateSuspended(entry, d)) total += entry.amount;
      }
      continue;
    }

    // For recurring incomes, iterate occurrences falling within the target month
    let occurrence = new Date(start);

    // Fast-forward to the first occurrence on/after monthStart
    const advanceOnce = (date: Date) => {
      switch (entry.frequency) {
        case 'Weekly':
          return addDays(date, 7);
        case 'Biweekly':
          return addDays(date, 14);
        case 'Monthly':
          return addMonths(date, 1);
        case 'Quarterly':
          return addMonths(date, 3);
        case 'Yearly':
          return addYears(date, 1);
        default:
          return addMonths(date, 1);
      }
    };

    // If the start is after monthEnd, skip
    if (isAfter(occurrence, monthEnd)) continue;

    // Advance until occurrence >= monthStart (but guard iterations)
    let guard = 0;
    while (isBefore(occurrence, monthStart) && guard < 1000) {
      occurrence = advanceOnce(occurrence);
      guard++;
      if (isAfter(occurrence, monthEnd)) break;
    }

    // Now iterate occurrences within the month
    guard = 0;
    while ((isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) && guard < 1000) {
      // If occurrence is within monthStart..monthEnd and not suspended on that date, count it
      if ((isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) && !isDateSuspended(entry, occurrence)) {
        total += entry.amount;
      }
      occurrence = advanceOnce(occurrence);
      guard++;
    }
  }

  return total;
};

export const calculatePostTaxIncomeReceivedSoFar = (income: IncomeEntry[], asOfDate = new Date()): number => {
  // Sum post-tax income occurrences for the month of `asOfDate` where occurrence date <= asOfDate
  const monthStart = startOfMonth(asOfDate);
  const monthEnd = endOfMonth(asOfDate);

  const isDateSuspended = (entry: IncomeEntry, date: Date) => {
    if (!entry.suspendedFrom) return false;
    const from = new Date(entry.suspendedFrom);
    if (isAfter(from, date)) return false; // suspension starts after this date
    if (entry.suspendedIndefinitely) return true;
    if (entry.suspendedTo) {
      const to = new Date(entry.suspendedTo);
      return !isAfter(date, to); // date <= to
    }
    return false;
  };

  let total = 0;

  for (const entry of income) {
    if (entry.preTax) continue;

    const start = new Date(entry.date);

    if (entry.frequency === 'One-time') {
      const d = start;
      if (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth() &&
        (isBefore(d, asOfDate) || isEqual(d, asOfDate))
      ) {
        if (!isDateSuspended(entry, d)) total += entry.amount;
      }
      continue;
    }

    // Recurring: iterate occurrences within the month up to asOfDate
    let occurrence = new Date(start);
    const advanceOnce = (date: Date) => {
      switch (entry.frequency) {
        case 'Weekly':
          return addDays(date, 7);
        case 'Biweekly':
          return addDays(date, 14);
        case 'Monthly':
          return addMonths(date, 1);
        case 'Quarterly':
          return addMonths(date, 3);
        case 'Yearly':
          return addYears(date, 1);
        default:
          return addMonths(date, 1);
      }
    };

    if (isAfter(occurrence, monthEnd)) continue;

    let guard = 0;
    while (isBefore(occurrence, monthStart) && guard < 1000) {
      occurrence = advanceOnce(occurrence);
      guard++;
      if (isAfter(occurrence, monthEnd)) break;
    }

    guard = 0;
    while ((isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) && guard < 1000) {
      // only include occurrences on or before asOfDate
      if ((isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) && (isBefore(occurrence, asOfDate) || isEqual(occurrence, asOfDate)) && !isDateSuspended(entry, occurrence)) {
        total += entry.amount;
      }
      occurrence = advanceOnce(occurrence);
      guard++;
    }
  }

  return total;
};

export const calculateTitheAmount = (postTaxIncome: number): number => {
  return postTaxIncome * 0.1;
};

export const calculateMonthlyExpenses = (expenses: ExpenseEntry[]): number => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((total, expense) => total + expense.amount, 0);
};

export const calculateNetWorth = (
  savings: SavingsAccount[],
  debts: DebtEntry[]
): number => {
  const totalAssets = savings.reduce((sum, acc) => sum + acc.currentAmount, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  return totalAssets - totalDebts;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateCategoryTotals = (expenses: ExpenseEntry[]): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};
