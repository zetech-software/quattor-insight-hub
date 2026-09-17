import { Calculator, History, LayoutDashboard, Users, FileBarChart, LogOut, Sun, Moon, Bot, LifeBuoy, Headphones } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/qu4ttuor-logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useUnreadTicketCount } from "@/hooks/useTickets";

const clientItems = [
  { title: "Calculadora", url: "/", icon: Calculator },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Regina (Assistente)", url: "/regina", icon: Bot },
  { title: "Chamados", url: "/chamados", icon: LifeBuoy },
];

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Relatórios", url: "/admin/relatorios", icon: FileBarChart },
];

const supportItems = [{ title: "Caixa de chamados", url: "/suporte", icon: Headphones }];

interface AppSidebarProps {
  isAdmin?: boolean;
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const { state } = useSidebar();
  const { signOut, role } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const isSupport = role === "support";
  const unread = useUnreadTicketCount(isSupport ? "all" : "own");
  const mainItems = isSupport ? [...clientItems, ...supportItems] : clientItems;
  const mainLabel = "Principal";
  const showAdmin = isAdmin;


  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logo} alt="Qu4ttuor" className="h-9 w-auto" />
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xs">Q4</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? "" : mainLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && unread > 0 && (item.url === "/chamados" || item.url === "/suporte") && (
                        <Badge variant="default" className="ml-auto">{unread}</Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{collapsed ? "" : "Administração"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-accent"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={toggleTheme}
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
