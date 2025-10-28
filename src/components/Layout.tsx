import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ReactNode, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <SidebarProvider defaultOpen={!isSidebarCollapsed}>
      <div className="min-h-screen flex w-full">
        {/* --- Sidebar --- */}
        <div
          className={clsx(
            "flex flex-col border-r border-border bg-card transition-all duration-300",
            isSidebarCollapsed ? "w-16 items-center" : "w-64"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <AppSidebar collapsed={isSidebarCollapsed} />
          </div>
        </div>

        {/* --- Main Content --- */}
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              {/* Sidebar toggle */}
              <SidebarTrigger onClick={handleSidebarToggle} />
              {!isSidebarCollapsed && (
                <h1 className="text-xl font-bold text-foreground">
                  Ehlers Finances
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

          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
