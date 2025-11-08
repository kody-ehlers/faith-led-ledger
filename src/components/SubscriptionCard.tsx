// src/components/SubscriptionCard.tsx
import React from "react";
import { CurrencyInput } from "./CurrencyInput";
import { formatMonthlyLabel } from "../utils/formatDate";

type Props = {
  id: string;
  name: string;
  amount: number;
  date: string; // stored date for the recurring pattern
  frequency: "monthly" | "weekly" | "one-time";
  isPaid: boolean;
  onTogglePaid: (id: string, next: boolean) => void;
  onAmountChange?: (id: string, next: number | null) => void;
};

export function SubscriptionCard({
  id,
  name,
  amount,
  date,
  frequency,
  isPaid,
  onTogglePaid,
  onAmountChange,
}: Props) {
  const highlightClass = isPaid
    ? "bg-green-50 border-green-300"
    : "bg-red-50 border-red-300";

  return (
    <div className={`border rounded p-3 ${highlightClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-sm text-muted-foreground">
            {frequency === "monthly" ? formatMonthlyLabel(date) : date}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-28">
            <CurrencyInput
              value={amount}
              onChange={(v) => onAmountChange && onAmountChange(id, v)}
              ariaLabel={`Amount for ${name}`}
            />
          </div>

          <button
            onClick={() => onTogglePaid(id, !isPaid)}
            className={`px-3 py-1 rounded text-sm ${
              isPaid ? "text-green-800" : "text-red-800"
            }`}
            aria-pressed={isPaid}
          >
            {isPaid ? "Paid" : "Mark Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
