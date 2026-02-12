import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DatePicker({
  selected,
  onSelect,
  placeholder,
}: {
  selected?: Date | undefined | null;
  onSelect: (d: Date) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : placeholder ?? "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          onSelect={(d) => {
            if (d) {
              onSelect(d);
              setOpen(false);
            }
          }}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
