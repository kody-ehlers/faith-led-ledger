// src/components/CurrencyInput.tsx
import React from "react";

type Props = {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  name?: string;
  ariaLabel?: string;
};

export function CurrencyInput({
  value,
  onChange,
  id,
  placeholder,
  className = "",
  name,
  ariaLabel,
}: Props) {
  const display =
    value === null || value === undefined ? "" : Number(value).toFixed(2);

  function parseInput(v: string) {
    // Strip $ and commas
    const cleaned = v.replace(/\$/g, "").replace(/,/g, "").trim();
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <input
      id={id}
      name={name}
      aria-label={ariaLabel}
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onChange={(e) => onChange(parseInput(e.target.value))}
      className={`min-w-0 w-full bg-background border border-input rounded-md px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    />
  );
}
