// components/shared/navigation.tsx
"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Button } from "../ui/button";
import { useUserModules } from "@/hooks/useUserModules";
import { CompanySelector } from "./CompanySelector";
import { UserSidebarMenu } from "./UserSidebarMenu";

export function Navigation() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Hook muito leve agora, pois o trabalho pesado foi pro Sidebar
  const { hasModule, loading: modulesLoading } = useUserModules();

  // Escuta o evento de instalação do PWA
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <>
      {/* Header Fixo da Aplicação */}
      <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/90 backdrop-blur-2xl header-safe supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full py-2">
            {/* Esquerda: Logo ou Seletor de Empresa */}
            <div className="flex flex-col justify-center">
              {modulesLoading ? (
                <span className="text-xl font-extrabold tracking-tight text-foreground leading-none opacity-50 animate-pulse">
                  Countifly
                </span>
              ) : hasModule("empresa") ? (
                <CompanySelector />
              ) : (
                <span className="text-xl font-extrabold tracking-tight text-foreground leading-none">
                  Countifly
                </span>
              )}
            </div>

            {/* Direita: Botão de Perfil */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProfileMenuOpen(true)}
                className="relative rounded-full bg-muted/40 hover:bg-muted/60 border-2 border-blue-500 hover:border-blue-600 transition-all duration-200"
                aria-label="Abrir menu do usuário"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* O Sidebar inteligente: O código dele só é executado se necessário */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
      />
    </>
  );
}
