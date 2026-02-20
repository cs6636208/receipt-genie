import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import HistoryPage from "./pages/HistoryPage";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return null; // loading

  if (!user) return <AuthPage />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthGate>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </AuthGate>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
