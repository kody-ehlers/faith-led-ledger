import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/financeStore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Church, Bug, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface BugItem {
  id: string;
  text: string;
  fixed: boolean;
  createdAt: string;
}

const BUGS_STORAGE_KEY = "finance-bugs-to-fix";

export default function Settings() {
  const appName = useFinanceStore((state) => state.appName);
  const timezone = useFinanceStore((state) => state.timezone);
  const updateAppName = useFinanceStore((state) => state.updateAppName);
  const updateTimezone = useFinanceStore((state) => state.updateTimezone);
  const [localAppName, setLocalAppName] = useState(appName);
  const [localTimezone, setLocalTimezone] = useState(timezone);

  const [bugs, setBugs] = useState<BugItem[]>(() => {
    try {
      const raw = localStorage.getItem(BUGS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BugItem[]) : [];
    } catch {
      return [];
    }
  });
  const [newBug, setNewBug] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify(bugs));
    } catch {
      /* ignore */
    }
  }, [bugs]);

  const handleAddBug = () => {
    const text = newBug.trim();
    if (!text) {
      toast.error("Enter a bug description");
      return;
    }
    setBugs((prev) => [
      {
        id: crypto.randomUUID(),
        text,
        fixed: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewBug("");
  };

  const handleToggleBug = (id: string) => {
    setBugs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, fixed: !b.fixed } : b))
    );
  };

  const handleRemoveBug = (id: string) => {
    setBugs((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearFixed = () => {
    setBugs((prev) => prev.filter((b) => !b.fixed));
    toast.success("Cleared fixed bugs");
  };

  const openCount = bugs.filter((b) => !b.fixed).length;
  const fixedCount = bugs.length - openCount;

  const handleSave = () => {
    updateAppName(localAppName);
    updateTimezone(localTimezone);
    toast.success("Settings updated successfully");
  };

  // US timezones
  const timezones = [
    { value: "America/New_York", label: "EST - Eastern Time" },
    { value: "America/Chicago", label: "CST - Central Time" },
    { value: "America/Denver", label: "MST - Mountain Time" },
    { value: "America/Los_Angeles", label: "PST - Pacific Time" },
    { value: "America/Anchorage", label: "AKST - Alaska Time" },
    { value: "Pacific/Honolulu", label: "HST - Hawaii Time" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Scripture */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/10">
              <Church className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg italic text-foreground mb-2">
                If you need wisdom, ask our generous God, and he will give it to you.
                He will not rebuke you for asking.
              </p>
              <p className="text-sm text-muted-foreground font-medium">James 1:5 (NLT)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-muted/10">
          <svg
            className="h-6 w-6 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">
            App preferences and integrations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Name</CardTitle>
          <CardDescription>Customize your app's display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={localAppName}
              onChange={(e) => setLocalAppName(e.target.value)}
              placeholder="My Finances"
            />
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
          <CardDescription>Set your timezone for accurate date calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={localTimezone} onValueChange={setLocalTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Current timezone: {localTimezone}
            </p>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-destructive" />
                Bugs to Fix
              </CardTitle>
              <CardDescription>
                Track issues to address — {openCount} open
                {fixedCount > 0 ? `, ${fixedCount} fixed` : ""}
              </CardDescription>
            </div>
            {fixedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFixed}>
                Clear fixed
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newBug}
              onChange={(e) => setNewBug(e.target.value)}
              placeholder="Describe a bug or issue..."
              onKeyDown={(e) => e.key === "Enter" && handleAddBug()}
            />
            <Button onClick={handleAddBug}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {bugs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No bugs tracked. Add one above to start a list.
            </p>
          ) : (
            <div className="space-y-2">
              {bugs.map((bug) => (
                <div
                  key={bug.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                >
                  <button
                    onClick={() => handleToggleBug(bug.id)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={bug.fixed ? "Mark as open" : "Mark as fixed"}
                  >
                    {bug.fixed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        bug.fixed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {bug.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added {new Date(bug.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveBug(bug.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
