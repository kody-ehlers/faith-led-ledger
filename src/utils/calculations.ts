import {
  IncomeEntry,
  ExpenseEntry,
  SavingsAccount, LiquidAsset,
  DebtEntry,
  BillEntry,
  SubscriptionEntry,
  TithePayment,
} from "@/store/financeStore";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isEqual,
} from "date-fns";

export const calculateMonthlyIncome = (income: IncomeEntry[]): number => {
  // Calculate the total income for the current month by enumerating occurrences
  // and using any change history to determine the amount for each occurrence.
  const now = new Date();
  return calculateIncomeForMonth(income, now, /*includePreTax*/ true);
};

export const calculatePostTaxIncome = (income: IncomeEntry[]): number => {
  // Use the monthly occurrence enumeration but exclude pre-tax incomes
  const now = new Date();
  return calculateIncomeForMonth(income, now, /*includePreTax*/ false);
};

// Public wrapper to calculate income for an arbitrary month. includePreTax controls
// whether pre-tax incomes are counted (default true).
export const calculateIncomeForMonthPublic = (
  income: IncomeEntry[],
  targetDate = new Date(),
  includePreTax = true
): number => {
  return calculateIncomeForMonth(income, targetDate, includePreTax);
};

// Calculate how much a single income entry contributes in the given month (respects
// suspensions and change history). Returns 0 for preTax entries when includePreTax is false.
export const getEntryIncomeForMonth = (
  entry: IncomeEntry,
  targetDate = new Date(),
  includePreTax = true,
  asOfDate = new Date()
): number => {
  if (!includePreTax && entry.preTax) return 0;

  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const isDateSuspended = (date: Date) => {
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

  // One-time
  if (entry.frequency === "One-time") {
    const d = new Date(entry.date);
    if (
      d.getFullYear() === monthStart.getFullYear() &&
      d.getMonth() === monthStart.getMonth()
    ) {
      if (!isDateSuspended(d)) return getAmountForDate(entry, d);
    }
    return 0;
  }

  // Recurring: iterate occurrences within the month and sum per-occurrence amounts
  let total = 0;
  let occurrence = new Date(entry.date);
  const advanceOnce = (date: Date) => {
    switch (entry.frequency) {
      case "Weekly":
        return addDays(date, 7);
      case "Biweekly":
        return addDays(date, 14);
      case "Monthly":
        return addMonths(date, 1);
      case "Bimonthly":
        return addMonths(date, 2);
      case "Quarterly":
        return addMonths(date, 3);
      case "Yearly":
        return addYears(date, 1);
      default:
        return addMonths(date, 1);
    }
  };

  if (isAfter(occurrence, monthEnd)) return 0;

  let guard = 0;
  while (isBefore(occurrence, monthStart) && guard < 1000) {
    occurrence = advanceOnce(occurrence);
    guard++;
    if (isAfter(occurrence, monthEnd)) break;
  }

  guard = 0;
  while (
    (isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) &&
    guard < 1000
  ) {
    if (
      (isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) &&
      !isDateSuspended(occurrence)
    ) {
      total += getAmountForDate(entry, occurrence);
    }
    occurrence = advanceOnce(occurrence);
    guard++;
  }

  return total;
};

// Helper: normalize a date to date-only (local) for comparisons
const toDateOnly = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Helper: get the amount that applies for an income entry on a specific date (date-only comparisons)
export const getAmountForDate = (entry: IncomeEntry, date: Date): number => {
  if (!entry.changes || entry.changes.length === 0) return entry.amount;
  const target = toDateOnly(date).getTime();
  // Ensure changes are processed in ascending start order
  const changes = [...entry.changes].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  for (const ch of changes) {
    const start = toDateOnly(new Date(ch.start)).getTime();
    const end = ch.end ? toDateOnly(new Date(ch.end)).getTime() : null;
    if (target >= start && (!end || target <= end)) {
      return ch.amount;
    }
  }
  // Fallback: return the last change amount
  return changes[changes.length - 1].amount;
};

// Enumerate occurrences in the month and sum amounts; respects suspensions and changes
const calculateIncomeForMonth = (
  income: IncomeEntry[],
  targetDate: Date,
  includePreTax: boolean
) => {
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
    if (!includePreTax && entry.preTax) continue;

    const start = new Date(entry.date);

    if (entry.frequency === "One-time") {
      const d = start;
      if (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth()
      ) {
        if (!isDateSuspended(entry, d)) total += getAmountForDate(entry, d);
      }
      continue;
    }

    let occurrence = new Date(start);
    const advanceOnce = (date: Date) => {
      switch (entry.frequency) {
        case "Weekly":
          return addDays(date, 7);
        case "Biweekly":
          return addDays(date, 14);
        case "Monthly":
          return addMonths(date, 1);
        case "Bimonthly":
          return addMonths(date, 2);
        case "Quarterly":
          return addMonths(date, 3);
        case "Yearly":
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
    while (
      (isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) &&
      guard < 1000
    ) {
      if (
        (isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) &&
        !isDateSuspended(entry, occurrence)
      ) {
        total += getAmountForDate(entry, occurrence);
      }
      occurrence = advanceOnce(occurrence);
      guard++;
    }
  }

  return total;
};

export const calculatePostTaxIncomeForMonth = (
  income: IncomeEntry[],
  targetDate = new Date()
): number => {
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

    if (entry.frequency === "One-time") {
      const d = start;
      if (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth()
      ) {
        if (!isDateSuspended(entry, d)) total += getAmountForDate(entry, d);
      }
      continue;
    }

    // For recurring incomes, iterate occurrences falling within the target month
    let occurrence = new Date(start);

    // Fast-forward to the first occurrence on/after monthStart
    const advanceOnce = (date: Date) => {
      switch (entry.frequency) {
        case "Weekly":
          return addDays(date, 7);
        case "Biweekly":
          return addDays(date, 14);
        case "Monthly":
          return addMonths(date, 1);
        case "Bimonthly":
          return addMonths(date, 2);
        case "Quarterly":
          return addMonths(date, 3);
        case "Yearly":
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
    while (
      (isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) &&
      guard < 1000
    ) {
      // If occurrence is within monthStart..monthEnd and not suspended on that date, count it
      if (
        (isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) &&
        !isDateSuspended(entry, occurrence)
      ) {
        total += getAmountForDate(entry, occurrence);
      }
      occurrence = advanceOnce(occurrence);
      guard++;
    }
  }

  return total;
};

export const calculatePostTaxIncomeReceivedSoFar = (
  income: IncomeEntry[],
  asOfDate = new Date()
): number => {
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

    if (entry.frequency === "One-time") {
      const d = start;
      if (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth() &&
        (isBefore(d, asOfDate) || isEqual(d, asOfDate))
      ) {
        if (!isDateSuspended(entry, d)) total += getAmountForDate(entry, d);
      }
      continue;
    }

    // Recurring: iterate occurrences within the month up to asOfDate
    let occurrence = new Date(start);
    const advanceOnce = (date: Date) => {
      switch (entry.frequency) {
        case "Weekly":
          return addDays(date, 7);
        case "Biweekly":
          return addDays(date, 14);
        case "Monthly":
          return addMonths(date, 1);
        case "Bimonthly":
          return addMonths(date, 2);
        case "Quarterly":
          return addMonths(date, 3);
        case "Yearly":
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
    while (
      (isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) &&
      guard < 1000
    ) {
      // only include occurrences on or before asOfDate
      if (
        (isAfter(occurrence, monthStart) || isEqual(occurrence, monthStart)) &&
        (isBefore(occurrence, asOfDate) || isEqual(occurrence, asOfDate)) &&
        !isDateSuspended(entry, occurrence)
      ) {
        total += getAmountForDate(entry, occurrence);
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
    .filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    })
    .reduce((total, expense) => total + expense.amount, 0);
};

export const calculateNetWorth = (
  assets: LiquidAsset[],
  debts: DebtEntry[]
): number => {
  const totalAssets = assets.reduce((sum, acc) => sum + acc.currentAmount, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  return totalAssets - totalDebts;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export const calculateCategoryTotals = (
  expenses: ExpenseEntry[]
): Record<string, number> => {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
};

// Transaction history for wallet accounts
export interface WalletTransaction {
  date: string; // ISO date
  amount: number; // positive for income/inflows, negative for expenses/outflows
  description: string;
  type: "income" | "expense" | "bill" | "subscription" | "tithe" | "manual";
  balance: number; // running balance after this transaction
}

/**
 * Calculate all transactions affecting a specific wallet account from its enactDate to today
 */
export const calculateWalletTransactions = (
  assetId: string,
  asset: LiquidAsset,
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  bills: BillEntry[],
  subscriptions: SubscriptionEntry[],
  tithes: TithePayment[]
): WalletTransaction[] => {
  const transactions: Array<WalletTransaction & { dateObj: Date }> = [];
  
  const enactDate = asset.enactDate
    ? new Date(asset.enactDate + "T00:00:00")
    : asset.enactDate
    ? new Date(asset.enactDate)
    : new Date(0); // very old date as fallback
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Add income transactions
  for (const incomeEntry of income) {
    if (incomeEntry.assetId !== assetId) continue;

    const startDate = new Date(incomeEntry.date);
    if (isAfter(startDate, today)) continue;

    if (incomeEntry.frequency === "One-time") {
      if (isAfter(startDate, enactDate) || isEqual(startDate, enactDate)) {
        transactions.push({
          dateObj: startDate,
          date: startDate.toISOString().slice(0, 10),
          amount: incomeEntry.amount,
          description: `Income: ${incomeEntry.source}`,
          type: "income",
          balance: 0, // will be calculated later
        });
      }
    } else {
      // Recurring income - add each occurrence from enactDate to today
      let occurrence = new Date(startDate);
      const advanceOnce = (date: Date) => {
        switch (incomeEntry.frequency) {
          case "Weekly":
            return addDays(date, 7);
          case "Biweekly":
            return addDays(date, 14);
          case "Monthly":
            return addMonths(date, 1);
          case "Bimonthly":
            return addMonths(date, 2);
          case "Quarterly":
            return addMonths(date, 3);
          case "Yearly":
            return addYears(date, 1);
          default:
            return addMonths(date, 1);
        }
      };

      let guard = 0;
      while (isBefore(occurrence, enactDate) && guard < 1000) {
        occurrence = advanceOnce(occurrence);
        guard++;
      }

      guard = 0;
      while (isBefore(occurrence, today) && guard < 1000) {
        const isSuspended = incomeEntry.suspendedFrom &&
          dateIsSuspended(occurrence, incomeEntry.suspendedFrom, incomeEntry.suspendedTo, incomeEntry.suspendedIndefinitely);
        
        if (!isSuspended) {
          const amount = getAmountForDate(incomeEntry, occurrence);
          transactions.push({
            dateObj: occurrence,
            date: occurrence.toISOString().slice(0, 10),
            amount,
            description: `Income: ${incomeEntry.source}`,
            type: "income",
            balance: 0, // will be calculated later
          });
        }
        occurrence = advanceOnce(occurrence);
        guard++;
      }
    }
  }

  // Add expense transactions
  for (const expense of expenses) {
    if (expense.assetId !== assetId) continue;
    const expenseDate = new Date(expense.date);
    if (isBefore(expenseDate, enactDate) || isAfter(expenseDate, today)) continue;
    
    transactions.push({
      dateObj: expenseDate,
      date: expense.date.slice(0, 10),
      amount: -expense.amount,
      description: `Expense: ${expense.name}`,
      type: "expense",
      balance: 0,
    });
  }

  // Add bill payments (when marked as paid in paidMonths)
  for (const bill of bills) {
    if (bill.assetId !== assetId) continue;
    
    if (bill.paidMonths && bill.paidMonths.length > 0) {
      for (const paidMonth of bill.paidMonths) {
        // Parse YYYY-MM format and create payment date on the 1st of the month
        const [year, month] = paidMonth.split("-").map(Number);
        const paymentDate = new Date(year, month - 1, 1);
        
        if (isAfter(paymentDate, enactDate) && isBefore(paymentDate, today)) {
          const amount = bill.variablePrice
            ? bill.monthlyPrices?.[paidMonth] || bill.amount
            : bill.amount;
          
          transactions.push({
            dateObj: paymentDate,
            date: paymentDate.toISOString().slice(0, 10),
            amount: -amount,
            description: `Bill Payment: ${bill.name}`,
            type: "bill",
            balance: 0,
          });
        }
      }
    }
  }

  // Add subscription payments (recurring charges)
  for (const subscription of subscriptions) {
    if (subscription.assetId !== assetId) continue;

    const startDate = new Date(subscription.date);
    if (isAfter(startDate, today)) continue;

    if (subscription.frequency) {
      let occurrence = new Date(startDate);
      const advanceOnce = (date: Date) => {
        switch (subscription.frequency) {
          case "Weekly":
            return addDays(date, 7);
          case "Biweekly":
            return addDays(date, 14);
          case "Monthly":
            return addMonths(date, 1);
          case "Bimonthly":
            return addMonths(date, 2);
          case "Quarterly":
            return addMonths(date, 3);
          case "Yearly":
            return addYears(date, 1);
          default:
            return addMonths(date, 1);
        }
      };

      let guard = 0;
      while (isBefore(occurrence, enactDate) && guard < 1000) {
        occurrence = advanceOnce(occurrence);
        guard++;
      }

      guard = 0;
      while (isBefore(occurrence, today) && guard < 1000) {
        const isCancelled = subscription.cancelledFrom &&
          dateIsSuspended(occurrence, subscription.cancelledFrom, subscription.cancelledTo, subscription.cancelledIndefinitely);
        
        if (!isCancelled) {
          const monthKey = occurrence.toISOString().slice(0, 7); // YYYY-MM
          const amount = subscription.variablePrice
            ? subscription.monthlyPrices?.[monthKey] || subscription.amount
            : subscription.amount;
          
          transactions.push({
            dateObj: occurrence,
            date: occurrence.toISOString().slice(0, 10),
            amount: -amount,
            description: `Subscription: ${subscription.name}`,
            type: "subscription",
            balance: 0,
          });
        }
        occurrence = advanceOnce(occurrence);
        guard++;
      }
    }
  }

  // Add tithe payments
  for (const tithe of tithes) {
    if (tithe.assetId !== assetId) continue;
    const titheDate = new Date(tithe.date);
    if (isBefore(titheDate, enactDate) || isAfter(titheDate, today)) continue;
    
    if (tithe.given) {
      transactions.push({
        dateObj: titheDate,
        date: tithe.date.slice(0, 10),
        amount: -tithe.amount,
        description: `Tithe`,
        type: "tithe",
        balance: 0,
      });
    }
  }

  // Add manual credit card transactions
  if (asset.transactions && asset.transactions.length > 0) {
    for (const tx of asset.transactions) {
      const txDate = new Date(tx.date);
      if (isBefore(txDate, enactDate) || isAfter(txDate, today)) continue;
      
      transactions.push({
        dateObj: txDate,
        date: txDate.toISOString().slice(0, 10),
        amount: tx.amount,
        description: tx.memo || "Manual transaction",
        type: "manual",
        balance: 0,
      });
    }
  }

  // Sort by date
  transactions.sort((a, b) => new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime());

  // Determine if there's an explicit starting transaction to avoid double-counting
  const hasStartingTx =
    asset.transactions &&
    asset.transactions.some(
      (t) =>
        (t.memo === "Starting balance" || t.memo === "Starting Balance") &&
        Number(t.amount) === Number(asset.startingAmount)
    );

  // Calculate running balances
  let runningBalance = hasStartingTx ? 0 : asset.startingAmount || 0;
  const result = transactions.map((tx) => ({
    ...tx,
    balance: (runningBalance += tx.amount),
  }));

  // Remove the temporary dateObj field
  return result.map(({ dateObj, ...rest }) => rest);
};

// Helper: check if a date is suspended/cancelled
const dateIsSuspended = (
  date: Date,
  suspendedFrom: string | undefined,
  suspendedTo: string | null | undefined,
  suspendedIndefinitely: boolean | undefined
): boolean => {
  if (!suspendedFrom) return false;
  const from = new Date(suspendedFrom);
  if (isAfter(from, date)) return false;
  if (suspendedIndefinitely) return true;
  if (suspendedTo) {
    const to = new Date(suspendedTo);
    return !isAfter(date, to);
  }
  return false;
};

/**
 * Calculate the current balance of a wallet account based on all transactions
 * up to today. Uses the starting amount plus all associated transactions.
 */
export const calculateWalletBalance = (
  asset: LiquidAsset,
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  bills: BillEntry[],
  subscriptions: SubscriptionEntry[],
  tithes: TithePayment[]
): number => {
  const transactions = calculateWalletTransactions(
    asset.id,
    asset,
    income,
    expenses,
    bills,
    subscriptions,
    tithes
  );

  // If there are transactions, return the last balance
  // Otherwise, return the starting amount
  if (transactions.length > 0) {
    return transactions[transactions.length - 1].balance;
  }

  return asset.startingAmount || 0;
};
