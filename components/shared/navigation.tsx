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

  const { hasModule, loading: modulesLoading } = useUserModules();

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
      {/* Header Flutuante com Limite de Largura (O Freio) */}
      <header className="fixed top-4 left-0 right-0 z-40 mx-auto flex h-16 w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-2xl border border-border bg-background px-4 shadow-lg sm:px-6">
        {/* Esquerda: Logo ou Seletor de Empresa */}
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

        {/* Direita: Botão de Perfil */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileMenuOpen(true)}
            className="relative rounded-full border-2 border-blue-500 bg-muted/40 transition-all duration-200 hover:border-blue-600 hover:bg-muted/60"
            aria-label="Abrir menu do usuário"
          >
            <User className="h-5 w-5" />
          </Button>
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
