import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Income from "./pages/Income";
import Tithe from "./pages/Tithe";
import Expenses from "./pages/Expenses";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/income" element={<Income />} />
            <Route path="/tithe" element={<Tithe />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route 
              path="/subscriptions" 
              element={<Placeholder title="Subscriptions" description="Manage your recurring subscriptions" />} 
            />
            <Route 
              path="/bills" 
              element={<Placeholder title="Bills" description="Track your monthly bills" />} 
            />
            <Route 
              path="/savings" 
              element={<Placeholder title="Savings" description="Monitor your savings goals" />} 
            />
            <Route 
              path="/investments" 
              element={<Placeholder title="Investments" description="Track your investment portfolio" />} 
            />
            <Route 
              path="/debt" 
              element={<Placeholder title="Debt" description="Manage and pay down your debts" />} 
            />
            <Route 
              path="/statistics" 
              element={<Placeholder title="Statistics" description="View your financial insights" />} 
            />
            <Route 
              path="/settings" 
              element={<Placeholder title="Settings" description="Customize your app preferences" />} 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
