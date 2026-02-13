import {
  Home,
  DollarSign,
  Church,
  CreditCard,
  Wallet,
  FileText,
  ShoppingCart,
  PiggyBank,
  TrendingUp,
  Landmark,
  BarChart3,
  Target,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useState } from "react";

interface AppSidebarProps {
  collapsed: boolean;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const menuItems = [
    { title: "Home", url: "/", icon: Home },
    { title: "Income", url: "/income", icon: DollarSign },
    { title: "Tithe", url: "/tithe", icon: Church },
    { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
    { title: "Bills", url: "/bills", icon: FileText },
    { title: "Expenses", url: "/expenses", icon: ShoppingCart },
    { title: "Wallet", url: "/wallet", icon: Wallet },
    { title: "Investments", url: "/investments", icon: TrendingUp },
    { title: "Debt", url: "/debt", icon: Landmark },
    { title: "Statistics", url: "/statistics", icon: BarChart3 },
    { title: "Budget", url: "/budget", icon: Target },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav
      className={clsx(
        "relative flex flex-col py-4 h-full transition-all duration-300",
        collapsed ? "px-0" : "px-4"
      )}
    >
      {menuItems.map((item) => (
        <div
          key={item.title}
          className="relative"
          onMouseEnter={() => setHovered(item.title)}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to={item.url}
            className={({ isActive }) =>
              clsx(
                "group flex items-center gap-3 w-full rounded-lg transition-colors px-4 py-3 hover:bg-accent",
                isActive && "bg-accent text-accent-foreground",
                collapsed ? "justify-center" : "justify-start"
              )
            }
          >
            <item.icon size={22} />
            {!collapsed && (
              <span className="text-base font-semibold">{item.title}</span>
            )}
          </NavLink>

          {/* Hover popup tooltip — visible only when collapsed */}
          {collapsed && hovered === item.title && (
            <div
              className={clsx(
                "fixed bg-card text-foreground text-sm font-medium px-3 py-1.5 rounded-md shadow-md whitespace-nowrap z-50",
                "flex items-center justify-center transition-all duration-150"
              )}
              style={{
                left: "4.2rem",
                top: "auto",
                marginTop: "-2.25rem",
              }}
            >
              {/* Triangle pointer */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-card" />
              {item.title}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
