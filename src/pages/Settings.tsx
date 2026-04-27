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
import { useState } from "react";
import { toast } from "sonner";
import { Church } from "lucide-react";

export default function Settings() {
  const appName = useFinanceStore((state) => state.appName);
  const timezone = useFinanceStore((state) => state.timezone);
  const updateAppName = useFinanceStore((state) => state.updateAppName);
  const updateTimezone = useFinanceStore((state) => state.updateTimezone);
  const [localAppName, setLocalAppName] = useState(appName);
  const [localTimezone, setLocalTimezone] = useState(timezone);

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
    </div>
  );
}
