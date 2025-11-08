// src/hooks/useNetWorth.tsx
import { useEffect, useMemo, useState } from "react";

/**
 * Assumptions:
 * - You have a global store / API that can return:
 *   - wallets: Array<{ id, name, type, balance }>
 *   - investments: Array<{ id, balance }>
 *   - debts: Array<{ id, balance }>
 *
 * Replace `getAppState()` with your actual data accessor (context, Zustand, Redux, etc.)
 */

type Wallet = { id: string; name: string; type?: string; balance: number };
type Investment = { id: string; balance: number };
type Debt = { id: string; balance: number };

function getAppState(): {
  wallets: Wallet[];
  investments: Investment[];
  debts: Debt[];
  subscribe?: (fn: () => void) => () => void;
} {
  // TODO: Replace this with your actual store accessor.
  // Example: return useStore.getState(); or context API
  // Minimal stub so this file compiles until you wire it up.
  return {
    wallets: [],
    investments: [],
    debts: [],
    subscribe: undefined,
  };
}

export function useNetWorth() {
  const [state, setState] = useState(getAppState());

  useEffect(() => {
    const app = getAppState();
    if (app.subscribe) {
      const unsubscribe = app.subscribe(() => setState(getAppState()));
      return unsubscribe;
    }
    // If no subscribe, we still set initial state.
    setState(getAppState());
    return () => {};
  }, []);

  const netWorth = useMemo(() => {
    const walletsTotal = (state.wallets || []).reduce(
      (s, w) => s + Number(w.balance || 0),
      0
    );
    const investmentsTotal = (state.investments || []).reduce(
      (s, i) => s + Number(i.balance || 0),
      0
    );
    const debtsTotal = (state.debts || []).reduce(
      (s, d) => s + Number(d.balance || 0),
      0
    );
    return {
      walletsTotal,
      investmentsTotal,
      debtsTotal,
      netWorth: walletsTotal + investmentsTotal - debtsTotal,
    };
  }, [state]);

  return netWorth;
}
