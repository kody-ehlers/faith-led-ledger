import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ReactNode, useState } from "react";
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
              {children}
            </main>
          </ErrorBoundary>
        </div>
      </div>
    </SidebarProvider>
  );
}
