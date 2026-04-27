import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DatePicker from "@/components/DatePicker";
import { Church, ListChecks, Plus, Trash2, Pencil, ChevronUp, ChevronDown, Calendar as CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";
import {
  loadTodos, saveTodos, advanceDueDate, type TodoItem, type Recurrence,
} from "@/lib/todos";

const RECURRENCES: Recurrence[] = ["None", "Daily", "Weekly", "Biweekly", "Monthly"];

export default function Todos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Add form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>("None");

  // Edit dialog
  const [editing, setEditing] = useState<TodoItem | null>(null);

  useEffect(() => {
    setTodos(loadTodos());
  }, []);

  const persist = (next: TodoItem[]) => {
    setTodos(next);
    saveTodos(next);
  };

  const addTodo = () => {
    if (!title.trim()) return;
    const maxOrder = todos.reduce((m, t) => Math.max(m, t.order), -1);
    const item: TodoItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      recurrence,
      completed: false,
      order: maxOrder + 1,
    };
    persist([...todos, item]);
    setTitle(""); setNotes(""); setDueDate(null); setRecurrence("None");
  };

  const toggle = (id: string) => {
    const next = todos.map((t) => {
      if (t.id !== id) return t;
      if (!t.completed) {
        // Completing
        if (t.recurrence !== "None" && t.dueDate) {
          // Roll forward instead of marking complete
          return { ...t, dueDate: advanceDueDate(t.dueDate, t.recurrence) };
        }
        return { ...t, completed: true, completedAt: new Date().toISOString() };
      }
      return { ...t, completed: false, completedAt: null };
    });
    persist(next);
  };

  const remove = (id: string) => persist(todos.filter((t) => t.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const open = todos.filter((t) => !t.completed).sort((a, b) => a.order - b.order);
    const idx = open.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const swap = open[idx + dir];
    if (!swap) return;
    const a = open[idx], b = swap;
    const next = todos.map((t) => {
      if (t.id === a.id) return { ...t, order: b.order };
      if (t.id === b.id) return { ...t, order: a.order };
      return t;
    });
    persist(next);
  };

  const saveEdit = () => {
    if (!editing) return;
    persist(todos.map((t) => (t.id === editing.id ? editing : t)));
    setEditing(null);
  };

  const clearCompleted = () => persist(todos.filter((t) => !t.completed));

  const open = useMemo(
    () => todos.filter((t) => !t.completed).sort((a, b) => a.order - b.order),
    [todos]
  );
  const done = useMemo(
    () => todos.filter((t) => t.completed).sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1)),
    [todos]
  );

  const formatDue = (d?: string | null) => {
    if (!d) return null;
    try { return format(new Date(d + "T00:00:00"), "MMM d, yyyy"); } catch { return d; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ListChecks className="h-7 w-7 text-primary" />
          To-Do
        </h1>
        <p className="text-muted-foreground mt-1">
          A weekly checklist to keep your stewardship on track.
        </p>
      </div>

      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Church className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                "Commit your work to the Lord, and your plans will be established."
              </p>
              <p className="text-sm text-muted-foreground font-medium">Proverbs 16:3 (ESV)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" /> Add a task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Task title (e.g. 'Review weekly budget')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due date (optional)</label>
              <DatePicker selected={dueDate} onSelect={(d) => setDueDate(d)} placeholder="Pick a date" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recurrence</label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addTodo} disabled={!title.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add task
            </Button>
            {dueDate && (
              <Button variant="ghost" onClick={() => setDueDate(null)}>Clear date</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Open tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Open tasks ({open.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to do — you're all caught up. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {open.map((t, idx) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-md border bg-card/50 hover:bg-accent/5 transition-colors"
                >
                  <Checkbox checked={t.completed} onCheckedChange={() => toggle(t.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.title}</div>
                    {t.notes && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{t.notes}</div>}
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {t.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" /> {formatDue(t.dueDate)}
                        </span>
                      )}
                      {t.recurrence !== "None" && (
                        <span className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" /> {t.recurrence}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(t.id, -1)} disabled={idx === 0} aria-label="Move up">
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(t.id, 1)} disabled={idx === open.length - 1} aria-label="Move down">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      {done.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Completed ({done.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCompleted((v) => !v)}>
                {showCompleted ? "Hide" : "Show"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearCompleted}>Clear completed</Button>
            </div>
          </CardHeader>
          {showCompleted && (
            <CardContent>
              <ul className="space-y-2">
                {done.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
                    <Checkbox checked onCheckedChange={() => toggle(t.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-through text-muted-foreground">{t.title}</div>
                      {t.completedAt && (
                        <div className="text-xs text-muted-foreground">
                          Completed {format(new Date(t.completedAt), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
              <Textarea
                placeholder="Notes"
                value={editing.notes ?? ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={3}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Due date</label>
                  <DatePicker
                    selected={editing.dueDate ? new Date(editing.dueDate + "T00:00:00") : null}
                    onSelect={(d) => setEditing({ ...editing, dueDate: d.toISOString().slice(0, 10) })}
                  />
                  {editing.dueDate && (
                    <Button variant="ghost" size="sm" className="mt-1"
                      onClick={() => setEditing({ ...editing, dueDate: null })}>
                      Clear date
                    </Button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Recurrence</label>
                  <Select
                    value={editing.recurrence}
                    onValueChange={(v) => setEditing({ ...editing, recurrence: v as Recurrence })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECURRENCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
