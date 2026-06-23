import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { X, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Monthly amounts editor for variable-price bills and subscriptions.
 *
 * Shows a list of months with pre-populated input fields for setting
 * the price for each month. Keys are "YYYY-MM" format month strings.
 * Layout matches VariableAmountsEditor exactly.
 */

type Props = {
  entryId: string;
  entryName: string;
  monthlyPrices: Record<string, number>;
  defaultAmount: number;
  onUpdate: (id: string, updates: { monthlyPrices: Record<string, number> }) => void;
};

const PAGE_SIZE = 12;
const INITIAL_BEFORE = 3;
const INITIAL_AFTER = 8;

/**
 * Format date as YYYY-MM month string.
 */
function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyAmountsEditor({
  entryId,
  entryName,
  monthlyPrices,
  defaultAmount,
  onUpdate,
}: Props) {
  const [earlierCount, setEarlierCount] = useState(INITIAL_BEFORE);
  const [laterCount, setLaterCount] = useState(INITIAL_AFTER);
  const [localPrices, setLocalPrices] = useState<Record<string, number>>(() => ({ ...monthlyPrices }));

  // Find current month
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentMonthKey = useMemo(() => formatMonthKey(today), [today]);

  // Find the earliest month to show
  const earliestMonth = useMemo(() => {
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < earlierCount; i++) {
      cursor = subMonths(cursor, 1);
    }
    return cursor;
  }, [today, earlierCount]);

  // Generate months to display
  const months = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      date: Date;
      isCurrent: boolean;
    }[] = [];

    const count = INITIAL_BEFORE + 1 + laterCount;
    let cursor = new Date(earliestMonth);

    for (let i = 0; i < count; i++) {
      const key = formatMonthKey(cursor);
      rows.push({
        key,
        label: `Month of ${format(cursor, "MMMM yyyy")}`,
        date: new Date(cursor),
        isCurrent: key === currentMonthKey,
      });
      cursor = addMonths(cursor, 1);
    }

    return rows;
  }, [earliestMonth, currentMonthKey, laterCount]);

  const setPrice = (key: string, value: number | null) => {
    const next = { ...localPrices };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalPrices(next);
    onUpdate(entryId, { monthlyPrices: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEarlierCount((c) => c + PAGE_SIZE)}
          className="gap-1 w-full"
        >
          <ChevronUp className="h-4 w-4" />
          Load earlier months
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {months.map((m) => {
          const hasOverride = Object.prototype.hasOwnProperty.call(localPrices, m.key);
          return (
            <div
              key={m.key}
              className={`flex items-center gap-2 p-2 ${m.isCurrent ? "bg-muted/40" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {format(m.date, "MMM yyyy")}
                  {m.isCurrent ? " · Current" : ""}
                </p>
              </div>
              <div className="w-36">
                <CurrencyInput
                  value={hasOverride ? localPrices[m.key] : null}
                  onChange={(v) => setPrice(m.key, v)}
                  placeholder={defaultAmount.toFixed(2)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!hasOverride}
                onClick={() => setPrice(m.key, null)}
                aria-label="Reset to default amount"
                title="Reset to default amount"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLaterCount((c) => c + PAGE_SIZE)}
          className="gap-1 w-full"
        >
          <ChevronDown className="h-4 w-4" />
          Load later months
        </Button>
      </div>
    </div>
  );
}
