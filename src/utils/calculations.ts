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
  return calculateIncomeForMonth(income, now, /*includePreTax*/ true, now);
};

export const calculatePostTaxIncome = (income: IncomeEntry[]): number => {
  // Use the monthly occurrence enumeration but exclude pre-tax incomes
  const now = new Date();
  return calculateIncomeForMonth(income, now, /*includePreTax*/ false, now);
};

// Public wrapper to calculate income for an arbitrary month. includePreTax controls
// whether pre-tax incomes are counted (default true).
export const calculateIncomeForMonthPublic = (
  income: IncomeEntry[],
  targetDate = new Date(),
  includePreTax = true
): number => {
  return calculateIncomeForMonth(income, targetDate, includePreTax, targetDate);
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
  includePreTax: boolean,
  asOfDate: Date = new Date()
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
        d.getMonth() === monthStart.getMonth() &&
        !isAfter(d, asOfDate)
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

    if (isAfter(occurrence, monthEnd) || isAfter(occurrence, asOfDate)) continue;

    let guard = 0;
    while (isBefore(occurrence, monthStart) && guard < 1000) {
      occurrence = advanceOnce(occurrence);
      guard++;
      if (isAfter(occurrence, monthEnd)) break;
    }

    guard = 0;
    while (
      (isBefore(occurrence, monthEnd) || isEqual(occurrence, monthEnd)) &&
      !isAfter(occurrence, asOfDate) &&
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

export const calculateMonthlyExpenses = (
  expenses: ExpenseEntry[],
  bills: BillEntry[],
  subscriptions: SubscriptionEntry[],
  tithes: TithePayment[],
  assets: LiquidAsset[],
  asOfDate: Date = new Date()
): number => {
  const now = asOfDate;
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM

  let total = 0;

  // 1) Expenses with a date in the current month
  for (const e of expenses) {
    const d = new Date(e.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      total += e.amount;
    }
  }

  // 2) Tithes with a date in the current month
  for (const t of tithes) {
    const d = new Date(t.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      total += t.amount;
    }
  }

  // 3) Bills that have been marked paid for this month (paidMonths contains YYYY-MM)
  for (const b of bills) {
    if (!b.paidMonths) continue;
    if (b.paidMonths.includes(monthKey)) {
      const amount = b.variablePrice ? b.monthlyPrices?.[monthKey] || b.amount : b.amount;
      total += amount;
    }
  }

  // 4) Subscriptions: include if paidMonths includes monthKey, or if autopay and scheduled occurrence for this month is on-or-before today
  for (const s of subscriptions) {
    const amountForMonth = s.variablePrice ? s.monthlyPrices?.[monthKey] || s.amount : s.amount;
    if (s.paidMonths && s.paidMonths.includes(monthKey)) {
      total += amountForMonth;
      continue;
    }

    if (s.autopay) {
      // find occurrence date for this month
      const start = new Date(s.date);
      if (isAfter(start, now)) continue;

      let occ = new Date(start);
      const advance = (d: Date) => {
        switch (s.frequency) {
          case "Weekly":
            return addDays(d, 7);
          case "Biweekly":
            return addDays(d, 14);
          case "Monthly":
            return addMonths(d, 1);
          case "Bimonthly":
            return addMonths(d, 2);
          case "Quarterly":
            return addMonths(d, 3);
          case "Yearly":
            return addYears(d, 1);
          default:
            return addMonths(d, 1);
        }
      };

      let guard = 0;
      while (occ.getFullYear() < now.getFullYear() || (occ.getFullYear() === now.getFullYear() && occ.getMonth() < now.getMonth())) {
        occ = advance(occ);
        guard++;
        if (guard > 1000) break;
      }

      if (occ.getFullYear() === now.getFullYear() && occ.getMonth() === now.getMonth()) {
        // treat as spent if occurrence date is on-or-before today
        const occDate = occ;
        if (!isAfter(occDate, now)) {
          total += amountForMonth;
        }
      }
    }
  }

  // 5) Manual asset transactions (negative amounts) for the month — avoid double-counting by skipping transactions that match an expense/bill/subscription/tithe already counted
  const alreadyCounted = new Set<string>();
  // mark expenses
  for (const e of expenses) {
    const key = `${e.date}|${e.amount}`;
    alreadyCounted.add(key);
  }
  for (const t of tithes) {
    const key = `${t.date}|${t.amount}`;
    alreadyCounted.add(key);
  }
  for (const b of bills) {
    if (!b.paidMonths) continue;
    for (const pm of b.paidMonths) {
      if (pm === monthKey) {
        const key = `${pm}|${b.amount}`;
        alreadyCounted.add(key);
      }
    }
  }
  for (const s of subscriptions) {
    if (!s.paidMonths) continue;
    for (const pm of s.paidMonths) {
      if (pm === monthKey) {
        const key = `${pm}|${s.amount}`;
        alreadyCounted.add(key);
      }
    }
  }

  for (const a of assets) {
    if (!a.transactions) continue;
    for (const tx of a.transactions) {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth()) {
        const key1 = `${tx.date}|${-Math.abs(tx.amount)}`;
        const key2 = `${tx.date}|${tx.amount}`;
        // consider negative amounts as outflows
        const amt = tx.amount;
        if (amt < 0) {
          // skip if matched
          if (alreadyCounted.has(key1) || alreadyCounted.has(key2)) continue;
          total += -amt;
        }
      }
    }
  }

  return total;
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
  type: "income" | "expense" | "bill" | "subscription" | "tithe" | "manual" | "interest" | "debt";
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

  // Add interest history transactions
  for (const interest of asset.interestHistory || []) {
    const interestDate = new Date(interest.date);
    if (isBefore(interestDate, enactDate) || isAfter(interestDate, today)) continue;
    
    transactions.push({
      dateObj: interestDate,
      date: interest.date.slice(0, 10),
      amount: interest.amount,
      description: interest.memo || "Interest earned",
      type: "interest",
      balance: 0,
    });
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
