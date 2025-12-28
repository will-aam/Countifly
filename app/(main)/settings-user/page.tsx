"use client";

import { Lock, Home, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { PasswordUserSettings } from "@/components/settings-user/passaword-user";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";
import { cn } from "@/lib/utils";

export default function SettingsUserPage() {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBackHome = () => {
    // Mesmo comportamento da página de histórico: "Home" = voltar
    router.back();
  };

  const isSettings = pathname.startsWith("/settings-user");

  return (
    <div className="min-h-[calc(100vh-56px)] w-full flex flex-col bg-background">
      <main className="flex-1 w-full flex justify-center px-4 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="w-full max-w-6xl space-y-8">
          {/* Cabeçalho da Página */}
          <div className="flex flex-col gap-2 pb-4 border-b border-border/40">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </span>
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground pl-12 max-w-2xl">
              Gerencie as preferências da sua conta e atualize suas informações
              de segurança.
            </p>
          </div>

          {/* Layout em Grid: 1 Coluna (Mobile) / 2 Colunas (Desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Bloco 1: Preferências */}
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm h-full">
              <PreferredModeSettings />
            </div>

            {/* Bloco 2: Senha */}
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm h-full">
              <PasswordUserSettings />
            </div>
          </div>
        </div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-around py-2">
          {/* Home -> voltar para a tela anterior */}
          <button
            type="button"
            onClick={handleGoBackHome}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Home</span>
          </button>

          {/* Configurações (página atual) */}
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              isSettings
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className={cn("h-5 w-5", isSettings && "scale-110")} />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
