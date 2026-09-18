import { lazy, Suspense } from "react";
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
import DefinirSenha from "./pages/DefinirSenha";

import Historico from "./pages/Historico";
import Perfil from "./pages/Perfil";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClientes from "./pages/AdminClientes";
import AdminRelatorios from "./pages/AdminRelatorios";
import AdminRegina from "./pages/AdminRegina";
import Regina from "./pages/Regina";
import NotFound from "./pages/NotFound";
const DevPerfis = lazy(() => import("./pages/DevPerfis"));
const isDev = import.meta.env.DEV;

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
                <Route path="/definir-nova-senha" element={<ProtectedRoute allowPasswordChange><DefinirSenha /></ProtectedRoute>} />
                <Route path="/definir-senha" element={<Navigate to="/definir-nova-senha" replace />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

                <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
                <Route path="/regina" element={<ProtectedRoute blockedRoles={["admin"]}><Regina /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/pet" element={<Navigate to="/regina" replace />} />
                <Route path="/admin" element={<ProtectedRoute requiredRole={["admin", "manager", "support"]}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/clientes" element={<ProtectedRoute requiredRole={["admin", "manager", "support"]}><AdminClientes /></ProtectedRoute>} />
                <Route path="/admin/relatorios" element={<ProtectedRoute requiredRole={["admin", "manager", "support"]}><AdminRelatorios /></ProtectedRoute>} />
                <Route path="/admin/regina" element={<ProtectedRoute requiredRole={["admin", "manager", "support"]}><AdminRegina /></ProtectedRoute>} />

                {isDev && (
                  <Route
                    path="/dev/perfis"
                    element={
                      <Suspense fallback={null}>
                        <DevPerfis />
                      </Suspense>
                    }
                  />
                )}
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
