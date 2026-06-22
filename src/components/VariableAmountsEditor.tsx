import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { IncomeEntry } from "@/store/financeStore";
import { addDays, addMonths, addYears, format } from "date-fns";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Variable-amounts editor — date-keyed.
 *
 * Each period override is keyed by the anchor date of that period
 * formatted as "YYYY-MM-DD". This is the same format used by
 * getAmountForDate() for lookups, ensuring perfect alignment.
 */

type Props = {
  entry: IncomeEntry;
  onChange: (map: Record<string, number>) => void;
  getPeriodDisplay: (frequency: IncomeEntry["frequency"], date: Date) => string;
};

const PAGE_SIZE = 12;

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
function advanceByFrequency(date: Date, frequency: IncomeEntry["frequency"]): Date {
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
function goBackByFrequency(date: Date, frequency: IncomeEntry["frequency"]): Date {
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
 * Get the base amount for a given date, respecting pay changes.
 */
function getBaseAmountForDate(entry: IncomeEntry, date: Date): number {
  if (!entry.changes || entry.changes.length === 0) return entry.amount;

  const target = date.getTime();
  const changes = [...entry.changes].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (const ch of changes) {
    const start = parseLocalDate(ch.start);
    const end = ch.end ? parseLocalDate(ch.end) : null;

    if (target >= start.getTime() && (!end || target <= end.getTime())) {
      return ch.amount;
    }
  }

  return changes[changes.length - 1].amount;
}

/**
 * Find the period anchor date that contains the given target date.
 * For biweekly/weekly: returns the start of that period.
 */
function findPeriodAnchor(startDate: Date, frequency: IncomeEntry["frequency"], targetDate: Date): Date {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (target.getTime() <= start.getTime()) return start;

  let current = new Date(start);
  let prev = new Date(start);

  // Advance until we pass or equal the target
  while (current.getTime() < target.getTime()) {
    prev = new Date(current);
    current = advanceByFrequency(current, frequency);
  }

  // If current equals target, we're exactly on a period start
  if (current.getTime() === target.getTime()) {
    return current;
  }

  // Otherwise we're in the period that started at 'prev'
  return prev;
}

export default function VariableAmountsEditor({
  entry,
  onChange,
  getPeriodDisplay,
}: Props) {
  const [offset, setOffset] = useState(0);

  // Parse entry start date as local
  const start = useMemo(() => parseLocalDate(entry.date), [entry.date]);

  // Find current period anchor (the period containing today)
  const todayAnchor = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return findPeriodAnchor(start, entry.frequency, today);
  }, [start, entry.frequency]);

  // Generate periods to display
  const periods = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      anchor: Date;
      isCurrent: boolean;
      baseAmount: number;
    }[] = [];

    // Start at current period, then apply offset by going backward
    let cursor = new Date(todayAnchor);
    for (let i = 0; i < offset; i++) {
      cursor = goBackByFrequency(cursor, entry.frequency);
    }

    // Generate PAGE_SIZE periods
    for (let i = 0; i < PAGE_SIZE; i++) {
      const key = formatDateKey(cursor);
      const baseAmount = getBaseAmountForDate(entry, cursor);
      const isCurrent = formatDateKey(todayAnchor) === key;

      rows.push({
        key,
        anchor: new Date(cursor),
        label: getPeriodDisplay(entry.frequency, cursor),
        isCurrent,
        baseAmount,
      });

      cursor = advanceByFrequency(cursor, entry.frequency);
    }

    return rows;
  }, [start, entry, todayAnchor, getPeriodDisplay, offset]);

  const overrides = entry.periodAmounts ?? {};

  const setOverride = (key: string, value: number | null) => {
    const next = { ...overrides };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  };

  const canGoBack = offset < 100; // reasonable upper bound
  const canGoForward = offset > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          disabled={!canGoBack}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Load Earlier
        </Button>
        <span className="text-xs text-muted-foreground">
          {offset === 0 ? "Current window" : `${offset} periods back`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          disabled={!canGoForward}
          className="gap-1"
        >
          Load Later
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {periods.map((p) => {
          const hasOverride = Object.prototype.hasOwnProperty.call(
            overrides,
            p.key,
          );
          return (
            <div
              key={p.key}
              className={`flex items-center gap-2 p-2 ${p.isCurrent ? "bg-muted/40" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {format(p.anchor, "MMM d, yyyy")}
                  {p.isCurrent ? " · Current" : ""}
                </p>
              </div>
              <div className="w-36">
                <CurrencyInput
                  value={hasOverride ? overrides[p.key] : null}
                  onChange={(v) => setOverride(p.key, v)}
                  placeholder={p.baseAmount.toFixed(2)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!hasOverride}
                onClick={() => setOverride(p.key, null)}
                aria-label="Reset to base amount"
                title="Reset to base amount"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
