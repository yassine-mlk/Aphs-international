import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppRoutes } from "./components/AppRoutes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UploadProvider } from "./contexts/UploadContext";
import { TenantProvider } from "./contexts/TenantContext";
import { useAuth } from "./contexts/AuthContext";
import StorageInitializer from "./components/StorageInitializer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => {
  const { user } = useAuth();

  // Sync role dans localStorage quand l'user est disponible
  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role) {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, role: data.role }));
          }
        });
    });
  }, [user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <TooltipProvider>
            <UploadProvider>
                <Toaster />
                <Sonner />
                {/* Initialisation du stockage Supabase */}
                {user && <StorageInitializer />}
                <AppRoutes />
              </UploadProvider>
          </TooltipProvider>
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
