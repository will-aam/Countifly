// app/(main)/page.tsx

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Database,
  Lock,
  Users,
  ArrowRight,
  Play,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPrincipalPage() {
  // 2. Busca a Autenticação diretamente no Servidor
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    return null; // O middleware do Next.js já deve lidar com o redirecionamento
  }

  // 3. Busca todos os dados em PARALELO direto do Banco de Dados
  // Substituímos os "fetch" nas APIs por consultas diretas no Prisma
  const [user, catalogCount, activeSession] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        tipo: true,
        modulo_livre: true,
        modulo_sala: true,
        modulo_empresa: true,
      },
    }),
    prisma.produto.count({
      where: {
        usuario_id: userId,
        tipo_cadastro: "FIXO", // Ajuste isso se sua API contava diferente
      },
    }),
    prisma.sessao.findFirst({
      where: {
        anfitriao_id: userId,
        status: "ABERTA", // Verifica se existe sessão ativa
      },
    }),
  ]);

  // 4. Verificações de permissão (agora calculadas no servidor)
  const isAdmin = user?.tipo === "ADMIN";
  const hasFreeAccess = isAdmin || user?.modulo_livre;
  const hasTeamAccess = isAdmin || user?.modulo_sala;
  const hasEmpresaAccess = isAdmin || user?.modulo_empresa;

  // 5. Renderização (sem nenhum estado de loading!)
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
            </div>

            <CardDescription className="mt-3 text-xs flex items-center h-4">
              {hasFreeAccess ? (
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
        <Card className="border-none shadow-md bg-card/50 overflow-hidden relative group flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gestão de Sala
              </CardTitle>
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  hasTeamAccess
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between h-full">
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Textos explicativos ou status da sala */}
              {!hasTeamAccess ? (
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
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
                  asChild
                  className="w-full h-9 text-sm"
                  variant="default"
                >
                  <Link href="/team">
                    Gerenciar Sala
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full h-9 text-sm border-dashed"
                  variant="outline"
                >
                  <Link href="/team">
                    <Play className="h-3.5 w-3.5 mr-2" />
                    Iniciar Sessão
                  </Link>
                </Button>
              )}
            </div>

            {hasTeamAccess && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
            )}
          </CardContent>
        </Card>

        {/* =========================================================
            CARD 3: Gestão de Empresas (Upsell/Atalho)
            ========================================================= */}
        <Card className="border-none shadow-md bg-card/50 overflow-hidden relative group flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Múltiplas Empresas
              </CardTitle>
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  hasEmpresaAccess
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between h-full">
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Texto explicativo */}
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

              {/* Botões de Ação */}
              {!hasEmpresaAccess ? (
                <Button
                  className="w-full h-9 text-sm border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/30 hover:text-muted-foreground cursor-not-allowed"
                  variant="outline"
                  disabled
                >
                  <Lock className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Módulo Bloqueado
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full h-9 text-sm"
                  variant="outline"
                >
                  <Link href="/settings-user?tab=companies">
                    Cadastrar Empresa
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>

            {hasEmpresaAccess && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 rounded-l-lg" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
