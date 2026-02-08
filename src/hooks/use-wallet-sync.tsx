import { useEffect, useRef } from "react";
import { useFinanceStore } from "@/store/financeStore";

/**
 * This hook synchronizes wallet balances with income, expenses, bills, and subscriptions
 * that have an associated wallet (assetId). It runs once on app mount and creates
 * asset transactions for any linked entries that haven't been synced yet.
 * 
 * The sync tracks which entries have already been processed via a localStorage key.
 */
const SYNC_KEY = "wallet-sync-processed";

interface SyncedIds {
  incomes: string[];
  expenses: string[];
  bills: { id: string; months: string[] }[];
  subscriptions: { id: string; months: string[] }[];
}

export function useWalletSync() {
  const {
    income,
    expenses,
    bills,
    subscriptions,
    addAssetTransaction,
  } = useFinanceStore();

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Load already-synced IDs
    let synced: SyncedIds = { incomes: [], expenses: [], bills: [], subscriptions: [] };
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) synced = JSON.parse(raw);
    } catch {
      // ignore
    }

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // Sync incomes: add positive transaction for incomes with assetId that haven't been synced
    for (const inc of income) {
      if (inc.assetId && !synced.incomes.includes(inc.id)) {
        // Only sync if the income date is in the past
        const incDate = new Date(inc.date);
        if (incDate <= today) {
          addAssetTransaction(inc.assetId, {
            date: inc.date,
            amount: inc.amount,
            memo: `Income: ${inc.source}`,
          });
          synced.incomes.push(inc.id);
        }
      }
    }

    // Sync expenses: subtract from linked wallet
    for (const exp of expenses) {
      if (exp.assetId && !synced.expenses.includes(exp.id)) {
        const expDate = new Date(exp.date);
        if (expDate <= today) {
          addAssetTransaction(exp.assetId, {
            date: exp.date,
            amount: -exp.amount,
            memo: `Expense: ${exp.name}`,
          });
          synced.expenses.push(exp.id);
        }
      }
    }

    // Sync bills: subtract from linked wallet for paid months
    for (const bill of bills) {
      if (!bill.assetId) continue;
      
      let billSync = synced.bills.find((b) => b.id === bill.id);
      if (!billSync) {
        billSync = { id: bill.id, months: [] };
        synced.bills.push(billSync);
      }

      const paidMonths = bill.paidMonths || [];
      for (const month of paidMonths) {
        if (!billSync.months.includes(month)) {
          // Only sync if month is current or past
          if (month <= currentMonth) {
            const price = bill.variablePrice && bill.monthlyPrices?.[month]
              ? bill.monthlyPrices[month]
              : bill.amount;
            addAssetTransaction(bill.assetId, {
              date: `${month}-15T12:00:00`,
              amount: -price,
              memo: `Bill: ${bill.name}`,
            });
            billSync.months.push(month);
          }
        }
      }
    }

    // Sync subscriptions: subtract from linked wallet for paid months
    for (const sub of subscriptions) {
      if (!sub.assetId) continue;
      
      let subSync = synced.subscriptions.find((s) => s.id === sub.id);
      if (!subSync) {
        subSync = { id: sub.id, months: [] };
        synced.subscriptions.push(subSync);
      }

      const paidMonths = sub.paidMonths || [];
      for (const month of paidMonths) {
        if (!subSync.months.includes(month)) {
          if (month <= currentMonth) {
            const price = sub.variablePrice && sub.monthlyPrices?.[month]
              ? sub.monthlyPrices[month]
              : sub.amount;
            addAssetTransaction(sub.assetId, {
              date: `${month}-15T12:00:00`,
              amount: -price,
              memo: `Subscription: ${sub.name}`,
            });
            subSync.months.push(month);
          }
        }
      }
    }

    // Save updated sync state
    localStorage.setItem(SYNC_KEY, JSON.stringify(synced));
  }, [income, expenses, bills, subscriptions, addAssetTransaction]);
}
