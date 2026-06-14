import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { IncomeEntry } from "@/store/financeStore";
import { getPeriodAnchor, getPeriodKey } from "@/utils/calculations";
import { addDays, addMonths, addYears } from "date-fns";
import { X } from "lucide-react";

type Props = {
  entry: IncomeEntry;
  onChange: (map: Record<string, number>) => void;
  getPeriodDisplay: (frequency: IncomeEntry["frequency"], date: Date) => string;
};

const BASE_BACK = 3;
const BASE_FORWARD = 8;

function advanceAnchor(date: Date, frequency: IncomeEntry["frequency"], direction: number): Date {
  switch (frequency) {
    case "Weekly":
      return addDays(date, 7 * direction);
    case "Biweekly":
      return addDays(date, 14 * direction);
    case "Bimonthly":
      return addMonths(date, 2 * direction);
    case "Quarterly":
      return addMonths(date, 3 * direction);
    case "Yearly":
      return addYears(date, 1 * direction);
    case "Monthly":
      return addMonths(date, 1 * direction);
    default:
      return date;
  }
}

export default function VariableAmountsEditor({ entry, onChange, getPeriodDisplay }: Props) {
  const [extraBack, setExtraBack] = useState(0);
  const [extraForward, setExtraForward] = useState(0);

  const periods = useMemo(() => {
    const todayAnchor = getPeriodAnchor(entry, new Date());
    const startEntry = new Date(entry.date);
    const rows: { key: string; label: string; anchor: Date; isCurrent: boolean }[] = [];
    const back = BASE_BACK + extraBack;
    const forward = BASE_FORWARD + extraForward;
    for (let i = -back; i <= forward; i++) {
      const anchor = advanceAnchor(todayAnchor, entry.frequency, i);
      // Don't show periods before the entry started
      if (anchor.getTime() < new Date(startEntry.getFullYear(), startEntry.getMonth(), startEntry.getDate()).getTime()) continue;
      const key = getPeriodKey(entry, anchor);
      rows.push({
        key,
        anchor,
        label: getPeriodDisplay(entry.frequency, anchor),
        isCurrent: i === 0,
      });
    }
    return rows;
  }, [entry, extraBack, extraForward, getPeriodDisplay]);

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

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Leave a period blank to use the base amount (${entry.amount.toFixed(2)}).
        Overrides apply only to the period shown.
      </p>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExtraBack((n) => n + 6)}
        >
          Load earlier periods
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {periods.map((p) => {
          const hasOverride = Object.prototype.hasOwnProperty.call(overrides, p.key);
          return (
            <div
              key={p.key}
              className={`flex items-center gap-2 p-2 ${p.isCurrent ? "bg-muted/40" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                {p.isCurrent && (
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Current
                  </p>
                )}
              </div>
              <div className="w-36">
                <CurrencyInput
                  value={hasOverride ? overrides[p.key] : null}
                  onChange={(v) => setOverride(p.key, v)}
                  placeholder={entry.amount.toFixed(2)}
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
          onClick={() => setExtraForward((n) => n + 6)}
        >
          Load later periods
        </Button>
      </div>
    </div>
  );
}