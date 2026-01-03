// Essa página permite ao usuário ajustar suas preferências pessoais e gerenciar a segurança da conta.

"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { DisplayNameSettings } from "@/components/settings-user/display-name-settings";
import { PasswordUserSettings } from "@/components/settings-user/passaword-user";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

export const dynamic = "force-dynamic";

export default function SettingsUserPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [bootLoading, setBootLoading] = useState(true);

  // Bootstrap do usuário: tenta sessionStorage, se não tiver, chama /api/user/me
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const savedUserId = sessionStorage.getItem("currentUserId");
        if (savedUserId) {
          // Já temos userId no sessionStorage, segue normalmente
          setBootLoading(false);
          return;
        }

        // Se não tem no sessionStorage, tenta recuperar do servidor (JWT no cookie)
        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login?from=/settings-user");
            return;
          }
          throw new Error("Falha ao carregar usuário autenticado.");
        }

        const data = await res.json();
        if (data?.success && data.id) {
          // Reidrata o sessionStorage para futuras montagens
          sessionStorage.setItem("currentUserId", String(data.id));
          if (data.preferredMode) {
            sessionStorage.setItem("preferredMode", data.preferredMode);
          }
        } else {
          router.replace("/login?from=/settings-user");
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário em /settings-user:", error);
        router.replace("/login?from=/settings-user");
        return;
      } finally {
        setBootLoading(false);
      }
    };

    bootstrapUser();
  }, [router]);

  if (bootLoading) {
    return null;
  }

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
            {/* Card: Página inicial preferida (topo, esquerda) */}
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm h-full">
              <PreferredModeSettings />
            </div>

            {/* Card: Senha (topo, direita) */}
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm h-full">
              <PasswordUserSettings />
            </div>

            {/* Card: Nome exibido (linha de baixo, ocupando largura total no desktop) */}
            <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm h-full lg:col-span-2">
              <DisplayNameSettings />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
