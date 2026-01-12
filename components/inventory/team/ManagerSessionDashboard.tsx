// components/inventory/team/ManagerSessionDashboard.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Scan,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

// Interfaces (Tipos)
interface ManagerSessionDashboardProps {
  userId: number;
  activeSession: any; // Recebe a sessão do pai
  isLoadingSession: boolean;
  onCreateSession: (name: string) => void;
  onJoinCounting: () => void;
  onEndSession: () => void;
  sessionProducts: any[]; // Produtos passados pelo pai
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
}: ManagerSessionDashboardProps) {
  const [newSessionName, setNewSessionName] = useState("");
  const [isEnding, setIsEnding] = useState(false);

  // Modais
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioFinal | null>(
    null
  );
  const [showEndSessionConfirmation, setShowEndSessionConfirmation] =
    useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const missingItems = useMemo(() => {
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
      // 1. Encerra a sessão
      const endResponse = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: "POST",
      });
      if (!endResponse.ok) throw new Error("Erro ao encerrar.");

      // 2. Busca o relatório final
      const reportResponse = await fetch(
        `/api/sessions/${activeSession.id}/report`
      );
      const reportData: RelatorioFinal = await reportResponse.json();

      setRelatorioFinal(reportData);
      setShowRelatorioModal(true);

      // Notifica o pai que acabou
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

  // --- Renderização: Estado SEM SESSÃO ---
  if (!activeSession) {
    return (
      <Card className="max-w-md mx-auto">
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

  // --- Renderização: DASHBOARD ATIVO ---
  return (
    <div ref={containerRef} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <span className="text-sm font-normal text-muted-foreground mr-2">
                Sessão:
              </span>
              {activeSession.nome}
            </CardTitle>
            <div
              className={`text-xs px-2 py-1 rounded-full font-bold ${
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

        <CardContent className="space-y-8">
          {/* Seção do Código */}
          <div className="text-center space-y-2 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Código de Acesso
            </p>
            <div
              className="text-5xl font-mono tracking-widest text-primary cursor-pointer hover:scale-105 transition-transform"
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
                <Copy className="h-3 w-3 mr-1" /> Copiar Código
              </Button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button
              onClick={onJoinCounting}
              variant="default"
              className="flex-1 h-12 text-base font-semibold shadow-lg shadow-primary/20"
              disabled={isLoadingSession || sessionProducts.length === 0}
            >
              {isLoadingSession ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Scan className="mr-2 h-5 w-5" />
              )}
              Contar Agora (Anfitrião)
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowEndSessionConfirmation(true)}
              disabled={isEnding}
              className="h-12 px-6"
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
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-background/50 p-4 rounded-xl text-center border shadow-sm">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {activeSession._count?.participantes || 0}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Equipe
              </div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl text-center border shadow-sm">
              <Activity className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">
                {activeSession._count?.movimentos || 0}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Bipes Totais
              </div>
            </div>
            <div className="bg-background/50 p-4 rounded-xl text-center border shadow-sm">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">
                {activeSession._count?.produtos || 0}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Itens no Catálogo
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FloatingMissingItemsButton
        itemCount={missingItems.length}
        onClick={() => setShowMissingModal(true)}
        dragConstraintsRef={containerRef}
      />

      {/* MODAIS */}
      <MissingItemsModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        items={missingItems}
      />

      {/* Modal Relatório Final */}
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

      {/* Modal Confirmação Encerrar Sessão */}
      <AlertDialog
        open={showEndSessionConfirmation}
        onOpenChange={setShowEndSessionConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              A contagem será finalizada para todos e o relatório gerado.
              <br />
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession}>
              Confirmar Encerramento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
