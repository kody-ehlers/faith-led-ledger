import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useFinanceStore } from "@/store/financeStore";
import { ArrowRight, CheckCircle2, Wallet, Church } from "lucide-react";
import { toast } from "sonner";

const TYPE_STYLES: Record<string, { row: string; badge: string; label: string }> = {
    Income: { row: "bg-success/5 border-success/20", badge: "bg-success/10 text-success border-success/20", label: "Income" },
    Expense: { row: "bg-destructive/5 border-destructive/20", badge: "bg-destructive/10 text-destructive border-destructive/20", label: "Expense" },
    Bill: { row: "bg-accent/5 border-accent/20", badge: "bg-accent/10 text-accent border-accent/20", label: "Bill" },
    Subscription: { row: "bg-primary/5 border-primary/20", badge: "bg-primary/10 text-primary border-primary/20", label: "Subscription" },
    Investment: { row: "bg-sage/5 border-sage/30", badge: "bg-sage/10 text-sage border-sage/30", label: "Investment" },
    Debt: { row: "bg-muted/50 border-muted/40", badge: "bg-muted text-muted-foreground border-muted/40", label: "Debt" },
};

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

            {/* Scripture */}
            <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-accent/10">
                            <Church className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1">
                            <p className="text-lg italic text-foreground mb-2">
                                "Know the state of your flocks, and put your heart into caring for your herds, for riches don't last forever."
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">Proverbs 27:23-24 (NLT)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!walletEnabled ? (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Wallet Tracking Disabled
                        </CardTitle>
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
                <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                            All Set!
                        </CardTitle>
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
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            {items.length} item{items.length === 1 ? "" : "s"} to reconcile
                        </CardTitle>
                        <CardDescription>
                            Assign a wallet account directly from this list, or open the item for more details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {items.map((item) => {
                            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES["Expense"];
                            return (
                                <div
                                    key={item.id}
                                    className={`flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-sm md:flex-row md:items-center md:justify-between ${style.row}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={style.badge}>
                                            {style.label}
                                        </Badge>
                                        <div>
                                            <p className="font-semibold text-foreground">{item.title}</p>
                                        </div>
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
                                            <SelectTrigger className="h-10 text-sm w-full sm:w-60 bg-background/80">
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
                                            <Button variant="outline" size="sm" className="bg-background/80">Open</Button>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
