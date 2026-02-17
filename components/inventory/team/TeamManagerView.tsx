// components/inventory/team/TeamManagerView.tsx
/**
 * Responsabilidade:
 * 1. Interface principal para o gestor de equipe.
 * 2. Gerenciar estado global da sessão (dados da sessão, produtos, participantes).
 * 3. Fornecer ações para criar sessão, entrar como participante, encerrar sessão e limpar importação.
 * 4. Controlar navegação entre abas: Visão Geral, Importação e Contagem.
 * Segurança: Validação via Token JWT (implementada nas APIs). Somente o anfitrião pode acessar esta interface (verificado no frontend e backend).
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Upload, Scan, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Subcomponentes
import { ManagerSessionDashboard } from "./ManagerSessionDashboard";
import { TeamImportTab } from "./TeamImportTab";
import { ParticipantView } from "./ParticipantView";

interface TeamManagerViewProps {
  userId: number;
}

export function TeamManagerView({ userId }: TeamManagerViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Estado Global da Sessão
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionProducts, setSessionProducts] = useState<any[]>([]);

  // Estado para quando o Gestor entra para contar
  const [managerParticipantData, setManagerParticipantData] = useState<{
    id: number;
    nome: string;
  } | null>(null);

  // Estado do Modal de Limpeza
  const [showClearImportConfirmation, setShowClearImportConfirmation] =
    useState(false);

  // --- 1. CARREGAMENTO DE DADOS ---
  const loadSessionData = useCallback(async () => {
    try {
      const resSession = await fetch("/api/sessions");
      if (resSession.ok) {
        const data = await resSession.json();
        const openSession = data.find((s: any) => s.status === "ABERTA");
        setActiveSession(openSession || null);

        if (openSession) {
          const resProducts = await fetch(
            `/api/session/${openSession.id}/products`,
          );
          if (resProducts.ok) {
            const products = await resProducts.json();
            setSessionProducts(products);
          }
        } else {
          setSessionProducts([]);
          setManagerParticipantData(null);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados da equipe:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionData();
    const interval = setInterval(loadSessionData, 5000);
    return () => clearInterval(interval);
  }, [loadSessionData]);

  // --- 2. AÇÕES DO GESTOR ---

  const handleCreateSession = async (name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: name || undefined }),
      });
      if (!response.ok) throw new Error("Falha ao criar sessão");

      toast({
        title: "Sessão Criada!",
        description: "Agora importe o catálogo.",
      });
      await loadSessionData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = () => {
    setActiveSession(null);
    setSessionProducts([]);
    setManagerParticipantData(null);
    setActiveTab("overview");
    loadSessionData();
  };

  const handleJoinAsParticipant = async () => {
    if (!activeSession) return;

    if (managerParticipantData) {
      setActiveTab("counting");
      return;
    }

    try {
      const response = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeSession.codigo_acesso,
          name: "Anfitrião (Você)",
        }),
      });

      if (!response.ok) throw new Error("Erro ao entrar na contagem");

      const data = await response.json();
      setManagerParticipantData(data.participant);
      setActiveTab("counting");
      toast({ title: "Modo de Contagem Ativado" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao iniciar contagem.",
        variant: "destructive",
      });
    }
  };

  const handleImportSuccess = async () => {
    toast({ title: "Importação Concluída!" });
    await loadSessionData();
    setActiveTab("overview");
  };

  const handleClearImport = async () => {
    if (!activeSession) return;
    setShowClearImportConfirmation(false); // Fecha o modal

    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/import`, {
        method: "DELETE",
      });

      // ✅ Captura o corpo da resposta (mesmo em erro)
      const data = await response.json();

      if (!response.ok) {
        // ✅ Trata erro 409 (Conflict) especificamente
        if (response.status === 409) {
          toast({
            title: "❌ Não é possível limpar",
            description: data.error || "Já existem contagens nesta sessão.",
            variant: "destructive",
            duration: 6000, // Mostra por mais tempo
          });
        } else {
          toast({
            title: "Erro",
            description: data.error || "Falha ao limpar importação.",
            variant: "destructive",
          });
        }
        return; // Para aqui, não recarrega dados
      }

      // ✅ Sucesso
      toast({
        title: "✅ Catálogo limpo com sucesso.",
        description: "A sessão está pronta para nova importação.",
      });
      await loadSessionData();
    } catch (error: any) {
      console.error("Erro ao limpar importação:", error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentTab = activeSession ? activeTab : "overview";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-6 sm:pb-8">
      <Tabs
        value={currentTab}
        onValueChange={(val) => {
          if (activeSession) setActiveTab(val);
        }}
        className="space-y-6"
      >
        <div>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </TabsTrigger>

            <TabsTrigger
              value="import"
              className="hidden sm:flex items-center gap-2"
              disabled={!activeSession}
            >
              <Upload className="h-4 w-4" />
              Importar
            </TabsTrigger>

            <TabsTrigger
              value="counting"
              className="flex items-center gap-2"
              disabled={!activeSession || sessionProducts.length === 0}
            >
              <Scan className="h-4 w-4" />
              Contar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA 1: PAINEL GERAL --- */}
        <TabsContent value="overview" className="space-y-6">
          <ManagerSessionDashboard
            userId={userId}
            activeSession={activeSession}
            isLoadingSession={isLoading}
            sessionProducts={sessionProducts}
            onCreateSession={handleCreateSession}
            onJoinCounting={handleJoinAsParticipant}
            onEndSession={handleEndSession}
          />
        </TabsContent>

        {/* --- ABA 2: IMPORTAÇÃO --- */}
        <TabsContent value="import" className="space-y-6">
          {activeSession && (
            <TeamImportTab
              sessionId={activeSession.id}
              userId={userId}
              products={sessionProducts}
              onImportSuccess={handleImportSuccess}
              // AQUI: Passamos a função que ABRE o modal, não a que executa a limpeza direto
              onClearImport={() => setShowClearImportConfirmation(true)}
            />
          )}
        </TabsContent>

        {/* --- ABA 3: MINHA CONTAGEM --- */}
        <TabsContent value="counting" className="space-y-6">
          {activeSession && managerParticipantData ? (
            <ParticipantView
              sessionData={{
                session: {
                  id: activeSession.id,
                  codigo: activeSession.codigo_acesso,
                  nome: activeSession.nome,
                },
                participant: managerParticipantData,
              }}
              onLogout={() => setActiveTab("overview")}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
              <Scan className="h-12 w-12 mb-4 opacity-20" />
              <p>Inicie a contagem pelo Painel primeiro.</p>
              <Button variant="link" onClick={() => setActiveTab("overview")}>
                Voltar ao Painel
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Confirmação Limpar Importação */}
      <AlertDialog
        open={showClearImportConfirmation}
        onOpenChange={setShowClearImportConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Catálogo da Sessão?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {/* ✅ asChild permite estrutura customizada */}
              <div>
                {activeSession && activeSession._count?.movimentos > 0 ? (
                  <div className="space-y-2">
                    <p className="font-bold text-red-600 dark:text-red-400">
                      ❌ Não é possível limpar esta sessão.
                    </p>
                    <p>
                      Há{" "}
                      <strong>
                        {activeSession._count.movimentos} registros
                      </strong>{" "}
                      de contagem salvos.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Para limpar, você precisa:
                    </p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside ml-2">
                      <li>Encerrar a sessão (gera relatório final)</li>
                      <li>Criar uma nova sessão</li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>
                      Isso removerá todos os produtos importados desta sessão
                      específica.
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ Só é possível limpar se não houver contagens
                      registradas.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {activeSession && activeSession._count?.movimentos > 0
                ? "Entendi"
                : "Cancelar"}
            </AlertDialogCancel>

            {(!activeSession || activeSession._count?.movimentos === 0) && (
              <AlertDialogAction
                onClick={handleClearImport}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmar Limpeza
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
