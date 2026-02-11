import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function DatePicker({
  selected,
  onSelect,
  placeholder,
}: {
  selected?: Date | undefined | null;
  onSelect: (d: Date) => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {selected ? format(selected, "PPP") : placeholder ?? "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-auto p-0">
        <Calendar mode="single" selected={selected ?? undefined} onSelect={(d) => d && onSelect(d)} />
      </PopoverContent>
    </Popover>
  );
}
