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
  Tag,
  LayoutGrid,
} from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import { clearLocalDatabase } from "@/lib/db";
import { useUserModules } from "@/hooks/useUserModules";

// --- Sub-componentes puros extraídos para evitar re-renderização ---
const MenuItem = ({ icon: Icon, title, description, onClick, isActive }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between p-3.5 rounded-lg transition-all duration-200 text-left group border",
      isActive
        ? "border-primary/40 bg-primary/10 text-primary font-semibold"
        : "border-transparent hover:border-border/50 hover:bg-accent/50 text-foreground/90"
    )}
  >
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "p-2 rounded-md shadow-sm transition-colors border",
          isActive
            ? "bg-primary/20 text-primary border-primary/30"
            : "bg-muted/50 group-hover:bg-background text-muted-foreground group-hover:text-primary border-transparent group-hover:border-border/20"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p
          className={cn(
            "font-medium text-sm",
            isActive
              ? "text-primary font-semibold"
              : "text-foreground/90 group-hover:text-foreground"
          )}
        >
          {title}
        </p>
        <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
          {description}
        </p>
      </div>
    </div>
    <ChevronRight
      className={cn(
        "h-4 w-4 transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground/40 group-hover:text-foreground/60"
      )}
    />
  </button>
);

const LockedMenuItem = ({
  icon: Icon,
  title,
  description,
  customLockedText,
}: any) => (
  <div className="w-full flex items-center justify-between p-3.5 rounded-lg border border-dashed border-border/50 bg-muted/20 opacity-85 cursor-not-allowed">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-md bg-muted/30 relative">
        <Icon className="h-5 w-5 text-muted-foreground/80" />
        <div className="absolute -top-1 -right-1">
          <Lock className="h-3 w-3 text-amber-500" />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground/80">{title}</p>
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
  const { theme, setTheme, systemTheme } = useTheme();
  const activeTheme = theme === "system" ? systemTheme : theme;

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
      onClose();
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

  const isDashboardPage = pathname === "/";
  const isHistoryPage = pathname.startsWith("/history");
  const isAdminPage = pathname.startsWith("/admin");
  const isCountImportPage = pathname.startsWith("/count-import");
  const isAuditPage = pathname.startsWith("/audit");
  const isMixedInventoryPage = pathname.startsWith("/mixed-inventory");
  const isApiErpPage = pathname.startsWith("/api-erp");
  const isTeamPage = pathname.startsWith("/team");
  const isEtiquetasPage = pathname.startsWith("/ferramentas/etiquetas");

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-[2px] [animation-duration:300ms] [animation-fill-mode:both]",
          isClosing ? "animate-out fade-out" : "animate-in fade-in-0",
        )}
        onClick={handleCloseClick}
      />

      <div
        className={cn(
          "relative w-full bg-background/95 backdrop-blur-xl h-full shadow-2xl border-l border-border/40 flex flex-col [animation-duration:300ms] [animation-fill-mode:both]",
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
          {!modulesLoading && (
            <>
              {/* Seção 1: Conferência & Confronto (Físico vs Sistema) */}
              <div className="px-3 py-2">
                <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  Conferência & Confronto
                </p>
                <div className="space-y-1">
                  {hasModule("importacao") ? (
                    <MenuItem
                      icon={Settings}
                      title="Planilha ERP (CSV)"
                      description="Confronto de estoque importando a planilha do seu sistema"
                      isActive={isCountImportPage}
                      onClick={() => navigateTo("/count-import")}
                    />
                  ) : isModuleLocked("importacao") ? (
                    <LockedMenuItem
                      icon={Settings}
                      title="Planilha ERP (CSV)"
                      description="Confronto de estoque importando a planilha do seu sistema"
                    />
                  ) : null}

                  {hasModule("sala") ? (
                    <MenuItem
                      icon={Users}
                      title="Sessão em Equipe"
                      description="Múltiplos operadores contando juntos em tempo real"
                      isActive={isTeamPage}
                      onClick={() => navigateTo("/team")}
                    />
                  ) : isModuleLocked("sala") ? (
                    <LockedMenuItem
                      icon={Users}
                      title="Sessão em Equipe"
                      description="Múltiplos operadores contando juntos em tempo real"
                    />
                  ) : null}

                  {hasModule("api") ? (
                    <MenuItem
                      icon={Plug}
                      title="Integração API (ERP)"
                      description="Sincronização em tempo real com sistemas externos"
                      isActive={isApiErpPage}
                      onClick={() => navigateTo("/api-erp")}
                    />
                  ) : (
                    <LockedMenuItem
                      icon={Plug}
                      title="Integração API (ERP)"
                      description="Sincronização em tempo real com sistemas externos"
                    />
                  )}
                </div>
              </div>

              {/* Seção 2: Levantamento & Auditoria Especializada */}
              <div className="px-3 py-2">
                <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  Levantamento & Auditoria
                </p>
                <div className="space-y-1">
                  {hasModule("modular") ? (
                    <MenuItem
                      icon={LayoutGrid}
                      title="Contagem Modular"
                      description="Preço, validade, lote, localização e prevenção de perdas"
                      isActive={isMixedInventoryPage}
                      onClick={() => navigateTo("/mixed-inventory")}
                    />
                  ) : isModuleLocked("modular") ? (
                    <LockedMenuItem
                      icon={LayoutGrid}
                      title="Contagem Modular"
                      description="Preço, validade, lote, localização e prevenção de perdas"
                    />
                  ) : null}

                  {hasModule("livre") ? (
                    <MenuItem
                      icon={Database}
                      title="Contagem Livre (Avulsa)"
                      description="Bipagem avulsa e levantamento pela base global"
                      isActive={isAuditPage}
                      onClick={() => navigateTo("/audit")}
                    />
                  ) : isModuleLocked("livre") ? (
                    <LockedMenuItem
                      icon={Database}
                      title="Contagem Livre (Avulsa)"
                      description="Bipagem avulsa e levantamento pela base global"
                    />
                  ) : null}
                </div>
              </div>
            </>
          )}

          <div className="my-2 h-px bg-border/30 w-[90%] mx-auto" />

          {/* Seção: Ferramentas */}
          <div className="px-3 py-2">
            <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              Ferramentas
            </p>
            <div className="space-y-1">
              {!isEtiquetasPage && (
                <MenuItem
                  icon={Tag}
                  title="Gerador de Etiquetas"
                  description="Crie e imprima etiquetas de produtos"
                  onClick={() => navigateTo("/internal-tools/labels")}
                />
              )}
            </div>
          </div>

          <div className="my-2 h-px bg-border/30 w-[90%] mx-auto" />

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
                  icon={activeTheme === "dark" ? Moon : Sun}
                  title="Tema"
                  description={
                    activeTheme === "dark"
                      ? "Alternar para Claro"
                      : "Alternar para Escuro"
                  }
                  onClick={() => setTheme(activeTheme === "dark" ? "light" : "dark")}
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
