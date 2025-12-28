// components/inventory/TeamManagerView.tsx
/**
 * Descrição: Visão Dedicada para o Anfitrião de Equipe (Simplificada).
 * Responsabilidade: Orquestrar o Dashboard de sessões e a Contagem do Gestor.
 */

"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ManagerSessionDashboard } from "./ManagerSessionDashboard";
import { ParticipantView } from "./ParticipantView";
import { ArrowLeft, LayoutDashboard, Scan } from "lucide-react";

interface TeamManagerViewProps {
  userId: number;
  onBack: () => void;
}

export function TeamManagerView({ userId, onBack }: TeamManagerViewProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Estado que armazena os dados da sessão quando o gestor entra para contar
  const [managerSessionData, setManagerSessionData] = useState<{
    session: { id: number; codigo: string; nome: string };
    participant: { id: number; nome: string };
  } | null>(null);

  // Função disparada pelo Dashboard quando o gestor clica em "Contar como Anfitrião"
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

  // Quando a sessão é encerrada no Dashboard, limpamos o estado e voltamos pro Painel
  const handleSessionEnd = useCallback(() => {
    setManagerSessionData(null);
    setActiveTab("dashboard");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex justify-center">
            {/* Abas simplificadas para 2 colunas */}
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" /> Painel
              </TabsTrigger>
              <TabsTrigger
                value="counting"
                className="gap-2"
                disabled={!managerSessionData}
              >
                <Scan className="h-4 w-4" /> Minha Contagem
              </TabsTrigger>
            </TabsList>
          </div>

          {/* --- ABA 1: PAINEL DE CONTROLE --- */}
          <TabsContent value="dashboard" className="mt-0 animate-in fade-in-50">
            <ManagerSessionDashboard
              userId={userId}
              onStartCounting={handleStartCounting}
              onSessionEnd={handleSessionEnd}
            />
          </TabsContent>

          {/* --- ABA 2: MINHA CONTAGEM --- */}
          <TabsContent value="counting" className="mt-0 animate-in fade-in-50">
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
                  Inicie a contagem no painel para ativar esta aba.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
