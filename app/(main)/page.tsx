// app/(main)/page.tsx
"use client";

import {
  BarChart3,
  Users,
  PackageCheck,
  AlertTriangle,
  History,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function DashboardPrincipalPage() {
  // SIMULAÇÃO: No futuro, isso virá do useSession() e Prisma
  const sessionStatus = "active"; // ou "idle"

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* 1. CABEÇALHO E AÇÕES RÁPIDAS (Atalhos de Ação) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {sessionStatus === "active"
              ? "Monitoramento em Tempo Real • Sessão #LOJA-42"
              : "Bem-vindo de volta, Gestor."}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botões de Ação Rápida */}
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
          {sessionStatus === "active" ? (
            <Button variant="destructive">Encerrar Sessão</Button>
          ) : (
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Nova Contagem
            </Button>
          )}
        </div>
      </div>

      {/* 2. VISÃO OPERACIONAL (O "Agora") - Destaque Principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card: Progresso Geral */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Progresso Estimado
            </CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <Progress value={68} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              14.280 de 21.000 itens (Catálogo)
            </p>
          </CardContent>
        </Card>

        {/* Card: Equipe Ativa */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipe Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 Colaboradores</div>
            <div className="flex -space-x-2 mt-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="inline-block h-6 w-6 rounded-full bg-primary/20 ring-2 ring-background items-center justify-center text-[10px] font-bold"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="inline-block h-6 w-6 rounded-full bg-muted ring-2 ring-background items-center justify-center text-[10px] text-muted-foreground">
                +3
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Acuracidade (KPI Crítico) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Acuracidade Atual
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">92.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Itens batendo com o sistema
            </p>
          </CardContent>
        </Card>

        {/* Card: Divergência Crítica */}
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Itens Divergentes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">42 Itens</div>
            <p className="text-xs text-destructive/80 mt-1 font-medium">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* 3. KPIS DE PRECISÃO & TOP DIVERGÊNCIAS (O "Coração") */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Divergências Financeiras</CardTitle>
            <CardDescription>
              Produtos com maior impacto de sobra ou falta detectados agora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Cabeçalho da Lista Mockada */}
              <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="col-span-2">Produto</div>
                <div className="text-center">Sistêmico vs Real</div>
                <div className="text-right">Diferença</div>
              </div>

              {/* Item 1 - Falta Grave */}
              <div className="grid grid-cols-4 items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <div className="col-span-2">
                  <div className="font-medium text-sm">
                    Whisky Black Label 1L
                  </div>
                  <div className="text-xs text-muted-foreground">
                    SKU: 883921
                  </div>
                </div>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">50</span>{" "}
                  <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                  <strong>42</strong>
                </div>
                <div className="text-right font-bold text-red-600">-8 un</div>
              </div>

              {/* Item 2 - Sobra */}
              <div className="grid grid-cols-4 items-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="col-span-2">
                  <div className="font-medium text-sm">Cerveja Lata 350ml</div>
                  <div className="text-xs text-muted-foreground">
                    SKU: 102933
                  </div>
                </div>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">1200</span>{" "}
                  <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                  <strong>1250</strong>
                </div>
                <div className="text-right font-bold text-emerald-600">
                  +50 un
                </div>
              </div>

              {/* Item 3 - Falta Leve */}
              <div className="grid grid-cols-4 items-center p-3 bg-background rounded-lg border">
                <div className="col-span-2">
                  <div className="font-medium text-sm">
                    Chocolate Barra Ao Leite
                  </div>
                  <div className="text-xs text-muted-foreground">
                    SKU: 442112
                  </div>
                </div>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">100</span>{" "}
                  <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                  <strong>98</strong>
                </div>
                <div className="text-right font-bold text-red-400">-2 un</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 rounded-lg flex gap-3 items-start border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-500">
                  Itens Não Encontrados
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Existem 1.203 produtos no catálogo que ainda não foram bipados
                  nenhuma vez.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-amber-600"
              >
                Ver Lista
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. GESTÃO DE EQUIPE & FEED (Produtividade) */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Atividade & Ranking</CardTitle>
            <CardDescription>
              Quem está produzindo mais na sessão atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            {/* Ranking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                    1º
                  </div>
                  <div>
                    <p className="text-sm font-medium">Carlos Silva</p>
                    <p className="text-[10px] text-muted-foreground">
                      Estoque Central
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">1.240 itens</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                    2º
                  </div>
                  <div>
                    <p className="text-sm font-medium">Ana Pereira</p>
                    <p className="text-[10px] text-muted-foreground">
                      Loja Frente
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">980 itens</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                    3º
                  </div>
                  <div>
                    <p className="text-sm font-medium">Roberto Costa</p>
                    <p className="text-[10px] text-muted-foreground">Bebidas</p>
                  </div>
                </div>
                <Badge variant="secondary">850 itens</Badge>
              </div>
            </div>

            <div className="h-px bg-border my-4" />

            {/* Feed de Atividade Recente */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Últimos Movimentos (Ao Vivo)
              </h4>
              <div className="space-y-4 pl-2 border-l border-border">
                <div className="relative pl-4">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm">
                    <span className="font-semibold">Carlos</span> bipou{" "}
                    <span className="text-emerald-500 font-bold">+12 un</span>{" "}
                    de
                    <span className="text-muted-foreground"> Coca-Cola</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    há 10 segundos
                  </span>
                </div>

                <div className="relative pl-4">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-semibold">Ana</span> bipou{" "}
                    <span className="text-emerald-500 font-bold">+1 un</span> de
                    <span className="text-muted-foreground"> Shampoo Seda</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    há 32 segundos
                  </span>
                </div>
                <div className="relative pl-4">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-semibold">Roberto</span> reportou{" "}
                    <span className="text-red-500 font-bold">
                      Item Danificado
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    há 1 minuto
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
