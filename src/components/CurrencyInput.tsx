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
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="select-none">$</span>
      <input
        id={id}
        name={name}
        aria-label={ariaLabel}
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        onChange={(e) => onChange(parseInput(e.target.value))}
        className="min-w-0 w-full bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none"
        // using text input prevents browser spinner arrows
      />
    </div>
  );
}
