import { Home, DollarSign, Heart, CreditCard, FileText, ShoppingCart, PiggyBank, TrendingUp, Landmark, BarChart3, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Income", url: "/income", icon: DollarSign },
  { title: "Tithe", url: "/tithe", icon: Heart },
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
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4 text-base font-semibold text-sidebar-primary">
            {open && "Steward"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
