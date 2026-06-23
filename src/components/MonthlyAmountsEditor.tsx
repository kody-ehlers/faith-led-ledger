import React, { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Monthly amounts editor for variable-price bills and subscriptions.
 *
 * Shows a list of months with pre-populated input fields for setting
 * the price for each month. Keys are "YYYY-MM" format month strings.
 */

type Props = {
  entryId: string;
  entryName: string;
  monthlyPrices: Record<string, number>;
  defaultAmount: number;
  onUpdate: (id: string, updates: { monthlyPrices: Record<string, number> }) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const PAGE_SIZE = 12;

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
  isOpen,
  onOpenChange,
}: Props) {
  const [variableEnabled, setVariableEnabled] = useState(Object.keys(monthlyPrices).length > 0);

  const today = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => formatMonthKey(today), [today]);

  const [fromOffset, setFromOffset] = useState(-3);
  const [toOffset, setToOffset] = useState(8);

  const [localPrices, setLocalPrices] = useState<Record<string, number>>(() => ({ ...monthlyPrices }));

  const months = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      date: Date;
      isCurrent: boolean;
    }[] = [];

    for (let offset = fromOffset; offset <= toOffset; offset++) {
      const date = addMonths(today, offset);
      const key = formatMonthKey(date);
      rows.push({
        key,
        label: format(date, "MMMM yyyy"),
        date,
        isCurrent: key === currentMonthKey,
      });
    }

    return rows;
  }, [today, fromOffset, toOffset, currentMonthKey]);

  const setPrice = (key: string, value: number | null) => {
    const next = { ...localPrices };
    if (value === null || value === defaultAmount) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalPrices(next);
  };

  const handleSave = () => {
    onUpdate(entryId, {
      monthlyPrices: variableEnabled ? localPrices : {},
    });
    toast.success("Monthly prices updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Monthly Prices for {entryName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="variable-toggle" className="cursor-pointer">
              Enable monthly overrides
            </Label>
            <Switch
              id="variable-toggle"
              checked={variableEnabled}
              onCheckedChange={setVariableEnabled}
            />
          </div>

          {variableEnabled && (
            <>
              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fromOffset <= -24}
                  onClick={() => {
                    setFromOffset((n) => n - PAGE_SIZE);
                    setToOffset((n) => n - PAGE_SIZE);
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Earlier
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromOffset((n) => n + PAGE_SIZE);
                    setToOffset((n) => n + PAGE_SIZE);
                  }}
                >
                  Later
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {months.map((m) => {
                  const hasOverride = Object.prototype.hasOwnProperty.call(localPrices, m.key);
                  const currentValue = hasOverride ? localPrices[m.key] : null;
                  return (
                    <div
                      key={m.key}
                      className={`flex items-center gap-2 p-2 ${m.isCurrent ? "bg-muted/40" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.label}</p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {m.isCurrent ? "Current month" : format(m.date, "MMM yyyy")}
                        </p>
                      </div>
                      <div className="w-28">
                        <CurrencyInput
                          value={currentValue}
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
                        aria-label="Reset to default"
                        title="Reset to default"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
