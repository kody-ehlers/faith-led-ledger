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
import { useFinanceStore } from "@/store/financeStore";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const appName = useFinanceStore((state) => state.appName);
  const updateAppName = useFinanceStore((state) => state.updateAppName);
  const [localAppName, setLocalAppName] = useState(appName);

  const handleSave = () => {
    updateAppName(localAppName);
    toast.success("App name updated successfully");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
    </div>
  );
}
