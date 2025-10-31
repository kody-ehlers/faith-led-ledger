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
import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { toast } from "sonner";

export default function Savings() {
  const { savings, addSavings, updateSavings, removeSavings } =
    useFinanceStore();
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [goal, setGoal] = useState("");

  const handleAdd = () => {
    const cur = parseFloat(current || "0");
    const gl = parseFloat(goal || "0");
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    addSavings({ name: name.trim(), currentAmount: cur, goalAmount: gl });
    toast.success("Savings account added");
    setName("");
    setCurrent("");
    setGoal("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M12 2v20M3 10h18"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Savings</h2>
          <p className="text-muted-foreground">
            Monitor savings goals and progress
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Savings Account</CardTitle>
          <CardDescription>Record a savings bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Current Amount</Label>
              <Input
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label>Goal Amount</Label>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full" onClick={handleAdd}>
              Add Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Savings</CardTitle>
          <CardDescription>Active accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {savings.length === 0 ? (
            <p className="text-muted-foreground">No savings accounts yet.</p>
          ) : (
            savings.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
              >
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Goal: ${s.goalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-primary font-bold">
                    ${s.currentAmount.toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      updateSavings(s.id, {
                        currentAmount: s.currentAmount + 100,
                      });
                      toast.success("Added $100 (demo)");
                    }}
                  >
                    + $100
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      removeSavings(s.id);
                      toast.success("Account removed");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
