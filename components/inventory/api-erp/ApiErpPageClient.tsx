"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plug,
  Zap,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Server,
  Code2,
  Lock,
} from "lucide-react";

export function ApiErpPageClient() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge
          variant="outline"
          className="px-3 py-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
          Módulo em Desenvolvimento
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Integração API via ERP
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Conecte o Countifly diretamente ao seu sistema de gestão (ERP). Sincronize catálogos de produtos,
          importe saldos esperados e envie os resultados da contagem em tempo real, sem necessidade de planilhas.
        </p>
      </div>

      {/* Status Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Acesso Antecipado Ativado na sua Conta
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Você possui permissão especial para visualizar os módulos em fase de testes do Countifly.
              Nossa equipe está finalizando os conectores de API e os protocolos de webhooks para os principais ERPs do mercado.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Badge className="bg-amber-600 text-white font-semibold text-xs px-3 py-1 uppercase tracking-wider">
            Versão Beta em Breve
          </Badge>
        </div>
      </div>

      {/* Grid de Conectores Planejados */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          Conectores em Construção
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Conector Bling */}
          <Card className="border border-border/60 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 font-bold text-lg">
                Bling
              </div>
              <CardTitle className="text-base font-bold">Bling ERP</CardTitle>
              <CardDescription className="text-xs">
                API REST v3 + Webhooks de Estoque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Importação automática de depósitos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Acerto de saldo direto no Bling</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Sincronização de EANs e GTINs</span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-border/40">
              <Badge variant="secondary" className="text-[10px] w-full justify-center">
                Conector Homologado
              </Badge>
            </CardFooter>
          </Card>

          {/* Conector Tiny */}
          <Card className="border border-border/60 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 font-bold text-lg">
                Tiny
              </div>
              <CardTitle className="text-base font-bold">Tiny ERP</CardTitle>
              <CardDescription className="text-xs">
                Sincronização via Token de API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Leitura rápida de SKUs e lotes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Balanço de estoque integrado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Histórico de divergências</span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-border/40">
              <Badge variant="secondary" className="text-[10px] w-full justify-center">
                Em Homologação
              </Badge>
            </CardFooter>
          </Card>

          {/* Conector Omie */}
          <Card className="border border-border/60 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2 font-bold text-lg">
                Omie
              </div>
              <CardTitle className="text-base font-bold">Omie ERP</CardTitle>
              <CardDescription className="text-xs">
                Conexão App Key & Secret
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Integração multi-filiais</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Ajuste fiscal e contábil de estoque</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Controle de grade e variações</span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-border/40">
              <Badge variant="secondary" className="text-[10px] w-full justify-center">
                Fase de Arquitetura
              </Badge>
            </CardFooter>
          </Card>

          {/* API REST Customizada */}
          <Card className="border border-border/60 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-2 font-bold text-lg">
                <Code2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-bold">API Própria</CardTitle>
              <CardDescription className="text-xs">
                Documentação OpenAPI / Swagger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Conecte qualquer sistema próprio</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Disparo de Webhooks em cada bip</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Chaves de API com escopos seguros</span>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-border/40">
              <Badge variant="secondary" className="text-[10px] w-full justify-center">
                Documentação em Breve
              </Badge>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Como vai funcionar */}
      <Card className="border border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Como funcionará a contagem via API?
          </CardTitle>
          <CardDescription>
            O fluxo completo eliminará arquivos manuais e sincronizará tudo em dois sentidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="font-semibold text-sm text-foreground">Conexão Segura</h4>
              <p className="text-xs text-muted-foreground">
                Você insere a chave de API do seu ERP. O Countifly testa a conectividade e sincroniza os depósitos e filiais disponíveis.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="font-semibold text-sm text-foreground">Bipagem com Estoque Real</h4>
              <p className="text-xs text-muted-foreground">
                Durante o inventário, os dados de saldo, custo e descrição vêm direto do ERP. Funciona online ou com cache para não parar se a internet oscilar.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="font-semibold text-sm text-foreground">Atualização com 1 Clique</h4>
              <p className="text-xs text-muted-foreground">
                Ao finalizar a conferência, basta aprovar os saldos para que o Countifly gere a movimentação de ajuste no estoque do ERP automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground">
            Enquanto preparamos a versão final, você pode utilizar a <strong>Contagem Planilha ERP (CSV)</strong> ou a <strong>Contagem Modular</strong>.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Voltar ao Dashboard</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/count-import">Contagem Planilha ERP</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
