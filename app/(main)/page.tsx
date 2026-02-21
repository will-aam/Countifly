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
import { Database, Loader2, Lock } from "lucide-react";
import { useUserModules } from "@/hooks/useUserModules";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function DashboardPrincipalPage() {
  // Hook de permissões para saber se o usuário tem o módulo 'livre' (Catálogo Global)
  const { hasModule, isAdmin, loading: modulesLoading } = useUserModules();

  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  // Acesso liberado se for Admin OU tiver o módulo 'livre'
  const hasAccess = isAdmin || hasModule("livre");

  useEffect(() => {
    async function fetchCatalogCount() {
      try {
        const res = await fetch("/api/dashboard/catalog-count");
        const data = await res.json();

        if (data.success) {
          setCatalogCount(data.count);
        }
      } catch (error) {
        console.error("Erro ao buscar contagem:", error);
      } finally {
        setLoadingCount(false);
      }
    }

    fetchCatalogCount();
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

      {/* Grid de Cards (Pronto para receber suas futuras ideias) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total de Itens no Catálogo Global */}
        <Card className="border-none shadow-md bg-card/50 overflow-hidden relative group">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Catálogo Global
              </CardTitle>
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  hasAccess
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Database className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-baseline gap-2">
              {loadingCount || modulesLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-1" />
              ) : (
                <>
                  <span
                    className={cn(
                      "text-3xl font-bold tracking-tight transition-all duration-300",
                      // O SEGREDO DO BLUR ESTÁ AQUI 👇
                      !hasAccess && "blur-[6px] select-none opacity-60",
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
              {modulesLoading || loadingCount ? (
                "Carregando informações..."
              ) : hasAccess ? (
                "Total de itens registrados na base de dados."
              ) : (
                <span className="flex items-center text-amber-600 dark:text-amber-500 font-medium">
                  <Lock className="h-3 w-3 mr-1.5" />
                  Módulo "Contagem Livre" necessário.
                </span>
              )}
            </CardDescription>

            {/* Borda de destaque lateral caso tenha acesso */}
            {hasAccess && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
