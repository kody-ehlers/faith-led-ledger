import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useWalletSync } from "./hooks/use-wallet-sync";
import Home from "./pages/Home";
import Income from "./pages/Income";
import Tithe from "./pages/Tithe";
import Subscriptions from "./pages/Subscriptions";
import Expenses from "./pages/Expenses";
import Placeholder from "./pages/Placeholder";
import Bills from "./pages/Bills";
import Savings from "./pages/Savings";
import Investments from "./pages/Investments";
import Debt from "./pages/Debt";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  // Sync wallet balances on app load
  useWalletSync();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/income" element={<Income />} />
        <Route path="/tithe" element={<Tithe />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/debt" element={<Debt />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
