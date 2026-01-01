// app/(main)/settings-user/page.tsx
// Essa pagina permite ao usuário ajustar suas preferências pessoais e gerenciar a segurança da conta.

"use client";

import { Lock } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { PasswordUserSettings } from "@/components/settings-user/passaword-user";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export default function SettingsUserPage() {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBackHome = () => {
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
    </div>
  );
}
