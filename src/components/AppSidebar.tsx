import { Home, DollarSign, Church, CreditCard, FileText, ShoppingCart, PiggyBank, TrendingUp, Landmark, BarChart3, Settings, CrossIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4 text-base font-semibold text-sidebar-primary">
            {open}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <Link
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
