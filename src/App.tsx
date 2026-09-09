import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ReginaProvider } from "@/hooks/useRegina";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Historico from "./pages/Historico";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClientes from "./pages/AdminClientes";
import AdminRelatorios from "./pages/AdminRelatorios";
import Regina from "./pages/Regina";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ReginaProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
                <Route path="/regina" element={<ProtectedRoute><Regina /></ProtectedRoute>} />
                <Route path="/pet" element={<Navigate to="/regina" replace />} />
                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><AdminClientes /></ProtectedRoute>} />
                <Route path="/admin/relatorios" element={<ProtectedRoute requiredRole="admin"><AdminRelatorios /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ReginaProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
