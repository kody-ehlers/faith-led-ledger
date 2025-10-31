import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  isWithinInterval,
  parseISO,
} from "date-fns";

export interface WeeklyIncome {
  weekStart: Date;
  weekEnd: Date;
  totalIncome: number;
}

/**
 * Aggregates income per week for the last `numWeeks` weeks.
 */
export function aggregateWeeklyIncome(
  income: { amount: number; date: string }[],
  numWeeks = 10
): WeeklyIncome[] {
  const result: WeeklyIncome[] = [];
  const today = new Date();

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });

    const totalIncome = income.reduce((sum, entry) => {
      const entryDate = parseISO(entry.date);
      if (isNaN(entryDate.getTime())) return sum; // skip invalid dates
      if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    result.push({ weekStart, weekEnd, totalIncome });
  }

  return result;
}
