// src/components/CurrencyInput.tsx
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  name?: string;
  ariaLabel?: string;
  showPrefix?: boolean;
};

export function CurrencyInput({
  value,
  onChange,
  id,
  placeholder = "0.00",
  className = "",
  name,
  ariaLabel,
  showPrefix = true,
}: Props) {
  // Use local string state for editing to avoid immediate formatting
  const [localValue, setLocalValue] = useState<string>(() => {
    if (value === null || value === undefined) return "";
    return Number(value).toFixed(2);
  });
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value changes when not focused
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined) {
        setLocalValue("");
      } else {
        setLocalValue(Number(value).toFixed(2));
      }
    }
  }, [value, isFocused]);

  function parseInput(v: string): number | null {
    // Strip $ and commas
    const cleaned = v.replace(/\$/g, "").replace(/,/g, "").trim();
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    // Still update parent in real-time for validation purposes
    onChange(parseInput(raw));
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Remove formatting when focused - show raw number
    if (value !== null && value !== undefined) {
      const rawValue = Number(value);
      // If it's a whole number, show without decimals for easier editing
      if (rawValue === Math.floor(rawValue)) {
        setLocalValue(rawValue.toString());
      } else {
        setLocalValue(rawValue.toString());
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format on blur
    const parsed = parseInput(localValue);
    if (parsed !== null) {
      setLocalValue(parsed.toFixed(2));
    } else {
      setLocalValue("");
    }
    onChange(parsed);
  };

  return (
    <div className="relative w-full">
      {showPrefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          $
        </span>
      )}
      <input
        id={id}
        name={name}
        aria-label={ariaLabel}
        inputMode="decimal"
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "min-w-0 w-full h-10 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          showPrefix ? "pl-7 pr-3 py-2" : "px-3 py-2",
          className
        )}
      />
    </div>
  );
}
