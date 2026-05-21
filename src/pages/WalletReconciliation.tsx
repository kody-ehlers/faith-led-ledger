import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/financeStore";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function WalletReconciliation() {
    const walletEnabled = useFinanceStore((state) => state.walletEnabled);
    const income = useFinanceStore((state) => state.income);
    const expenses = useFinanceStore((state) => state.expenses);
    const bills = useFinanceStore((state) => state.bills);
    const subscriptions = useFinanceStore((state) => state.subscriptions);
    const investments = useFinanceStore((state) => state.investments);
    const debts = useFinanceStore((state) => state.debts);

    const assets = useFinanceStore((state) => state.assets);
    const updateIncome = useFinanceStore((state) => state.updateIncome);
    const updateExpense = useFinanceStore((state) => state.updateExpense);
    const updateBill = useFinanceStore((state) => state.updateBill);
    const updateSubscription = useFinanceStore((state) => state.updateSubscription);
    const updateInvestment = useFinanceStore((state) => state.updateInvestment);
    const updateDebt = useFinanceStore((state) => state.updateDebt);
    const [selectedWallets, setSelectedWallets] = useState<Record<string, string>>({});

    const assignAsset = (item: { id: string; title: string; type: string }, assetId: string) => {
        switch (item.type) {
            case "Income":
                updateIncome(item.id, { assetId });
                break;
            case "Expense":
                updateExpense(item.id, { assetId });
                break;
            case "Bill":
                updateBill(item.id, { assetId });
                break;
            case "Subscription":
                updateSubscription(item.id, { assetId });
                break;
            case "Investment":
                updateInvestment(item.id, { assetId });
                break;
            case "Debt":
                updateDebt(item.id, { assetId });
                break;
        }

        setSelectedWallets((prev) => ({ ...prev, [item.id]: assetId }));
        toast.success(
            `${item.title} assigned to ${assets.find((a) => a.id === assetId)?.name ?? "wallet"}.`
        );
    };

    const items = useMemo(() => {
        if (!walletEnabled) return [];

        return [
            ...income
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.source,
                    type: "Income",
                    path: "/income",
                })),
            ...expenses
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.name,
                    type: "Expense",
                    path: "/expenses",
                })),
            ...bills
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.name,
                    type: "Bill",
                    path: "/bills",
                })),
            ...subscriptions
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.name,
                    type: "Subscription",
                    path: "/subscriptions",
                })),
            ...investments
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.name,
                    type: "Investment",
                    path: "/investments",
                })),
            ...debts
                .filter((entry) => !entry.assetId)
                .map((entry) => ({
                    id: entry.id,
                    title: entry.name,
                    type: "Debt",
                    path: "/debt",
                })),
        ];
    }, [walletEnabled, income, expenses, bills, subscriptions, investments, debts]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                    <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Wallet Reconciliation</h2>
                    <p className="text-muted-foreground">
                        Assign a wallet account to any items that were created while wallet tracking was off.
                    </p>
                </div>
            </div>

            {!walletEnabled ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Wallet Tracking Disabled</CardTitle>
                        <CardDescription>
                            Enable wallet tracking in Settings before reconciling items.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                When wallet tracking is enabled, you can assign existing income, expense, bill, subscription, investment, and debt entries to a wallet account.
                            </p>
                            <Link to="/settings">
                                <Button>Open Settings</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : items.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>All Set!</CardTitle>
                        <CardDescription>No outstanding items require wallet assignment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Link to="/wallet">
                                <Button variant="outline">View Wallet</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{items.length} item{items.length === 1 ? "" : "s"} to reconcile</CardTitle>
                        <CardDescription>
                            Assign a wallet account directly from this list, or open the item for more details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.type}</p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <Select
                                        value={selectedWallets[item.id] ?? "__none"}
                                        onValueChange={(value) => {
                                            if (value && value !== "__none") {
                                                assignAsset(item, value);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-10 text-sm w-full sm:w-60">
                                            <SelectValue placeholder="Assign wallet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none">Choose wallet</SelectItem>
                                            {assets.map((asset) => (
                                                <SelectItem key={asset.id} value={asset.id}>
                                                    {asset.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Link to={item.path} className="flex items-center gap-2">
                                        <Button variant="outline" size="sm">Open</Button>
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
