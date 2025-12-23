// components/inventory/ManagerSessionDashboard.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Share2,
  CheckCircle2,
  Loader2,
  BarChart2,
  UploadCloud,
  Download,
  Scan, // Ícone para o botão de contar
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

// CORREÇÃO: Interface agora aceita a função de callback
interface ManagerSessionDashboardProps {
  userId: number;
  onStartCounting?: (session: any, participant: any) => void;
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
    saldo_loja?: number;
    saldo_estoque?: number;
    diferenca: number;
  }>;
  participantes: number;
  duracao: string;
  data_finalizacao: string;
}

export function ManagerSessionDashboard({
  userId,
  onStartCounting, // <-- Recebendo a prop
}: ManagerSessionDashboardProps) {
  const [activeSession, setActiveSession] = useState<SessaoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [sessionProducts, setSessionProducts] = useState<ProductSessao[]>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioFinal | null>(
    null
  );
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [showEndSessionConfirmation, setShowEndSessionConfirmation] =
    useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSessionRef = useRef<SessaoData | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventory/${userId}/session`);
      if (response.ok) {
        const data = await response.json();
        const current = data.find((s: any) => s.status === "ABERTA");
        setActiveSession(current || null);
      }
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
    }
  }, [userId]);

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
      const response = await fetch(`/api/inventory/${userId}/session`, {
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
        description: "Falha ao criar sessão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- NOVA FUNÇÃO: Entrar na contagem como Gestor ---
  const handleJoinAsParticipant = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeSession.codigo_acesso,
          name: "Anfitrião",
        }),
      });

      if (!response.ok) throw new Error("Erro ao entrar na sessão");
      const data = await response.json();

      // Avisa o TeamManagerView que queremos mudar para a aba de contagem
      onStartCounting?.(data.session, data.participant);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar sua contagem.",
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
      const endResponse = await fetch(
        `/api/inventory/${userId}/session/${activeSession.id}/end`,
        { method: "POST" }
      );
      if (!endResponse.ok) throw new Error("Erro ao encerrar.");
      const reportResponse = await fetch(
        `/api/inventory/${userId}/session/${activeSession.id}/report`
      );
      const reportData: RelatorioFinal = await reportResponse.json();
      setRelatorioFinal(reportData);
      setShowRelatorioModal(true);
      setActiveSession(null);
      setSessionProducts([]);
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

  const handleSessionImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    setIsImporting(true);
    setImportStatus("Iniciando upload...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(
        `/api/inventory/${userId}/session/${activeSession.id}/import`,
        { method: "POST", body: formData }
      );
      if (!response.ok || !response.body) throw new Error("Falha no upload");
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = value.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.substring(6));
            if (data.type === "progress")
              setImportStatus(`Importando: ${data.imported} itens...`);
            else if (data.type === "complete") {
              setImportStatus("");
              loadSessions();
              loadSessionProducts();
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleDownloadCSV = () => {
    if (!relatorioFinal) return;
    const headers = [
      "Código",
      "Descrição",
      "Saldo Sistema",
      "Contado Loja",
      "Contado Estoque",
      "Contado Total",
      "Diferença",
    ];
    const rows = relatorioFinal.discrepancias.map((item) => [
      item.codigo_produto,
      `"${item.descricao.replace(/"/g, '""')}"`,
      item.saldo_sistema,
      item.saldo_loja || 0,
      item.saldo_estoque || 0,
      item.saldo_contado,
      item.diferenca,
    ]);
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `relatorio_final_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (!activeSession) {
    return (
      <Card className="max-w-md mx-auto border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
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
            <Label htmlFor="sessionName">Nome da Sessão</Label>
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
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
      className="relative min-h-[400px] max-w-2xl mx-auto"
    >
      <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{activeSession.nome}</CardTitle>
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
              Ativa
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Código de Acesso
            </p>
            <div
              className="text-4xl font-mono tracking-widest text-primary cursor-pointer"
              onClick={() => copyToClipboard(activeSession.codigo_acesso)}
            >
              {activeSession.codigo_acesso}
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

          {/* BOTÃO NOVO: Contar como Anfitrião */}
          <Button
            onClick={handleJoinAsParticipant}
            variant="outline"
            className="w-full h-12 border-primary text-primary hover:bg-primary/10"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Scan className="mr-2 h-5 w-5" />
            )}
            Contar Agora (Como Anfitrião)
          </Button>

          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                value: activeSession._count.participantes,
                label: "Pessoas",
              },
              {
                icon: Activity,
                value: activeSession._count.movimentos,
                label: "Bipes",
              },
              {
                icon: RefreshCw,
                value: activeSession._count.produtos,
                label: "Itens",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-background/50 p-4 rounded-xl text-center border"
              >
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-background/60 p-6 rounded-xl border border-dashed border-primary/30 space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <UploadCloud className="h-5 w-5" /> Importar Catálogo
            </h4>
            <Input
              type="file"
              accept=".csv"
              onChange={handleSessionImport}
              disabled={isImporting}
              className="cursor-pointer"
            />
            {isImporting && (
              <p className="text-xs animate-pulse text-primary">
                {importStatus}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t p-6">
          <Button
            variant="destructive"
            onClick={() => setShowEndSessionConfirmation(true)}
            disabled={isEnding}
          >
            {isEnding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StopCircle className="mr-2 h-4 w-4" />
            )}
            Encerrar Sessão
          </Button>
        </CardFooter>
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
            <DialogTitle>Relatório Final</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold">
                  {relatorioFinal?.total_produtos}
                </div>
                <div className="text-[10px]">Total</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {relatorioFinal?.total_contados}
                </div>
                <div className="text-[10px]">Contados</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold text-red-500">
                  {relatorioFinal?.total_faltantes}
                </div>
                <div className="text-[10px]">Faltantes</div>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {relatorioFinal?.discrepancias.map((item, idx) => (
                <div key={idx} className="p-2 border rounded text-xs">
                  <div className="font-bold">{item.descricao}</div>
                  <div className="flex justify-between mt-1">
                    <span>
                      Lj: {item.saldo_loja} | Est: {item.saldo_estoque}
                    </span>
                    <span className={item.diferenca < 0 ? "text-red-500" : ""}>
                      Dif: {item.diferenca}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDownloadCSV} className="w-full gap-2">
              <Download className="h-4 w-4" /> Baixar CSV
            </Button>
          </DialogFooter>
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
              A contagem será finalizada e o relatório final gerado.
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
