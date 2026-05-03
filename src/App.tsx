import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppRoutes } from "./components/AppRoutes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UploadProvider } from "./contexts/UploadContext";
import { TenantProvider } from "./contexts/TenantContext";
import { NotificationProvider } from "./contexts/NotificationContext";
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
  const { user, status } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <TooltipProvider>
            <UploadProvider>
              <NotificationProvider>
                <Toaster />
                <Sonner />
                {/* Initialisation du stockage Supabase */}
                {status === 'authenticated' && user && <StorageInitializer />}
                <AppRoutes />
              </NotificationProvider>
            </UploadProvider>
          </TooltipProvider>
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
