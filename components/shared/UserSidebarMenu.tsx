"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LogOut,
  User,
  Moon,
  Sun,
  ChevronRight,
  Download,
  X,
  Home,
  Settings,
  Database,
  Users,
  FileText,
  Shield,
  Lock,
  Plug,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { clearLocalDatabase } from "@/lib/db";
import { useUserModules } from "@/hooks/useUserModules";

// --- Sub-componentes puros extraídos para evitar re-renderização ---
const MenuItem = ({ icon: Icon, title, description, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3.5 rounded-lg transition-all duration-200 text-left group border border-transparent hover:border-border/50 hover:bg-accent/50"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-md bg-muted/50 group-hover:bg-background shadow-sm transition-colors border border-transparent group-hover:border-border/20">
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground/90 group-hover:text-foreground">
          {title}
        </p>
        <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
          {description}
        </p>
      </div>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
  </button>
);

const LockedMenuItem = ({
  icon: Icon,
  title,
  description,
  customLockedText,
}: any) => (
  <div className="w-full flex items-center justify-between p-3.5 rounded-lg border border-dashed border-border/50 bg-muted/20 opacity-60 cursor-not-allowed">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-md bg-muted/30 relative">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
        <div className="absolute -top-1 -right-1">
          <Lock className="h-3 w-3 text-amber-500" />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground/50">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground/60">{description}</p>
        <p className="text-[10px] text-amber-600 mt-1 font-medium">
          {customLockedText ?? "Entre em contato para desbloquear"}
        </p>
      </div>
    </div>
  </div>
);

// --- Componente Principal do Sidebar ---
interface UserSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt: any;
}

export function UserSidebarMenu({
  isOpen,
  onClose,
  installPrompt,
}: UserSidebarMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const {
    isAdmin,
    hasModule,
    isModuleLocked,
    loading: modulesLoading,
  } = useUserModules();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Busca o nome do usuário APENAS quando o menu abre
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    const loadUser = async () => {
      try {
        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success) {
            setDisplayName(data.displayName?.trim() || null);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
      }
    };

    loadUser();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Se não estiver aberto e não estiver fechando, não renderiza nada na DOM
  if (!isOpen && !isClosing) return null;

  const handleLogout = async () => {
    try {
      await clearLocalDatabase();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const handleCloseClick = () => {
    setIsClosing(true);
  };

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target && isClosing) {
      setIsClosing(false);
      onClose(); // Avisa o componente pai que terminou de fechar
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      // Idealmente, notificar o pai para limpar o installPrompt
    }
    handleCloseClick();
  };

  const navigateTo = (path: string) => {
    router.push(path);
    handleCloseClick();
  };

  // Flags de rota
  const isDashboardPage = pathname === "/";
  const isHistoryPage = pathname.startsWith("/history");
  const isAdminPage = pathname.startsWith("/admin");
  const isCountImportPage = pathname.startsWith("/count-import");
  const isAuditPage = pathname.startsWith("/audit");
  const isTeamPage = pathname.startsWith("/team");

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay escuro */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-[2px] [animation-duration:300ms] [animation-fill-mode:both]",
          isClosing ? "animate-out fade-out" : "animate-in fade-in-0",
        )}
        onClick={handleCloseClick}
      />

      {/* Painel do menu */}
      <div
        className={cn(
          "relative w-full max-w-[320px] bg-background/95 backdrop-blur-xl h-full shadow-2xl border-l border-border/40 flex flex-col [animation-duration:300ms] [animation-fill-mode:both]",
          isClosing
            ? "animate-out slide-out-to-right-full"
            : "animate-in slide-in-from-right-full",
        )}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="flex items-center justify-between p-6 border-b border-border/10 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md ring-2 ring-background">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {displayName || "Menu do Usuário"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Online
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseClick}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {/* Seção: Modos de Contagem */}
          {!modulesLoading && (
            <div className="px-3 py-2">
              <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                Modos de contagem
              </p>
              <div className="space-y-1">
                {!isCountImportPage && hasModule("importacao") && (
                  <MenuItem
                    icon={Settings}
                    title="Contagem por Importação"
                    description="Modo de contagem por importação de arquivo CSV"
                    onClick={() => navigateTo("/count-import")}
                  />
                )}
                {!isCountImportPage && isModuleLocked("importacao") && (
                  <LockedMenuItem
                    icon={Settings}
                    title="Contagem por Importação"
                    description="Importe planilhas e conte produtos"
                  />
                )}

                {!isAuditPage && hasModule("livre") && (
                  <MenuItem
                    icon={Database}
                    title="Contagem Livre"
                    description="Contar usando catálogo global"
                    onClick={() => navigateTo("/audit")}
                  />
                )}
                {!isAuditPage && isModuleLocked("livre") && (
                  <LockedMenuItem
                    icon={Database}
                    title="Contagem Livre"
                    description="Use o catálogo global de produtos"
                  />
                )}

                {!isTeamPage && hasModule("sala") && (
                  <MenuItem
                    icon={Users}
                    title="Gerenciar Sala"
                    description="Modo equipe com múltiplos dispositivos"
                    onClick={() => navigateTo("/team")}
                  />
                )}
                {!isTeamPage && isModuleLocked("sala") && (
                  <LockedMenuItem
                    icon={Users}
                    title="Gerenciar Sala"
                    description="Contagem colaborativa em equipe"
                  />
                )}

                <LockedMenuItem
                  icon={Plug}
                  title="Contagem API (Integração)"
                  description="Contagem via integração com sistemas externos"
                  customLockedText="Em desenvolvimento."
                />
              </div>
            </div>
          )}

          <div className="my-2 h-px bg-border/30 w-[90%] mx-auto" />

          {/* Seção: Outras páginas */}
          <div className="px-3 py-2">
            <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Outras páginas
            </p>
            <div className="space-y-1">
              {!isDashboardPage && (
                <MenuItem
                  icon={Home}
                  title="Dashboard"
                  description="Página inicial e visão geral"
                  onClick={() => navigateTo("/?forceDashboard=1")}
                />
              )}
              {!isHistoryPage && (
                <MenuItem
                  icon={FileText}
                  title="Histórico"
                  description="Relatórios e contagens anteriores"
                  onClick={() => navigateTo("/history")}
                />
              )}
              {!isAdminPage && isAdmin && (
                <MenuItem
                  icon={Shield}
                  title="Gerenciar Usuários"
                  description="Controlar permissões e módulos"
                  onClick={() => navigateTo("/admin/users")}
                />
              )}
            </div>
          </div>

          <div className="my-2 h-px bg-border/30 w-[90%] mx-auto" />

          {/* Preferências */}
          <div className="px-3 py-2">
            <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Preferências
            </p>
            <div className="space-y-1">
              <MenuItem
                icon={Settings}
                title="Configurações"
                description="Preferências da sua conta"
                onClick={() => navigateTo("/settings-user")}
              />
              {mounted && (
                <MenuItem
                  icon={theme === "dark" ? Moon : Sun}
                  title="Tema"
                  description={
                    theme === "dark"
                      ? "Alternar para Claro"
                      : "Alternar para Escuro"
                  }
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                />
              )}
              {installPrompt && (
                <MenuItem
                  icon={Download}
                  title="Instalar Aplicativo"
                  description="Adicionar à tela inicial"
                  onClick={handleInstallApp}
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/10 bg-muted/5">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-12 px-4"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-medium">Sair da Conta</span>
          </Button>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Countifly {process.env.NEXT_PUBLIC_APP_VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
