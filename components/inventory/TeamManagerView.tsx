// components/inventory/TeamManagerView.tsx
/**
 * Descrição: Visão Dedicada para o Anfitrião de Equipe.
 * Responsabilidade: Orquestrar o fluxo entre o Dashboard e a Contagem do Gestor.
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
} from "lucide-react";

interface TeamManagerViewProps {
  userId: number; // ID do usuário Gestor
  onBack: () => void;
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
  const [isConnecting, setIsConnecting] = useState(false);

  // Este estado guarda os dados da sessão que o gestor CRIOU ou gerencia
  const [managerSessionData, setManagerSessionData] = useState<{
    session: { id: number; codigo: string; nome: string };
    participant: { id: number; nome: string };
  } | null>(null);

  // Função para quando o gestor clica em "Contar como Anfitrião" no Dashboard
  const handleStartCounting = useCallback((session: any, participant: any) => {
    setManagerSessionData({
      session: {
        id: session.id,
        codigo: session.codigo,
        nome: session.nome || `Sessão #${session.id}`,
      },
      participant: {
        id: participant.id,
        nome: participant.nome,
      },
    });
    setActiveTab("counting");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">
              Modo Multiplayer
            </h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-7xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" /> Painel
              </TabsTrigger>
              <TabsTrigger
                value="counting"
                className="gap-2"
                disabled={!managerSessionData}
              >
                <Scan className="h-4 w-4" /> Contar
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <HistoryIcon className="h-4 w-4" /> Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          {/* --- ABA 1: DASHBOARD --- */}
          <TabsContent value="dashboard" className="mt-0">
            <ManagerSessionDashboard
              userId={userId}
              onStartCounting={handleStartCounting}
            />
          </TabsContent>

          {/* --- ABA 2: CONTANDO (Visão do Participante para o Gestor) --- */}
          <TabsContent value="counting" className="mt-0">
            {managerSessionData ? (
              <ParticipantView
                sessionData={managerSessionData}
                onLogout={() => {
                  setManagerSessionData(null);
                  setActiveTab("dashboard");
                }}
              />
            ) : (
              <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">
                  Selecione uma sessão no painel para começar.
                </p>
              </div>
            )}
          </TabsContent>

          {/* --- ABA 3: HISTÓRICO --- */}
          <TabsContent value="history" className="mt-0">
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
