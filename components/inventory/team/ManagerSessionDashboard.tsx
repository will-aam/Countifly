// components/inventory/team/ManagerSessionDashboard.tsx
/**
 * ManagerSessionDashboard.tsx
 * - Componente principal do painel do Gestor durante uma sessão ativa.
 * - Responsável por mostrar o código de acesso, estatísticas em tempo real e ações.
 * - ✅ NOVO: Suporta importação com SSE e lista detalhada de erros.
 */
"use client";

import { useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  CheckCircle,
  Scan,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

interface ManagerSessionDashboardProps {
  userId: number;
  activeSession: any;
  isLoadingSession: boolean;
  onCreateSession: (name: string) => void;
  onJoinCounting: () => void;
  onEndSession: () => void;
  sessionProducts: any[];
  onCheckPending?: () => void;
  pendingCheck?: {
    loading: boolean;
    canClose: boolean;
    warning: string | null;
  } | null;
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
  activeSession,
  isLoadingSession,
  onCreateSession,
  onJoinCounting,
  onEndSession,
  sessionProducts,
  onCheckPending,
  pendingCheck,
}: ManagerSessionDashboardProps) {
  const [newSessionName, setNewSessionName] = useState("");
  const [isEnding, setIsEnding] = useState(false);

  // Modais
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioFinal | null>(
    null,
  );
  const [showEndSessionConfirmation, setShowEndSessionConfirmation] =
    useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const missingItems = useMemo(() => {
    // Garante que sessionProducts é array
    if (!Array.isArray(sessionProducts)) return [];

    return sessionProducts
      .filter((p) => p.saldo_contado === 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema,
      }));
  }, [sessionProducts]);

  const handleCreateSession = () => {
    onCreateSession(newSessionName);
    setNewSessionName("");
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
        `/api/sessions/${activeSession.id}/report`,
      );
      const reportData: RelatorioFinal = await reportResponse.json();

      setRelatorioFinal(reportData);
      setShowRelatorioModal(true);
      onEndSession();
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
      <Card className="max-w-md mx-auto mt-8 border-dashed ">
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
            disabled={isLoadingSession}
            className="w-full"
          >
            {isLoadingSession ? (
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
    <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <Card className="flex-1 w-full">
          <CardHeader className="text-center pb-2">
            <div className="flex flex-col items-center gap-2">
              <CardTitle className="text-xl">{activeSession.nome}</CardTitle>
              <div
                className={`text-xs px-3 py-1 rounded-full font-bold ${
                  sessionProducts.length > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {sessionProducts.length > 0
                  ? "Catálogo Ativo"
                  : "Aguardando Importação"}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                Código de Acesso
              </p>
              <div
                className="text-6xl font-mono tracking-widest text-primary cursor-pointer"
                onClick={() => copyToClipboard(activeSession.codigo_acesso)}
              >
                {activeSession.codigo_acesso || "---"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => copyToClipboard(activeSession.codigo_acesso)}
              >
                <Copy className="h-3 w-3 mr-1" /> Copiar Código
              </Button>
            </div>

            <div className="border-t border-border/50 w-full" />

            <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
              <Button
                onClick={onJoinCounting}
                variant="default"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoadingSession || sessionProducts.length === 0}
              >
                {isLoadingSession ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Scan className="mr-2 h-5 w-5" />
                )}
                Contar Agora
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onCheckPending?.();
                  setShowEndSessionConfirmation(true);
                }}
                disabled={isEnding}
                className="w-full h-12"
              >
                {isEnding ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-5 w-5" />
                )}
                Encerrar Sessão
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
            <div className="bg-background border rounded-lg px-5 py-4 flex-1 min-w-[170px] shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-4xl font-semibold tracking-tight leading-none">
                    {activeSession._count?.participantes || 0}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-lg border bg-muted/40 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 h-px w-full bg-border/60" />
              <div className="mt-3 text-xs text-muted-foreground">
                Participantes na sessão
              </div>
            </div>

            <div className="bg-background border rounded-lg px-5 py-4 flex-1 min-w-[170px] shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-4xl font-semibold tracking-tight leading-none">
                    {activeSession._count?.movimentos || 0}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-lg border bg-muted/40  flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-4 h-px w-full bg-border/60" />
              <div className="mt-3 text-xs text-muted-foreground">
                Registros na sessão
              </div>
            </div>

            <div className="bg-background border rounded-lg px-5 py-4 flex-1 min-w-[170px] shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-4xl font-semibold tracking-tight leading-none">
                    {activeSession._count?.produtos || 0}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-lg border bg-muted/40 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-4 h-px w-full bg-border/60" />
              <div className="mt-3 text-xs text-muted-foreground">
                Itens no catálogo
              </div>
            </div>
          </div>
        </div>
      </div>

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
        <DialogContent className="max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" /> Relatório Final
            </DialogTitle>
          </DialogHeader>
          {relatorioFinal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-muted rounded-lg flex flex-col justify-center">
                  <div className="text-2xl font-bold">
                    {relatorioFinal.total_produtos}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    Total
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg flex flex-col justify-center">
                  <div className="text-2xl font-bold text-green-600">
                    {relatorioFinal.total_contados}
                  </div>
                  <div className="text-[10px] text-green-700/70 dark:text-green-400 uppercase">
                    Contados
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg flex flex-col justify-center">
                  <div className="text-2xl font-bold text-red-500">
                    {relatorioFinal.total_faltantes}
                  </div>
                  <div className="text-[10px] text-red-700/70 dark:text-red-400 uppercase">
                    Faltantes
                  </div>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                {relatorioFinal.discrepancias.map((d, i) => (
                  <div
                    key={i}
                    className="text-xs border-b pb-2 mb-2 last:border-0 last:mb-0 last:pb-0"
                  >
                    <div className="font-bold mb-1">{d.descricao}</div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Sist: {d.saldo_sistema} | Cont: {d.saldo_contado}
                      </span>
                      <span
                        className={`font-bold ${
                          d.diferenca < 0 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        Dif: {d.diferenca > 0 ? "+" : ""}
                        {d.diferenca}
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
            <AlertDialogTitle>Encerrar Sessão de Contagem?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {pendingCheck?.loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando sincronização...
                  </div>
                )}

                {pendingCheck?.warning && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {pendingCheck.warning}
                    </p>
                  </div>
                )}

                {pendingCheck?.canClose && !pendingCheck.loading && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-200" />
                      Todos os dados estão sincronizados. Seguro encerrar.
                    </p>
                  </div>
                )}

                <p>Isso irá:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Bloquear novos registros de contagem</li>
                  <li>Gerar o relatório final consolidado</li>
                  <li>Salvar no histórico</li>
                </ul>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              disabled={pendingCheck?.loading || !pendingCheck?.canClose}
              className="bg-red-600 hover:bg-red-700"
            >
              {pendingCheck?.loading
                ? "Verificando..."
                : pendingCheck?.canClose
                  ? "Confirmar Encerramento"
                  : "Aguardar Sincronização"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
