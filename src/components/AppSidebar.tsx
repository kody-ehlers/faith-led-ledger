import {
  Home,
  DollarSign,
  Church,
  CreditCard,
  FileText,
  ShoppingCart,
  PiggyBank,
  TrendingUp,
  Landmark,
  BarChart3,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";

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
    { title: "Savings", url: "/savings", icon: PiggyBank },
    { title: "Investments", url: "/investments", icon: TrendingUp },
    { title: "Debt", url: "/debt", icon: Landmark },
    { title: "Statistics", url: "/statistics", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <nav
      className={clsx(
        "flex flex-col py-4 h-full transition-all duration-300",
        collapsed ? "px-0" : "px-3"
      )}
    >
      {menuItems.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 w-full rounded-lg transition-colors px-3 py-2 hover:bg-accent",
              isActive && "bg-accent text-accent-foreground",
              collapsed ? "justify-center" : "justify-start"
            )
          }
          title={collapsed ? item.title : undefined}
        >
          <div
            className={clsx(
              "flex items-center justify-center",
              collapsed ? "w-full" : "min-w-[20px]"
            )}
          >
            <item.icon size={20} />
          </div>
          {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
