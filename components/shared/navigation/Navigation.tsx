"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  ChevronDown,
  Home,
  FileText,
  Shield,
  Settings,
  Moon,
  Sun,
  LogOut,
  Database,
  Users,
  Plug,
  Lock,
  Menu,
  Building,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useUserModules } from "@/hooks/useUserModules";
import { clearLocalDatabase } from "@/lib/db";
import { cn } from "@/lib/utils";

import { CompanySelector } from "@/components/shared/navigation/CompanySelector";
import { UserSidebarMenu } from "@/components/shared/navigation/UserSidebarMenu";

// --- Sub-componente para os itens do Menu Suspenso (Desktop) ---
const NavPopoverItem = ({
  icon: Icon,
  title,
  description,
  onClick,
  locked,
  lockedText,
}: any) => (
  <button
    onClick={!locked ? onClick : undefined}
    className={cn(
      "w-full flex items-start gap-3 p-3 rounded-lg transition-all duration-200 text-left border border-transparent",
      locked
        ? "opacity-60 cursor-not-allowed bg-muted/10 border-dashed border-border/50"
        : "hover:bg-accent/50 hover:border-border/50",
    )}
  >
    <div className="p-2 rounded-md bg-muted/50 shrink-0">
      <Icon
        className={cn(
          "h-4 w-4",
          locked ? "text-muted-foreground/50" : "text-primary",
        )}
      />
    </div>
    <div className="flex-1">
      <p className="font-medium text-sm text-foreground flex items-center gap-2">
        {title} {locked && <Lock className="h-3 w-3 text-amber-500" />}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
        {locked ? lockedText : description}
      </p>
    </div>
  </button>
);

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Estado para armazenar o nome do usuário
  const [userName, setUserName] = useState<string>("Carregando...");

  const {
    isAdmin,
    hasModule,
    isModuleLocked,
    loading: modulesLoading,
  } = useUserModules();

  useEffect(() => {
    setMounted(true);
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Busca o nome do usuário ao montar o componente
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();
        if (data.success && data.displayName) {
          setUserName(data.displayName);
        } else {
          setUserName("Usuário");
        }
      } catch (error) {
        setUserName("Usuário");
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await clearLocalDatabase();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  // Flags para marcar qual página está ativa na Navbar Desktop
  const isDashboardPage = pathname === "/";
  const isHistoryPage = pathname?.startsWith("/history");
  const isCompaniesPage = pathname?.startsWith("/settings-companies"); // Corrigido
  const isSettingsPage = pathname?.startsWith("/settings-user"); // Nova flag para configurações
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-between bg-background/95 backdrop-blur-md border-b border-border px-4 shadow-sm transition-all sm:px-6">
        {/* Esquerda: Logo + Empresa */}
        <div className="flex items-center gap-3 lg:gap-6 relative z-10">
          {modulesLoading ? (
            <span className="animate-pulse text-xl font-extrabold leading-none tracking-tight text-foreground opacity-50">
              Countifly
            </span>
          ) : hasModule("empresa") ? (
            <div className="flex items-center pl-1 lg:pl-0 h-6">
              <CompanySelector />
            </div>
          ) : (
            <span className="text-xl font-extrabold leading-none tracking-tight text-foreground">
              Countifly
            </span>
          )}
        </div>

        {/* NAVEGAÇÃO DESKTOP CENTRALIZADA (Oculta no Mobile) */}
        <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 z-0">
          {!modulesLoading && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 text-muted-foreground font-medium transition-colors"
                  >
                    Modos de Contagem <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-2 shadow-2xl rounded-xl border-border/40"
                  align="center"
                >
                  <div className="space-y-1">
                    {hasModule("importacao") ? (
                      <NavPopoverItem
                        icon={Settings}
                        title="Contagem por Importação"
                        description="Via arquivo CSV"
                        onClick={() => navigateTo("/count-import")}
                      />
                    ) : isModuleLocked("importacao") ? (
                      <NavPopoverItem
                        locked
                        icon={Settings}
                        title="Contagem por Importação"
                        lockedText="Entre em contato para desbloquear"
                      />
                    ) : null}

                    {hasModule("livre") ? (
                      <NavPopoverItem
                        icon={Database}
                        title="Contagem Livre"
                        description="Catálogo global"
                        onClick={() => navigateTo("/audit")}
                      />
                    ) : isModuleLocked("livre") ? (
                      <NavPopoverItem
                        locked
                        icon={Database}
                        title="Contagem Livre"
                        lockedText="Entre em contato para desbloquear"
                      />
                    ) : null}

                    {hasModule("sala") ? (
                      <NavPopoverItem
                        icon={Users}
                        title="Gerenciar Sala"
                        description="Contagem em equipe"
                        onClick={() => navigateTo("/team")}
                      />
                    ) : isModuleLocked("sala") ? (
                      <NavPopoverItem
                        locked
                        icon={Users}
                        title="Gerenciar Sala"
                        lockedText="Entre em contato para desbloquear"
                      />
                    ) : null}

                    <NavPopoverItem
                      locked
                      icon={Plug}
                      title="Contagem API (Integração)"
                      lockedText="Em desenvolvimento."
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                onClick={() => navigateTo("/?forceDashboard=1")}
                className={cn(
                  "font-medium bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3",
                  isDashboardPage
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground",
                )}
              >
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigateTo("/history")}
                className={cn(
                  "font-medium bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3",
                  isHistoryPage
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground",
                )}
              >
                <FileText className="mr-2 h-4 w-4" /> Histórico
              </Button>

              {/* Botão de Empresas - Bloqueado se não tiver o módulo */}
              {hasModule("empresa") ? (
                <Button
                  variant="ghost"
                  onClick={() => navigateTo("/settings-companies")}
                  className={cn(
                    "font-medium bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3",
                    isCompaniesPage
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Building className="mr-2 h-4 w-4" /> Empresas
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="font-medium bg-transparent hover:bg-transparent text-muted-foreground opacity-50 cursor-not-allowed transition-colors px-3"
                >
                  <Building className="mr-2 h-4 w-4" /> Empresas{" "}
                </Button>
              )}

              {/* Configurações (Perfil e Preferências) */}
              <Button
                variant="ghost"
                onClick={() => navigateTo("/settings-user")}
                className={cn(
                  "font-medium bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3",
                  isSettingsPage
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground",
                )}
              >
                <Settings className="mr-2 h-4 w-4" /> Configurações
              </Button>

              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={() => navigateTo("/admin/users")}
                  className={cn(
                    "font-medium bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3",
                    isAdminPage
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Shield className="mr-2 h-4 w-4" /> Admin
                </Button>
              )}
            </>
          )}
        </nav>

        {/* Direita: Perfil de Usuário, Tema, Logout e Botão Hamburger Mobile */}
        <div className="flex items-center gap-1 relative z-10">
          {/* Botão de Tema Desktop (Oculto no Mobile) */}
          <div className="hidden lg:block mr-1">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full bg-transparent hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                aria-label="Mudar tema"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>

          {/* PERFIL DO USUÁRIO (Apenas exibição, sem Popover) */}
          <div className="hidden lg:flex items-center gap-2 rounded-full pl-4 pr-1.5 py-1.5 bg-muted/30 border border-border/50">
            <span className="font-medium text-sm text-foreground max-w-[120px] truncate">
              {userName}
            </span>
            <div className="p-1 rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
          </div>

          {/* BOTÃO DE SAIR (Apenas ícone, invisível o fundo) */}
          <div className="hidden lg:block ml-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair da Conta"
              className="rounded-full bg-transparent hover:bg-transparent hover:text-destructive text-muted-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* ÍCONE DE MENU MOBILE (Abre o Sidebar - Oculto no Desktop) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileMenuOpen(true)}
            className="lg:hidden"
            aria-label="Abrir menu do usuário"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* O Sidebar inteligente: Controlado pelo state (aparece no Mobile e contém as opções) */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
      />
    </>
  );
}
