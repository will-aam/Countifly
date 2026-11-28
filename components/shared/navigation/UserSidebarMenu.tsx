"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  UserIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon as LogOutIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";
import { SidebarNavContent } from "./SidebarNavContent";
import type { SidebarModuleKey } from "./sidebar-config";

interface UserSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt: any;
  userName: string;
  isAdmin: boolean;
  modulesLoading: boolean;
  hasModule: (module: SidebarModuleKey) => boolean;
  isModuleLocked: (module: SidebarModuleKey) => boolean;
  onLogout: () => Promise<void>;
}

export function UserSidebarMenu({
  isOpen,
  onClose,
  installPrompt,
  userName,
  isAdmin,
  modulesLoading,
  hasModule,
  isModuleLocked,
  onLogout,
}: UserSidebarMenuProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const activeTheme = theme === "system" ? systemTheme : theme;

  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen && !isClosing) return null;

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
    await installPrompt.userChoice;
    handleCloseClick();
  };

  return (
    <div className="lg:hidden fixed inset-0 z-[100] flex justify-end print:hidden">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] [animation-duration:250ms] [animation-fill-mode:both]",
          isClosing ? "animate-out fade-out" : "animate-in fade-in-0",
        )}
        onClick={handleCloseClick}
      />

      {/* Drawer alinhado ao visual minimalista do Sidebar Desktop */}
      <aside
        className={cn(
          "relative w-[86vw] max-w-[310px] rounded-l-2xl bg-background/95 dark:bg-[#0d0f14]/98 backdrop-blur-xl h-full shadow-2xl border-l border-border/50 flex flex-col [animation-duration:260ms] [animation-fill-mode:both]",
          isClosing
            ? "animate-out slide-out-to-right-full"
            : "animate-in slide-in-from-right-full",
        )}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Header com avatar circular e status Online */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="p-2.5 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md ring-2 ring-background">
                <UserIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {userName || "Menu do Usuário"}
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
            aria-label="Fechar menu"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Navegação compartilhada com o Desktop */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 pt-1 pb-4">
          {!modulesLoading && (
            <>
              <SidebarNavContent
                variant="mobile"
                isExpanded
                isAdmin={isAdmin}
                hasModule={hasModule}
                isModuleLocked={isModuleLocked}
                onNavigate={handleCloseClick}
              />

              {installPrompt && (
                <div className="space-y-0.5 mt-1">
                  <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
                    Aplicativo
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left text-slate-700 dark:text-muted-foreground hover:text-slate-950 dark:hover:text-foreground hover:bg-muted/40"
                  >
                    <ArrowDownTrayIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                    <span className="text-[13px] font-medium truncate">
                      Instalar Aplicativo
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </nav>

        {/* Footer com tema, saída e versão embaixo */}
        <div className="shrink-0 px-3 py-3 border-t border-border/40 bg-muted/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {mounted && (
                <AnimatedThemeToggler
                  variant="circle"
                  theme={activeTheme as "light" | "dark"}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 flex items-center justify-center"
                />
              )}
              <span className="text-xs text-muted-foreground">
                {mounted && activeTheme === "dark" ? "Tema Escuro" : "Tema Claro"}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-lg"
            >
              <LogOutIcon className="h-4 w-4" />
              <span className="font-medium">Sair</span>
            </Button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Countifly {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
