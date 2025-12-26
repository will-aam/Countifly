// components/shared/navigation.tsx
/**
 * Descrição: Componente de Navegação Principal com visual corporativo refinado.
 * Alteração Solicitada: Alternância dinâmica do botão de navegação.
 * - Se estiver em "/audit" -> Mostra "Contagem por Importação" (vai para "/").
 * - Se NÃO estiver em "/audit" -> Mostra "Contagem Livre" (vai para "/audit").
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // <--- ADICIONADO usePathname
import { useTheme } from "next-themes";
import {
  Trash2,
  LogOut,
  User,
  Upload,
  Moon,
  Sun,
  ChevronRight,
  Users,
  Download,
  X,
  FileText,
  Database,
  Home,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);
  return isMobile;
}

interface NavigationProps {
  setShowClearDataModal: (show: boolean) => void;
  onNavigate?: (tab: string) => void;
  onSwitchToTeamMode?: () => void;
  currentMode?: "single" | "team";
}

export function Navigation({
  setShowClearDataModal,
  onNavigate,
  onSwitchToTeamMode,
  currentMode = "single",
}: NavigationProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const router = useRouter();
  const pathname = usePathname(); // <--- OBTÉM A ROTA ATUAL
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    handleClose();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleNavigate = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    handleClose();
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
  };

  const handleSidebarAnimationEnd = (
    e: React.AnimationEvent<HTMLDivElement>
  ) => {
    if (e.currentTarget !== e.target) return;

    if (isClosing) {
      setIsProfileMenuOpen(false);
      setIsClosing(false);
    }
  };

  const MenuItem = ({
    icon: Icon,
    title,
    description,
    onClick,
  }: {
    icon: any;
    title: string;
    description: string;
    onClick: () => void;
  }) => (
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/90 backdrop-blur-2xl header-safe supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex flex-col justify-center">
              <span className="text-xl font-extrabold tracking-tight text-foreground leading-none">
                Countifly
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider mt-1">
                {currentMode === "team" ? "Modo Equipe" : "Modo Individual"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {currentMode === "single" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClearDataModal(true)}
                  className="text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Limpar dados"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/?forceDashboard=1")}
                className={cn(
                  "relative rounded-full",
                  "hover:bg-muted/60 hover:border-border/30",
                  pathname === "/"
                    ? "text-foreground"
                    : "text-muted-foreground/80 hover:text-foreground"
                )}
                aria-label="Ir para o dashboard"
              >
                <Home className="h-5 w-5" />
              </Button>

              {/* Configurações */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/settings-user")}
                className={cn(
                  "relative rounded-full",
                  "hover:bg-muted/60 hover:border-border/30 text-muted-foreground/80 hover:text-foreground"
                )}
                aria-label="Abrir configurações"
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* Perfil */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProfileMenuOpen(true)}
                className="relative rounded-full bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-border/30 transition-all duration-200"
                aria-label="Abrir menu do usuário"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isProfileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-[2px] [animation-duration:300ms] [animation-fill-mode:both]",
              isClosing ? "animate-out fade-out" : "animate-in fade-in-0"
            )}
            onClick={handleClose}
          />

          <div
            className={cn(
              "relative w-full max-w-[320px] bg-background/95 backdrop-blur-xl h-full shadow-2xl border-l border-border/40 flex flex-col [animation-duration:300ms] [animation-fill-mode:both]",
              isClosing
                ? "animate-out slide-out-to-right-full"
                : "animate-in slide-in-from-right-full"
            )}
            onAnimationEnd={handleSidebarAnimationEnd}
          >
            <div className="flex items-center justify-between p-6 border-b border-border/10 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md ring-2 ring-background">
                    <User className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full"></span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Menu do Usuário</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Online
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 py-2">
                <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Principal
                </p>
                <div className="space-y-1">
                  {onSwitchToTeamMode && (
                    <MenuItem
                      icon={currentMode === "single" ? Users : User}
                      title={
                        currentMode === "single"
                          ? "Gerenciar Sala"
                          : "Voltar ao Individual"
                      }
                      description={
                        currentMode === "single" ? "Modo Equipe" : "Meu Estoque"
                      }
                      onClick={() => {
                        onSwitchToTeamMode();
                        handleClose();
                      }}
                    />
                  )}

                  {/* LÓGICA DE ALTERNÂNCIA DO MENU AQUI */}
                  {pathname === "/audit" ? (
                    // Se estiver na página de Auditoria, mostra opção para ir para Home
                    <MenuItem
                      icon={Home}
                      title="Contagem por Importação"
                      description="Voltar para o modo padrão"
                      onClick={() => {
                        router.push("/");
                        handleClose();
                      }}
                    />
                  ) : (
                    // Se NÃO estiver na página de Auditoria, mostra opção para ir para Auditoria
                    <MenuItem
                      icon={Database}
                      title="Contagem Livre"
                      description="Contar produtos do catálogo"
                      onClick={() => {
                        router.push("/audit");
                        handleClose();
                      }}
                    />
                  )}

                  <MenuItem
                    icon={FileText}
                    title="Históricos e Relatórios"
                    description="Visualizar e criar relatórios"
                    onClick={() => {
                      router.push("/history");
                      handleClose();
                    }}
                  />

                  {isMobile && currentMode === "single" && (
                    <MenuItem
                      icon={Upload}
                      title="Importar Produtos"
                      description="Carregar arquivo CSV"
                      onClick={() => handleNavigate("import")}
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

              <div className="my-2 h-px bg-border/30 w-[90%] mx-auto" />

              <div className="px-3 py-2">
                <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                  Preferências
                </p>
                <div className="space-y-1">
                  {/* Tema claro/escuro */}
                  {mounted && (
                    <MenuItem
                      icon={theme === "dark" ? Moon : Sun}
                      title="Tema"
                      description={
                        theme === "dark"
                          ? "Alternar para Claro"
                          : "Alternar para Escuro"
                      }
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
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
      )}
    </>
  );
}
