// components/inventory/team/ManagerSessionDashboard.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Users,
  Activity,
  Play,
  StopCircle,
  RefreshCw,
  Copy,
  Loader2,
  BarChart2,
  Scan,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";
import { ImportUploadSection } from "@/components/inventory/Import/ImportUploadSection";

interface ManagerSessionDashboardProps {
  userId: number;
  onStartCounting?: (session: any, participant: any) => void;
  onSessionEnd?: () => void;
}

interface SessaoData {
  id: number;
  nome: string;
  codigo_acesso: string;
  status: string;
  criado_em: string;
  _count: {
    participantes: number;
    produtos: number;
    movimentos: number;
  };
}

interface ProductSessao {
  codigo_produto: string;
  codigo_barras: string | null;
  descricao: string;
  saldo_sistema: number;
  saldo_contado: number;
}

interface RelatorioFinal {
  total_produtos: number;
  total_contados: number;
  total_faltantes: number;
  discrepancias: Array<{
    codigo_produto: string;
    descricao: string;
    saldo_sistema: number;
    saldo_contado: number;
    diferenca: number;
  }>;
  participantes: number;
  duracao: string;
  data_finalizacao: string;
}

export function ManagerSessionDashboard({
  userId,
  onStartCounting,
  onSessionEnd,
}: ManagerSessionDashboardProps) {
  const [activeSession, setActiveSession] = useState<SessaoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [sessionProducts, setSessionProducts] = useState<ProductSessao[]>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioFinal | null>(
    null
  );
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showEndSessionConfirmation, setShowEndSessionConfirmation] =
    useState(false);

  // Estados para o ImportUploadSection
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<SessaoData | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions`);
      if (response.ok) {
        const data = await response.json();
        const current = data.find((s: any) => s.status === "ABERTA");
        setActiveSession(current || null);
      }
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
    }
  }, []);

  const loadSessionProducts = useCallback(async (sessionId?: number) => {
    const targetId = sessionId || activeSessionRef.current?.id;
    if (!targetId) return;
    try {
      const response = await fetch(`/api/session/${targetId}/products`);
      if (response.ok) {
        const data = await response.json();
        setSessionProducts(data);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
      if (activeSessionRef.current) loadSessionProducts();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadSessions, loadSessionProducts]);

  const missingItems = useMemo(() => {
    return sessionProducts
      .filter((p) => p.saldo_contado === 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema,
      }));
  }, [sessionProducts]);

  const handleCreateSession = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newSessionName || undefined }),
      });
      if (!response.ok) throw new Error("Falha ao criar sessão");
      toast({
        title: "Sessão Criada!",
        description: "Importe os produtos para começar.",
      });
      setNewSessionName("");
      loadSessions();
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

  const handleJoinAsParticipant = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeSession.codigo_acesso,
          name: "Anfitrião (Você)",
        }),
      });
      if (!response.ok) throw new Error("Erro ao entrar");
      const data = await response.json();
      onStartCounting?.(data.session, data.participant);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao iniciar contagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsEnding(true);
    setShowEndSessionConfirmation(false);
    try {
      const endResponse = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: "POST",
      });
      if (!endResponse.ok) throw new Error("Erro ao encerrar.");

      const reportResponse = await fetch(
        `/api/sessions/${activeSession.id}/report`
      );
      const reportData: RelatorioFinal = await reportResponse.json();

      setRelatorioFinal(reportData);
      setShowRelatorioModal(true);
      setActiveSession(null);
      setSessionProducts([]);

      onSessionEnd?.();
      loadSessions();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (!activeSession) {
    return (
      <Card className="max-w-md mx-auto border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur shadow-xl rounded-3xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Modo Equipe
          </CardTitle>
          <CardDescription>
            Crie uma sala para contagem colaborativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sessionName">Nome da Sessão (Opcional)</Label>
            <Input
              id="sessionName"
              placeholder="Ex: Inventário Dezembro"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
            />
          </div>
          <Button
            onClick={handleCreateSession}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Iniciar Sessão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-[400px] max-w-3xl mx-auto"
    >
      <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur shadow-xl rounded-3xl overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <span className="text-sm font-normal text-muted-foreground mr-2">
                Sessão:
              </span>
              {activeSession.nome}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Seção do Código */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Código de Acesso
            </p>
            <div
              className="text-4xl font-mono tracking-widest text-primary cursor-pointer hover:scale-105 transition-transform"
              onClick={() => copyToClipboard(activeSession.codigo_acesso)}
            >
              {activeSession.codigo_acesso || "---"}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(activeSession.codigo_acesso)}
              >
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button
              onClick={handleJoinAsParticipant}
              variant="default"
              className="flex-1 h-12"
              // CORRIGIDO AQUI: usando isImportLoading em vez de isImporting
              disabled={isLoading || isImportLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Scan className="mr-2 h-5 w-5" />
              )}
              Contar Agora
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowEndSessionConfirmation(true)}
              disabled={isEnding}
              className="h-12"
            >
              {isEnding ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <StopCircle className="mr-2 h-5 w-5" />
              )}
              Encerrar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background/50 p-4 rounded-xl text-center border">
              <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold">
                {activeSession._count.participantes}
              </div>
              <div className="text-xs text-muted-foreground">Pessoas</div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl text-center border">
              <Activity className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-semibold">
                {activeSession._count.movimentos}
              </div>
              <div className="text-xs text-muted-foreground">Bipes</div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl text-center border">
              <RefreshCw className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-semibold">
                {activeSession._count.produtos}
              </div>
              <div className="text-xs text-muted-foreground">Itens</div>
            </div>
          </div>

          {/* NOVA SEÇÃO DE IMPORTAÇÃO (REUTILIZADA) */}
          <div className="pt-4 border-t">
            <ImportUploadSection
              userId={userId}
              isLoading={isImportLoading}
              setIsLoading={setIsImportLoading}
              csvErrors={csvErrors}
              setCsvErrors={setCsvErrors}
              products={sessionProducts as any}
              onImportStart={() => {
                // Snapshot não é crítico aqui no multiplayer
              }}
              onImportSuccess={async () => {
                toast({
                  title: "Sucesso",
                  description: "Catálogo atualizado na sessão!",
                });
                loadSessions();
                loadSessionProducts();
              }}
              // URL Específica para Importação em Sessão de Equipe
              customApiUrl={`/api/sessions/${activeSession.id}/import`}
              hideEducationalCards={true}
            />
          </div>
        </CardContent>
      </Card>

      <FloatingMissingItemsButton
        itemCount={missingItems.length}
        onClick={() => setShowMissingModal(true)}
        dragConstraintsRef={containerRef}
      />
      <MissingItemsModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        items={missingItems}
      />

      <Dialog open={showRelatorioModal} onOpenChange={setShowRelatorioModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" /> Relatório Final
            </DialogTitle>
          </DialogHeader>
          {relatorioFinal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded-lg">
                  <div className="font-bold">
                    {relatorioFinal.total_produtos}
                  </div>
                  <div className="text-[10px]">Total</div>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <div className="font-bold text-green-600">
                    {relatorioFinal.total_contados}
                  </div>
                  <div className="text-[10px]">Contados</div>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <div className="font-bold text-red-500">
                    {relatorioFinal.total_faltantes}
                  </div>
                  <div className="text-[10px]">Faltantes</div>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                {relatorioFinal.discrepancias.map((d, i) => (
                  <div key={i} className="text-xs border-b pb-1 last:border-0">
                    <div className="font-bold">{d.descricao}</div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Sist: {d.saldo_sistema} | Cont: {d.saldo_contado}
                      </span>
                      <span className={d.diferenca < 0 ? "text-red-500" : ""}>
                        Dif: {d.diferenca}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showEndSessionConfirmation}
        onOpenChange={setShowEndSessionConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              A contagem será finalizada para todos e o relatório gerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
