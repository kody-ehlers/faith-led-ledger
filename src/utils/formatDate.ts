// src/utils/formatDate.ts
import { format } from 'date-fns';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatMonthlyLabel(dateISO: string | Date) {
  const d = new Date(dateISO);
  return `${ordinal(d.getDate())} of the Month`;
}

export function formatWeekOfLabel(dateISO: string | Date) {
  const d = new Date(dateISO);
  const weekStart = format(d, 'MMM d, yyyy');
  return `Week of ${weekStart}`;
}

export function formatMonthOfLabel(dateISO: string | Date) {
  const d = new Date(dateISO);
  return `Month of ${format(d, 'MMMM yyyy')}`;
}
