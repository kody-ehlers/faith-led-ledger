export type Recurrence = "None" | "Daily" | "Weekly" | "Biweekly" | "Monthly";

export interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string | null; // ISO yyyy-mm-dd
  recurrence: Recurrence;
  completed: boolean;
  completedAt?: string | null;
  order: number;
}

const KEY = "finance-todos";

export function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TodoItem[];
    return parsed.sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

export function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(KEY, JSON.stringify(todos));
  window.dispatchEvent(new CustomEvent("todos-updated"));
}

export function advanceDueDate(due: string, rec: Recurrence): string {
  const d = new Date(due + "T00:00:00");
  switch (rec) {
    case "Daily": d.setDate(d.getDate() + 1); break;
    case "Weekly": d.setDate(d.getDate() + 7); break;
    case "Biweekly": d.setDate(d.getDate() + 14); break;
    case "Monthly": d.setMonth(d.getMonth() + 1); break;
    default: return due;
  }
  return d.toISOString().slice(0, 10);
}

export function getNextTodo(todos: TodoItem[]): TodoItem | null {
  const open = todos.filter((t) => !t.completed);
  if (open.length === 0) return null;
  // Prefer earliest due date; tasks without due fall to end by order
  const withDue = open.filter((t) => t.dueDate).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  if (withDue.length) return withDue[0];
  return open.sort((a, b) => a.order - b.order)[0];
}
