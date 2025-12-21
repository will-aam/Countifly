// components/inventory/TeamManagerView.tsx
/**
 * Descrição: Visão Dedicada para o Anfitrião de Equipe.
 * Responsabilidade:
 * 1. Orquestrar o fluxo de gerenciamento de sessões.
 * 2. Fornecer acesso rápido ao Dashboard, Contagem (como Anfitrião) e Histórico.
 */

"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ManagerSessionDashboard } from "./ManagerSessionDashboard";
import { ParticipantView } from "./ParticipantView";
import { HistoryTab } from "./HistoryTab";
import {
  ArrowLeft,
  LayoutDashboard,
  Scan,
  History as HistoryIcon,
  Loader2,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeamManagerViewProps {
  userId: number;
  onBack: () => void; // Função para voltar ao menu principal
  // Props para o Histórico (passadas do pai)
  historyData: {
    history: any[];
    loadHistory: () => Promise<void>;
    handleDeleteHistoryItem: (id: number) => Promise<void>;
  };
}

export function TeamManagerView({
  userId,
  onBack,
  historyData,
}: TeamManagerViewProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Estado para controlar a sessão ativa e permitir que o Anfitrião conte
  const [managerSessionData, setManagerSessionData] = useState<any>(null);
  const [isJoiningAsManager, setIsJoiningAsManager] = useState(false);

  // NOVO ESTADO: Controla se o gestor já terminou a parte dele
  const [hasManagerFinished, setHasManagerFinished] = useState(false);

  /**
   * Função para buscar a sessão ativa e registrar o Anfitrião como participante
   * para que ele possa usar a aba "Contar".
   */
  const prepareManagerCounting = useCallback(async () => {
    // Se o gestor já finalizou explicitamente, não faz auto-join
    if (hasManagerFinished) return;

    setIsJoiningAsManager(true);
    try {
      // 1. Busca a sessão aberta do Anfitrião
      const response = await fetch(`/api/inventory/${userId}/session`);
      if (!response.ok) return;

      const data = await response.json();
      const activeSession = data.find((s: any) => s.status === "ABERTA");

      if (!activeSession) {
        toast({
          title: "Nenhuma Sessão Ativa",
          description: "Crie uma sessão na aba Painel antes de contar.",
          variant: "destructive",
        });
        setActiveTab("dashboard"); // Volta para o dashboard
        return;
      }

      // 2. Auto-registro do Anfitrião na sessão (via API pública de Join)
      const joinResponse = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeSession.codigo_acesso,
          name: "Anfitrião", // Nome especial para identificar
        }),
      });

      if (!joinResponse.ok) throw new Error("Erro ao entrar na própria sessão");

      const sessionData = await joinResponse.json();
      setManagerSessionData(sessionData);
    } catch (error) {
      console.error("Erro ao preparar contagem do Anfitrião:", error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar modo de contagem.",
        variant: "destructive",
      });
    } finally {
      setIsJoiningAsManager(false);
    }
  }, [userId, hasManagerFinished]);

  // Monitora a troca de abas
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "count") {
      prepareManagerCounting();
    }
  };

  // Função para quando o gestor decide reabrir sua contagem manualmente
  const handleReopenCount = () => {
    setHasManagerFinished(false);
    // Pequeno delay para o estado atualizar antes de chamar a função
    setTimeout(() => {
      prepareManagerCounting();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho do Modo Equipe */}
      <div className="border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="font-semibold text-sm uppercase tracking-wider text-primary">
            Gerenciamento de Sala
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="count" className="gap-2">
              <Scan className="w-4 h-4" />
              Contar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <HistoryIcon className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* --- ABA 1: PAINEL (CRIAR, MONITORAR, ENCERRAR) --- */}
          <TabsContent
            value="dashboard"
            className="space-y-4 animate-in fade-in-50 duration-300"
          >
            <ManagerSessionDashboard userId={userId} />
          </TabsContent>

          {/* --- ABA 2: CONTAR (PARTICIPANT VIEW PARA O Anfitrião) --- */}
          <TabsContent
            value="count"
            className="animate-in fade-in-50 duration-300"
          >
            {/* CENÁRIO A: Gestor Finalizou */}
            {hasManagerFinished ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Contagem Finalizada
                </h3>
                <p className="text-muted-foreground mb-6 text-center max-w-sm">
                  Você encerrou sua participação pessoal nesta sessão. Seus
                  dados já foram computados.
                </p>
                <Button onClick={handleReopenCount} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reabrir Minha Contagem
                </Button>
              </div>
            ) : isJoiningAsManager ? (
              // CENÁRIO B: Carregando
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Conectando à sessão...</p>
              </div>
            ) : managerSessionData ? (
              // CENÁRIO C: Contando
              <ParticipantView
                sessionData={managerSessionData}
                onLogout={() => {
                  setHasManagerFinished(true); // Marca que acabou
                  setActiveTab("dashboard"); // Volta pro painel
                }}
              />
            ) : (
              // CENÁRIO D: Erro / Sem sessão
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground mb-4">
                  Nenhuma sessão ativa encontrada.
                </p>
                <Button onClick={() => setActiveTab("dashboard")}>
                  Ir para o Painel e Criar Sessão
                </Button>
              </div>
            )}
          </TabsContent>

          {/* --- ABA 3: HISTÓRICO --- */}
          <TabsContent
            value="history"
            className="animate-in fade-in-50 duration-300"
          >
            <HistoryTab
              userId={userId}
              history={historyData.history}
              loadHistory={historyData.loadHistory}
              handleDeleteHistoryItem={historyData.handleDeleteHistoryItem}
              page={0}
              setPage={() => {}}
              totalPages={1}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
