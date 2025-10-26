import { useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { calculatePostTaxIncome, calculateTitheAmount, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Heart, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

export default function Tithe() {
  const { income, tithes, addTithe, markTitheGiven } = useFinanceStore();
  const postTaxIncome = calculatePostTaxIncome(income);
  const recommendedTithe = calculateTitheAmount(postTaxIncome);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyTithes = tithes.filter(t => t.date.startsWith(currentMonth));
  const totalTithed = monthlyTithes.reduce((sum, t) => sum + t.amount, 0);
  const remaining = Math.max(0, recommendedTithe - totalTithed);
  const percentageGiven = recommendedTithe > 0 ? (totalTithed / recommendedTithe) * 100 : 0;

  const handleMarkAsTithed = () => {
    if (remaining <= 0) {
      toast.info("You've already given your full tithe this month!");
      return;
    }

    addTithe({
      amount: remaining,
      date: new Date().toISOString(),
      given: true,
    });

    toast.success("Tithe marked as given. Thank you for your faithfulness!");
  };

  const handlePartialTithe = () => {
    const amount = prompt("Enter the amount you'd like to give:");
    if (!amount) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    addTithe({
      amount: parsedAmount,
      date: new Date().toISOString(),
      given: true,
    });

    toast.success("Tithe recorded. God loves a cheerful giver!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-accent/10">
          <Heart className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Tithe</h2>
          <p className="text-muted-foreground">Honor God with the first fruits</p>
        </div>
      </div>

      {/* Scripture Card */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-lg italic text-foreground">
              "Bring all the tithes into the storehouse so there will be enough food in my Temple. 
              If you do, I will pour out a blessing so great you won't have enough room to take it in!"
            </p>
            <p className="text-sm text-muted-foreground font-medium">Malachi 3:10 (NLT)</p>
          </div>
        </CardContent>
      </Card>

      {/* Tithe Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <CardTitle>Post-Tax Income</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(postTaxIncome)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-accent/20">
          <CardHeader>
            <CardTitle>Recommended Tithe</CardTitle>
            <CardDescription>10% of post-tax income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{formatCurrency(recommendedTithe)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-success/20">
          <CardHeader>
            <CardTitle>Remaining</CardTitle>
            <CardDescription>To reach full tithe</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(remaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tithe Progress</CardTitle>
          <CardDescription>Your giving progress this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Given: {formatCurrency(totalTithed)}</span>
              <span className="font-medium text-foreground">
                {percentageGiven.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(percentageGiven, 100)} className="h-3" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 pt-4">
            <Button
              onClick={handleMarkAsTithed}
              disabled={remaining <= 0}
              className="bg-accent hover:bg-accent/90"
            >
              <Heart className="h-4 w-4 mr-2" />
              Mark Full Tithe as Given
            </Button>
            <Button
              onClick={handlePartialTithe}
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
            >
              Record Partial Tithe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tithe History */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tithe History</CardTitle>
          <CardDescription>Your recent giving record</CardDescription>
        </CardHeader>
        <CardContent>
          {tithes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tithe payments recorded yet. Start by marking your first tithe above.
            </p>
          ) : (
            <div className="space-y-3">
              {tithes
                .slice()
                .reverse()
                .slice(0, 10)
                .map((tithe) => (
                  <div
                    key={tithe.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {tithe.given ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(tithe.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tithe.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
