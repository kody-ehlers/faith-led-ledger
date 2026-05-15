import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import ErrorBoundary from "./ErrorBoundary";
import { TauriTitleBar } from "./TauriTitleBar";
import { useFinanceStore } from "@/store/financeStore";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const appName = useFinanceStore((state) => state.appName);
  const walletEnabled = useFinanceStore((state) => state.walletEnabled);
  const income = useFinanceStore((state) => state.income);
  const expenses = useFinanceStore((state) => state.expenses);
  const bills = useFinanceStore((state) => state.bills);
  const subscriptions = useFinanceStore((state) => state.subscriptions);
  const investments = useFinanceStore((state) => state.investments);
  const debts = useFinanceStore((state) => state.debts);
  const navigate = useNavigate();

  const reconciliationItems = useMemo(() => {
    if (!walletEnabled) return [];

    const items: Array<{ id: string; title: string; type: string; path: string }> = [];

    items.push(
      ...income
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.source,
          type: "Income",
          path: "/income",
        }))
    );

    items.push(
      ...expenses
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.name,
          type: "Expense",
          path: "/expenses",
        }))
    );

    items.push(
      ...bills
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.name,
          type: "Bill",
          path: "/bills",
        }))
    );

    items.push(
      ...subscriptions
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.name,
          type: "Subscription",
          path: "/subscriptions",
        }))
    );

    items.push(
      ...investments
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.name,
          type: "Investment",
          path: "/investments",
        }))
    );

    items.push(
      ...debts
        .filter((entry) => !entry.assetId)
        .map((entry) => ({
          id: entry.id,
          title: entry.name,
          type: "Debt",
          path: "/debt",
        }))
    );

    return items;
  }, [walletEnabled, income, expenses, bills, subscriptions, investments, debts]);

  const hasReconciliation = reconciliationItems.length > 0;

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const isTauri =
    typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  return (
    <SidebarProvider defaultOpen={!isSidebarCollapsed}>
      <TauriTitleBar />
      <div className={clsx("min-h-screen flex w-full", isTauri && "pt-10")}>
        {/* --- Sidebar --- */}
        <div
          className={clsx(
            "flex flex-col border-r border-border bg-card transition-all duration-300 fixed top-10 left-0 h-screen z-40",
            isSidebarCollapsed ? "w-16 items-center" : "w-64"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <AppSidebar collapsed={isSidebarCollapsed} />
          </div>
        </div>

        {/* --- Main Content --- */}
        <div
          className={clsx(
            "flex-1 flex flex-col transition-all duration-300",
            isSidebarCollapsed ? "ml-16" : "ml-64"
          )}
        >
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 fixed top-10 right-0 left-0"
            style={{
              marginLeft: isSidebarCollapsed ? "4rem" : "16rem"
            }}
          >
            <div className="flex items-center gap-4">
              {/* Sidebar toggle */}
              <SidebarTrigger onClick={handleSidebarToggle} />
              {!isSidebarCollapsed && (
                <h1 className="text-xl font-bold text-foreground">
                  {appName}
                </h1>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </header>

          <ErrorBoundary>
            <main data-main-content className="flex-1 p-6 overflow-auto mt-16">
              {hasReconciliation && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">Wallet reconciliation ready</p>
                      <p className="text-sm text-amber-900/80">
                        {reconciliationItems.length} item{reconciliationItems.length === 1 ? "" : "s"} need a wallet account assigned.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/wallet/reconcile")}>Review items</Button>
                  </div>
                </div>
              )}
              {children}
            </main>
          </ErrorBoundary>
        </div>
      </div>
    </SidebarProvider>
  );
}
