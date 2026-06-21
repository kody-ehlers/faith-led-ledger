import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { IncomeEntry } from "@/store/financeStore";
import { addDays, addMonths, addYears, format } from "date-fns";
import { X } from "lucide-react";

/**
 * Variable-amounts editor — index-based.
 *
 * Each period override is keyed by its integer offset from the entry's
 * start date ("0" = first occurrence, "1" = next, ...). This avoids any
 * date / timezone / re-anchoring collisions that caused duplicate rows.
 *
 * The "base" amount shown for each period respects the pay change history
 * (entry.changes), so if a raise is scheduled for a future date, periods
 * after that date will show the new rate as the default.
 */

type Props = {
  entry: IncomeEntry;
  onChange: (map: Record<string, number>) => void;
  getPeriodDisplay: (frequency: IncomeEntry["frequency"], date: Date) => string;
};

const PAGE_SIZE = 12;

function stepFromStart(
  start: Date,
  frequency: IncomeEntry["frequency"],
  n: number,
): Date {
  switch (frequency) {
    case "Weekly":
      return addDays(start, 7 * n);
    case "Biweekly":
      return addDays(start, 14 * n);
    case "Bimonthly":
      return addMonths(start, 2 * n);
    case "Quarterly":
      return addMonths(start, 3 * n);
    case "Yearly":
      return addYears(start, n);
    case "Monthly":
      return addMonths(start, n);
    default:
      return start;
  }
}

function currentPeriodIndex(
  start: Date,
  frequency: IncomeEntry["frequency"],
  today: Date,
): number {
  if (today.getTime() <= start.getTime()) return 0;
  switch (frequency) {
    case "Weekly":
      return Math.floor((today.getTime() - start.getTime()) / (7 * 86400000));
    case "Biweekly":
      return Math.floor((today.getTime() - start.getTime()) / (14 * 86400000));
    case "Monthly":
    case "Bimonthly":
    case "Quarterly":
    case "Yearly": {
      const step =
        frequency === "Monthly"
          ? 1
          : frequency === "Bimonthly"
            ? 2
            : frequency === "Quarterly"
              ? 3
              : 12;
      const months =
        (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth());
      const adj = today.getDate() < start.getDate() ? -1 : 0;
      return Math.max(0, Math.floor((months + adj) / step));
    }
    default:
      return 0;
  }
}

/**
 * Get the base amount for a given date, respecting the pay change history.
 * This is a simplified version of getAmountForDate that looks at entry.changes
 * but NOT variable pay overrides (since this is for showing the default).
 */
function getBaseAmountForDate(entry: IncomeEntry, date: Date): number {
  if (!entry.changes || entry.changes.length === 0) return entry.amount;

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const changes = [...entry.changes].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (const ch of changes) {
    const start = new Date(ch.start);
    const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const end = ch.end ? new Date(ch.end) : null;
    const endOnly = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : null;

    if (target >= startOnly && (!endOnly || target <= endOnly)) {
      return ch.amount;
    }
  }

  return changes[changes.length - 1].amount;
}

export default function VariableAmountsEditor({
  entry,
  onChange,
  getPeriodDisplay,
}: Props) {
  // Normalize the entry's start date to local noon to avoid TZ drift
  const start = useMemo(() => {
    const d = new Date(entry.date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  }, [entry.date]);

  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return currentPeriodIndex(start, entry.frequency, today);
  }, [start, entry.frequency]);

  const [fromIndex, setFromIndex] = useState(() => Math.max(0, todayIndex - 3));
  const [toIndex, setToIndex] = useState(() => todayIndex + 8);

  const overrides = entry.periodAmounts ?? {};

  // Compute the base amount for each period (respecting pay changes)
  const periods = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      anchor: Date;
      isCurrent: boolean;
      index: number;
      baseAmount: number;
    }[] = [];
    for (let i = fromIndex; i <= toIndex; i++) {
      if (i < 0) continue;
      const anchor = stepFromStart(start, entry.frequency, i);
      const baseAmount = getBaseAmountForDate(entry, anchor);
      rows.push({
        key: String(i),
        anchor,
        label: getPeriodDisplay(entry.frequency, anchor),
        isCurrent: i === todayIndex,
        index: i,
        baseAmount,
      });
    }
    return rows;
  }, [start, entry, fromIndex, toIndex, todayIndex, getPeriodDisplay]);

  const setOverride = (key: string, value: number | null) => {
    const next = { ...overrides };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Leave a period blank to use the default amount for that period (based on pay history).
        Overrides apply only to the period shown.
      </p>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={fromIndex <= 0}
          onClick={() => setFromIndex((n) => Math.max(0, n - PAGE_SIZE))}
        >
          Load earlier periods
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
                  #{p.index + 1} · {format(p.anchor, "MMM d, yyyy")}
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

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setToIndex((n) => n + PAGE_SIZE)}
        >
          Load later periods
        </Button>
      </div>
    </div>
  );
}