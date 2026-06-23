import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { addDays, addMonths, addYears, format } from "date-fns";
import { X, ChevronUp, ChevronDown, Lock } from "lucide-react";

/**
 * Variable amounts editor for bills and subscriptions.
 *
 * Uses date-keyed periods like VariableAmountsEditor for income.
 * Handles all frequencies: Weekly, Biweekly, Monthly, Bimonthly, Quarterly, Yearly.
 */

type Props = {
  entryId: string;
  entryName: string;
  frequency: "Weekly" | "Biweekly" | "Monthly" | "Bimonthly" | "Quarterly" | "Yearly";
  startDate: string;
  periodAmounts: Record<string, number>;
  defaultAmount: number;
  onUpdate: (id: string, updates: { periodAmounts: Record<string, number> }) => void;
};

const PAGE_SIZE = 12;
const INITIAL_BEFORE = 3;
const INITIAL_AFTER = 8;

/**
 * Parse date string (YYYY-MM-DD) as local midnight.
 */
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return new Date(dateStr);
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Format date as YYYY-MM-DD string.
 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Advance date by one period based on frequency.
 */
function advanceByFrequency(date: Date, frequency: Props["frequency"]): Date {
  switch (frequency) {
    case "Weekly": return addDays(date, 7);
    case "Biweekly": return addDays(date, 14);
    case "Monthly": return addMonths(date, 1);
    case "Bimonthly": return addMonths(date, 2);
    case "Quarterly": return addMonths(date, 3);
    case "Yearly": return addYears(date, 1);
    default: return addMonths(date, 1);
  }
}

/**
 * Go back one period based on frequency.
 */
function goBackByFrequency(date: Date, frequency: Props["frequency"]): Date {
  switch (frequency) {
    case "Weekly": return addDays(date, -7);
    case "Biweekly": return addDays(date, -14);
    case "Monthly": return addMonths(date, -1);
    case "Bimonthly": return addMonths(date, -2);
    case "Quarterly": return addMonths(date, -3);
    case "Yearly": return addYears(date, -1);
    default: return addMonths(date, -1);
  }
}

/**
 * Find the period anchor date that contains the given target date.
 */
function findPeriodAnchor(startDate: Date, frequency: Props["frequency"], targetDate: Date): Date {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (target.getTime() <= start.getTime()) return start;

  let current = new Date(start);
  let prev = new Date(start);

  while (current.getTime() < target.getTime()) {
    prev = new Date(current);
    current = advanceByFrequency(current, frequency);
  }

  if (current.getTime() === target.getTime()) {
    return current;
  }

  return prev;
}

/**
 * Get display label for a period based on frequency.
 */
function getPeriodDisplay(frequency: Props["frequency"], date: Date): string {
  switch (frequency) {
    case "Weekly":
      return `Week of ${format(date, "MMM d, yyyy")}`;
    case "Biweekly":
      return `Pay period of ${format(date, "MMM d, yyyy")}`;
    case "Monthly":
      return `Month of ${format(date, "MMMM yyyy")}`;
    case "Bimonthly":
      return `Bimonthly period of ${format(date, "MMM yyyy")}`;
    case "Quarterly":
      return `Quarter starting ${format(date, "MMM d, yyyy")}`;
    case "Yearly":
      return `Year of ${date.getFullYear()}`;
    default:
      return format(date, "MMM d, yyyy");
  }
}

export default function MonthlyAmountsEditor({
  entryId,
  entryName,
  frequency,
  startDate,
  periodAmounts,
  defaultAmount,
  onUpdate,
}: Props) {
  const [earlierCount, setEarlierCount] = useState(INITIAL_BEFORE);
  const [laterCount, setLaterCount] = useState(INITIAL_AFTER);
  const [localPrices, setLocalPrices] = useState<Record<string, number>>(() => ({ ...periodAmounts }));

  // Parse entry start date as local
  const start = useMemo(() => parseLocalDate(startDate), [startDate]);

  // Find current period anchor (the period containing today)
  const todayAnchor = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return findPeriodAnchor(start, frequency, today);
  }, [start, frequency]);

  // Find the earliest reachable period anchor (not before entry start)
  const earliestAnchor = useMemo(() => {
    let cursor = new Date(todayAnchor);
    for (let i = 0; i < earlierCount; i++) {
      const prev = goBackByFrequency(cursor, frequency);
      if (prev.getTime() < start.getTime()) break;
      cursor = prev;
    }
    return cursor;
  }, [todayAnchor, earlierCount, frequency, start]);

  // True when we cannot go further back because we'd cross the start date
  const atStart = useMemo(() => {
    const prev = goBackByFrequency(earliestAnchor, frequency);
    return prev.getTime() < start.getTime();
  }, [earliestAnchor, frequency, start]);

  // Generate periods from earliestAnchor moving forward
  const periods = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      anchor: Date;
      isCurrent: boolean;
      beforeStart: boolean;
    }[] = [];

    let cursor = new Date(earliestAnchor);
    const todayKey = formatDateKey(todayAnchor);

    // Count how many periods from earliestAnchor to todayAnchor
    let beforeAndCurrent = 1;
    let probe = new Date(earliestAnchor);
    while (probe.getTime() < todayAnchor.getTime()) {
      probe = advanceByFrequency(probe, frequency);
      beforeAndCurrent++;
    }
    const count = beforeAndCurrent + laterCount;

    for (let i = 0; i < count; i++) {
      const key = formatDateKey(cursor);
      const beforeStart = cursor.getTime() < start.getTime();
      rows.push({
        key,
        anchor: new Date(cursor),
        label: getPeriodDisplay(frequency, cursor),
        isCurrent: key === todayKey,
        beforeStart,
      });
      cursor = advanceByFrequency(cursor, frequency);
    }

    return rows;
  }, [earliestAnchor, todayAnchor, laterCount, frequency, start]);

  const setPrice = (key: string, value: number | null) => {
    const next = { ...localPrices };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalPrices(next);
    onUpdate(entryId, { periodAmounts: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEarlierCount((c) => c + PAGE_SIZE)}
          disabled={atStart}
          className="gap-1 w-full"
        >
          <ChevronUp className="h-4 w-4" />
          {atStart ? "Reached start date" : "Load earlier periods"}
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {periods.map((p) => {
          const hasOverride = Object.prototype.hasOwnProperty.call(localPrices, p.key);
          const locked = p.beforeStart;
          return (
            <div
              key={p.key}
              className={`flex items-center gap-2 p-2 ${p.isCurrent ? "bg-muted/40" : ""} ${locked ? "opacity-60" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  {format(p.anchor, "MMM d, yyyy")}
                  {p.isCurrent ? " · Current" : ""}
                  {locked ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" />
                      Before start date
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="w-36">
                <CurrencyInput
                  value={hasOverride ? localPrices[p.key] : null}
                  onChange={(v) => setPrice(p.key, v)}
                  placeholder={locked ? "—" : defaultAmount.toFixed(2)}
                  disabled={locked}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!hasOverride || locked}
                onClick={() => setPrice(p.key, null)}
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
          Load later periods
        </Button>
      </div>
    </div>
  );
}
