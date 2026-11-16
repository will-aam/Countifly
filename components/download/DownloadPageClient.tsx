"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  CheckCircle2,
  Clock,
  HardDrive,
  ShieldCheck,
  Zap,
  Smartphone,
  Terminal,
  Laptop,
} from "lucide-react";

export function DownloadPageClient() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge variant="outline" className="px-3 py-1 border-primary/30 bg-primary/5 text-primary text-xs font-semibold">
          Aplicativos Nativos Countifly
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Baixar o Countifly para Desktop
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Instale o Countifly no seu computador para contar estoque com máxima performance,
          leitura instantânea de códigos de barras via USB/Bluetooth e operação offline ininterrupta.
        </p>
      </div>

      {/* Grid de Plataformas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. WINDOWS (Primeiro Lançamento - Em breve) */}
        <Card className="border-2 border-primary/40 shadow-lg relative flex flex-col justify-between bg-card hover:border-primary transition-all">
          <div className="absolute -top-3 right-4">
            <Badge className="bg-blue-600 text-white font-bold text-[10px] tracking-wide uppercase px-2.5 py-0.5 shadow-sm">
              Primeiro Lançamento
            </Badge>
          </div>

          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Monitor className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Windows</CardTitle>
            <CardDescription className="text-xs">
              Instalador nativo 64-bit (.exe)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-muted-foreground flex-1">
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Compatível com Windows 10 e Windows 11 (64-bit)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Suporte nativo a leitores de código de barras USB/sem fio</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cache local ultrarrápido com operação offline</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-3">
            <Button
              variant="outline"
              disabled
              className="w-full font-bold shadow-sm text-xs"
            >
              <Clock className="h-4 w-4 mr-2" />
              Disponível em breve (.exe)
            </Button>
          </CardFooter>
        </Card>

        {/* 2. macOS (Em Breve) */}
        <Card className="border border-border/60 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-2">
                  <Laptop className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock className="h-3 w-3 mr-1" /> Em breve
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold">macOS</CardTitle>
              <CardDescription className="text-xs">
                Pacote .dmg para Apple Mac
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Otimizado para arquitetura Apple Silicon (chips M1, M2, M3, M4) e processadores Intel.</p>
              <p className="text-[11px] text-muted-foreground/80">Integração com atalhos do sistema e interface elegante.</p>
            </CardContent>
          </div>

          <CardFooter className="pt-3">
            <Button variant="outline" disabled className="w-full text-xs">
              Em Desenvolvimento
            </Button>
          </CardFooter>
        </Card>

        {/* 3. Linux (Em Breve) */}
        <Card className="border border-border/60 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-2">
                  <Terminal className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                  <Clock className="h-3 w-3 mr-1" /> Em breve
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold">Linux</CardTitle>
              <CardDescription className="text-xs">
                Formatos .AppImage e .deb
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Compatível com as principais distribuições: Ubuntu, Debian, Fedora e derivadas.</p>
              <p className="text-[11px] text-muted-foreground/80">Excelente estabilidade para terminais de conferência e galpões.</p>
            </CardContent>
          </div>

          <CardFooter className="pt-3">
            <Button variant="outline" disabled className="w-full text-xs">
              Em Desenvolvimento
            </Button>
          </CardFooter>
        </Card>

        {/* 4. Android (Em Breve) */}
        <Card className="border border-border/60 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-2">
                  <Smartphone className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300">
                  <Clock className="h-3 w-3 mr-1" /> Em breve
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold">Android (Coletor)</CardTitle>
              <CardDescription className="text-xs">
                Pacote .apk para coletores e smartphones
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Projetado para coletores dedicados (Zebra, Honeywell, Datalogic) e celulares Android.</p>
              <p className="text-[11px] text-muted-foreground/80">Leitura a laser integrada e interface ultrarrápida para contagens de campo.</p>
            </CardContent>
          </div>

          <CardFooter className="pt-3">
            <Button variant="outline" disabled className="w-full text-xs">
              Em Desenvolvimento
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Seção Informativa: Vantagens da Versão Desktop */}
      <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" /> Por que usar o aplicativo desktop?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="space-y-1 p-3 rounded-xl bg-card border border-border/50">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-primary" /> Sem interferência do navegador
            </p>
            <p>O aplicativo roda em janela própria, sem barras de endereços, atalhos de navegador conflitantes ou abas acidentais.</p>
          </div>

          <div className="space-y-1 p-3 rounded-xl bg-card border border-border/50">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Resposta Imediata na Bipagem
            </p>
            <p>Comunicação direta com leitores de código de barras USB e sem fio, sem perda de caracteres em bipagens velozes.</p>
          </div>

          <div className="space-y-1 p-3 rounded-xl bg-card border border-border/50">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Estabilidade e Segurança
            </p>
            <p>Armazenamento local persistente para garantir que nenhum item contado seja perdido durante o inventário.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
