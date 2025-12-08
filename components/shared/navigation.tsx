// components/shared/navigation.tsx
/**
 * Descrição: Componente de Navegação Principal.
 * Atualização: Adicionada opção "Gerenciar Sala de Contagem" e "Instalar App".
 */

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Trash2,
  LogOut,
  User,
  Upload,
  Moon,
  Sun,
  ChevronRight,
  Users, // Ícone novo
  Download, // Ícone para instalação
} from "lucide-react";
import { Button } from "../ui/button";

// Hook personalizado para detectar dispositivos móveis
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
  onSwitchToTeamMode?: () => void; // <--- NOVA PROP
  currentMode?: "single" | "team"; // <--- NOVA PROP para saber qual mostrar
}

export function Navigation({
  setShowClearDataModal,
  onNavigate,
  onSwitchToTeamMode,
  currentMode = "single",
}: NavigationProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  // Adicione este estado e efeito no início do componente Navigation
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
    setIsProfileMenuOpen(false);
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Countifly
              </span>
              {/* Indicador visual de modo */}
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {currentMode === "team" ? "Modo Equipe" : "Modo Individual"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Botão de limpar dados só aparece no modo individual para evitar acidentes na sessão */}
              {currentMode === "single" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClearDataModal(true)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProfileMenuOpen(true)}
                className="relative rounded-full bg-secondary/50 hover:bg-secondary text-primary border border-border"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isProfileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setIsProfileMenuOpen(false)}
          />

          <div className="relative w-full max-w-xs bg-background h-full shadow-2xl animate-in slide-in-from-right-full duration-300 flex flex-col">
            <div className="p-6 bg-gradient-to-b from-background to-muted/30">
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="relative rounded-full bg-secondary/50 w-16 h-16 flex items-center justify-center border-2 border-border hover:border-primary transition-colors"
                >
                  <User className="h-8 w-8 text-primary" />
                </button>

                <div className="text-center">
                  <p className="font-medium">Menu do Usuário</p>

                  <p className="text-xs text-muted-foreground">
                    Countifly {process.env.NEXT_PUBLIC_APP_VERSION}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
              {/* --- BOTÃO DE TROCA DE MODO --- */}
              {onSwitchToTeamMode && (
                <button
                  onClick={() => {
                    onSwitchToTeamMode();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-accent transition-colors text-left group border border-transparent hover:border-primary/20"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        currentMode === "single"
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {currentMode === "single" ? (
                        <Users className="h-6 w-6" />
                      ) : (
                        <User className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {currentMode === "single"
                          ? "Gerenciar Sala"
                          : "Voltar ao Individual"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {currentMode === "single"
                          ? "Modo Equipe"
                          : "Meu Estoque"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </button>
              )}

              <div className="h-px bg-border my-2" />

              {isMobile && currentMode === "single" && (
                <button
                  onClick={() => handleNavigate("import")}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">Importar Produtos</p>
                      <p className="text-sm text-muted-foreground">
                        Carregar CSV
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                      {theme === "dark" ? (
                        <Moon className="h-6 w-6" />
                      ) : (
                        <Sun className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Aparência</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === "dark" ? "Modo Escuro" : "Modo Claro"}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* --- BOTÃO DE INSTALAR APP --- */}
              {installPrompt && (
                <button
                  onClick={() => {
                    handleInstallApp();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <Download className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">Instalar App</p>
                      <p className="text-sm text-muted-foreground">
                        Adicionar à tela inicial
                      </p>
                    </div>
                  </div>
                </button>
              )}

              <div className="h-px bg-border my-2" />

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
