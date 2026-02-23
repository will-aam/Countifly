// app/(main)/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Database,
  Loader2,
  Lock,
  Users,
  ArrowRight,
  Play,
  Building2,
} from "lucide-react";
import { useUserModules } from "@/hooks/useUserModules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DashboardPrincipalPage() {
  const router = useRouter();
  const { hasModule, isAdmin, loading: modulesLoading } = useUserModules();

  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Verificações de permissão
  const hasFreeAccess = isAdmin || hasModule("livre");
  const hasTeamAccess = isAdmin || hasModule("sala");
  const hasEmpresaAccess = isAdmin || hasModule("empresa");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Promise.all permite buscar as duas APIs ao mesmo tempo para ser mais rápido
        const [catalogRes, sessionRes] = await Promise.all([
          fetch("/api/dashboard/catalog-count"),
          fetch("/api/dashboard/active-session"),
        ]);

        const catalogData = await catalogRes.json();
        const sessionData = await sessionRes.json();

        if (catalogData.success) setCatalogCount(catalogData.count);
        if (sessionData.success) setActiveSession(sessionData.activeSession);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do seu sistema de inventário.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* =========================================================
            CARD 1: Catálogo Global
            ========================================================= */}
        <Card className="border-none shadow-md bg-card/50 overflow-hidden relative group flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Catálogo Global
              </CardTitle>
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  hasFreeAccess
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Database className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              {loadingData || modulesLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-1" />
              ) : (
                <>
                  <span
                    className={cn(
                      "text-3xl font-bold tracking-tight transition-all duration-300",
                      !hasFreeAccess && "blur-[6px] select-none opacity-60",
                    )}
                  >
                    {catalogCount?.toLocaleString("pt-BR") || 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    produtos fixos
                  </span>
                </>
              )}
            </div>

            <CardDescription className="mt-3 text-xs flex items-center h-4">
              {modulesLoading || loadingData ? (
                "Carregando informações..."
              ) : hasFreeAccess ? (
                "Total de itens registrados na base de dados."
              ) : (
                <span className="flex items-center text-amber-600 dark:text-amber-500 font-medium">
                  <Lock className="h-3 w-3 mr-1.5" />
                  Módulo "Contagem Livre" necessário.
                </span>
              )}
            </CardDescription>

            {hasFreeAccess && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
            )}
          </CardContent>
        </Card>

        {/* =========================================================
            CARD 2: Acesso Rápido - Modo Equipe
            ========================================================= */}
        <CardContent className="flex-1 flex flex-col justify-between h-full">
          {loadingData || modulesLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-1" />
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Textos explicativos ou status da sala */}
              {!hasTeamAccess ? (
                // Texto para quem não tem acesso (Explicativo)
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-foreground">
                      Contagem Colaborativa
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Crie uma sala para que múltiplos colaboradores contem o
                    mesmo estoque juntos em tempo real.
                  </p>
                </div>
              ) : activeSession ? (
                // Texto para quem tem acesso E tem sessão ativa
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {/* Bolinha verde pulsando = Ao Vivo */}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-lg font-bold tracking-tight text-foreground truncate">
                      {activeSession.nome}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Código:{" "}
                    <strong className="text-foreground tracking-wider">
                      {activeSession.codigo_acesso}
                    </strong>
                  </p>
                </div>
              ) : (
                // Texto para quem tem acesso MAS NÃO tem sessão ativa
                <div>
                  <span className="text-xl font-bold tracking-tight text-muted-foreground">
                    Nenhuma sessão
                  </span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Nenhuma contagem em equipe aberta no momento.
                  </p>
                </div>
              )}

              {/* Botões de Ação */}
              {!hasTeamAccess ? (
                <Button
                  className="w-full h-9 text-sm border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/30 hover:text-muted-foreground cursor-not-allowed"
                  variant="outline"
                  disabled
                >
                  <Lock className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Módulo Bloqueado
                </Button>
              ) : activeSession ? (
                <Button
                  className="w-full h-9 text-sm"
                  variant="default"
                  onClick={() => router.push("/team")}
                >
                  Gerenciar Sala
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="w-full h-9 text-sm border-dashed"
                  variant="outline"
                  onClick={() => router.push("/team")}
                >
                  <Play className="h-3.5 w-3.5 mr-2" />
                  Iniciar Sessão
                </Button>
              )}
            </div>
          )}

          {hasTeamAccess && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
          )}
        </CardContent>

        {/* =========================================================
            CARD 3: Gestão de Empresas (Upsell/Atalho)
            ========================================================= */}
        <CardContent className="flex-1 flex flex-col justify-between h-full">
          {loadingData || modulesLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-1" />
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Texto sempre visível e explicativo */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    Vincular Contagem
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Organize e filtre seus relatórios cadastrando clientes ou
                  filiais específicas para cada contagem.
                </p>
              </div>

              {/* Botão condicional */}
              {!hasEmpresaAccess ? (
                <Button
                  className="w-full h-9 text-sm border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/30 hover:text-muted-foreground cursor-not-allowed"
                  variant="outline"
                  disabled
                >
                  <Lock className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Cadastrar empresa
                </Button>
              ) : (
                <Button
                  className="w-full h-9 text-sm"
                  variant="outline"
                  onClick={() => router.push("/settings-user?tab=companies")}
                >
                  Cadastrar Empresa
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}

          {hasEmpresaAccess && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
          )}
        </CardContent>
      </div>
    </div>
  );
}
