// app/components/Navigation.tsx (ou o caminho onde ele estiver)
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
} from "lucide-react";

import { Button } from "../../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useUserModules } from "@/hooks/useUserModules";
import { clearLocalDatabase } from "@/lib/db";
import { cn } from "@/lib/utils";

import { CompanySelector } from "./CompanySelector";
import { UserSidebarMenu } from "./UserSidebarMenu";

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
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <>
      {/* Header Flutuante */}
      <header className="fixed top-4 left-0 right-0 z-40 mx-auto flex h-16 w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-2xl border border-border bg-background px-4 shadow-lg sm:px-6">
        {/* Esquerda: Logo / Empresa + Navegação Desktop */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col justify-center">
            {modulesLoading ? (
              <span className="animate-pulse text-xl font-extrabold leading-none tracking-tight text-foreground opacity-50">
                Countifly
              </span>
            ) : hasModule("empresa") ? (
              <CompanySelector />
            ) : (
              <span className="text-xl font-extrabold leading-none tracking-tight text-foreground">
                Countifly
              </span>
            )}
          </div>

          {/* NAVEGAÇÃO DESKTOP (Oculta no Mobile) */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {!modulesLoading && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-2 text-muted-foreground hover:text-foreground font-medium"
                    >
                      Modos de Contagem <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-2 shadow-2xl rounded-xl border-border/40"
                    align="start"
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
                    "font-medium hover:bg-muted/50",
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
                    "font-medium hover:bg-muted/50",
                    isHistoryPage
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground",
                  )}
                >
                  <FileText className="mr-2 h-4 w-4" /> Histórico
                </Button>

                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => navigateTo("/admin/users")}
                    className={cn(
                      "font-medium hover:bg-muted/50",
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
        </div>

        {/* Direita: Preferências Desktop e Botões Mobile */}
        <div className="flex items-center gap-1.5">
          {/* Botão de Tema Mobile (Oculto no Desktop) */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="lg:hidden rounded-full border-2 border-transparent"
              aria-label="Mudar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700" />
              )}
            </Button>
          )}

          {/* MENU PREFERÊNCIAS DESKTOP (Oculto no Mobile) */}
          <div className="hidden lg:block">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-full pl-4 pr-1.5 border-2 border-transparent hover:border-border bg-muted/30 hover:bg-muted/50 transition-all"
                >
                  <span className="font-medium">Preferências</span>
                  <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-60 p-2 shadow-2xl rounded-xl border-border/40"
                align="end"
              >
                <NavPopoverItem
                  icon={Settings}
                  title="Configurações"
                  description="Ajustes da conta"
                  onClick={() => navigateTo("/settings-user")}
                />
                {mounted && (
                  <NavPopoverItem
                    icon={theme === "dark" ? Sun : Moon}
                    title="Tema"
                    description={
                      theme === "dark"
                        ? "Mudar para Claro"
                        : "Mudar para Escuro"
                    }
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  />
                )}

                <div className="my-1 h-px bg-border/40 w-full" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium text-sm">Sair da Conta</span>
                </button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botão de Perfil Mobile (Abre o Sidebar - Oculto no Desktop) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileMenuOpen(true)}
            className="lg:hidden relative rounded-full border-2 border-blue-500 bg-muted/40 transition-all duration-200 hover:border-blue-600 hover:bg-muted/60"
            aria-label="Abrir menu do usuário"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* O Sidebar inteligente: Aparece somente via Mobile (controlado pelo state) */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
      />
    </>
  );
}
