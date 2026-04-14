import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DateRangeCalendarProps {
  rangeStart: string; // YYYY-MM-DD format
  rangeEnd: string; // YYYY-MM-DD format
  initialMonth?: Date;
}

export function DateRangeCalendar({ rangeStart, rangeEnd, initialMonth }: DateRangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());

  // Parse the date range
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);

  // Get all days in the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get leading empty days (days from previous month)
  const firstDayOfWeek = monthStart.getDay();
  const leadingDays = Array(firstDayOfWeek).fill(null);

  // Check if a day is in range
  const isInRange = (day: Date) => {
    return isWithinInterval(day, { start, end });
  };

  // Check if a day is the first or last in range
  const isRangeStart = (day: Date) => {
    return (
      day.getDate() === start.getDate() &&
      day.getMonth() === start.getMonth() &&
      day.getFullYear() === start.getFullYear()
    );
  };

  const isRangeEnd = (day: Date) => {
    return (
      day.getDate() === end.getDate() &&
      day.getMonth() === end.getMonth() &&
      day.getFullYear() === end.getFullYear()
    );
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={previousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {/* Leading empty cells */}
        {leadingDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days of the month */}
        {daysInMonth.map((day, idx) => {
          const inRange = isInRange(day);
          const isStart = isRangeStart(day);
          const isEnd = isRangeEnd(day);
          const isStartOfWeek = day.getDay() === 0;
          const isEndOfWeek = day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square flex items-center justify-center relative rounded-sm text-sm ${inRange
                  ? `${isStart && isEnd
                    ? "bg-blue-500 text-white rounded-lg"
                    : isStart
                      ? "bg-blue-500 text-white rounded-l-lg"
                      : isEnd
                        ? "bg-blue-500 text-white rounded-r-lg"
                        : "bg-blue-200 text-foreground"
                  }`
                  : "text-foreground"
                }`}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
