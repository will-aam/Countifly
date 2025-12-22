// components/inventory/ManagerSessionDashboard.tsx
/**
 * Descrição: Painel de Controle do Anfitrião (Multiplayer) - VERSÃO FINAL (UI Ajustada)
 * Responsabilidade:
 * 1. Criar/Monitorar Sessões.
 * 2. Importar produtos (Com UI melhorada).
 * 3. Visualizar Faltantes.
 * 4. ENCERRAR SESSÃO.
 */
// components/inventory/ManagerSessionDashboard.tsx
/**
 * Descrição: Painel de Controle do Anfitrião (Multiplayer) - VERSÃO FINAL (Com Exportação CSV Detalhada)
 * Responsabilidade:
 * 1. Criar/Monitorar Sessões.
 * 2. Importar produtos.
 * 3. Visualizar e EXPORTAR Relatório Final (Loja vs Estoque).
 */

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
  DialogFooter, // Adicionado
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
  Download, // Ícone novo para o CSV
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

interface ManagerSessionDashboardProps {
  userId: number;
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

// --- INTERFACE ATUALIZADA ---
interface RelatorioFinal {
  total_produtos: number;
  total_contados: number;
  total_faltantes: number;
  discrepancias: Array<{
    codigo_produto: string;
    descricao: string;
    saldo_sistema: number;
    saldo_contado: number;
    // Novos campos opcionais (para compatibilidade)
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

  // --- Carregar Sessões ---
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

  // --- Carregar Produtos ---
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

  // --- Polling ---
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
      if (activeSessionRef.current) loadSessionProducts();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadSessions, loadSessionProducts]);

  // --- Calcular Faltantes (Tempo Real) ---
  const missingItems = useMemo(() => {
    return sessionProducts
      .filter((p) => p.saldo_contado === 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema,
      }));
  }, [sessionProducts]);

  // --- Criar Sessão ---
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
        description: "Não foi possível criar a sessão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Encerrar Sessão ---
  const handleEndSession = async () => {
    if (!activeSession) return;

    setIsEnding(true);
    setShowEndSessionConfirmation(false);

    try {
      const endResponse = await fetch(
        `/api/inventory/${userId}/session/${activeSession.id}/end`,
        { method: "POST" }
      );
      if (!endResponse.ok) {
        const data = await endResponse.json();
        throw new Error(data.error || "Erro ao encerrar.");
      }

      // Carrega o relatório FINAL com os dados separados
      const reportResponse = await fetch(
        `/api/inventory/${userId}/session/${activeSession.id}/report`
      );
      if (!reportResponse.ok) throw new Error("Erro ao carregar relatório");
      const reportData: RelatorioFinal = await reportResponse.json();
      setRelatorioFinal(reportData);
      setShowRelatorioModal(true);

      toast({
        title: "Sessão Finalizada!",
        description: "Relatório gerado com sucesso.",
      });
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

  // --- Importar ---
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
              toast({
                title: "Sucesso!",
                description: `${data.importedCount} produtos carregados.`,
              });
              setImportStatus("");
              loadSessions();
              loadSessionProducts();
            } else if (data.error) throw new Error(data.error);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
      setImportStatus("");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // --- NOVA FUNÇÃO: Gerar CSV ---
  const handleDownloadCSV = () => {
    if (!relatorioFinal) return;

    // Cabeçalho CSV
    const headers = [
      "Código",
      "Descrição",
      "Saldo Sistema",
      "Contado Loja",
      "Contado Estoque",
      "Contado Total",
      "Diferença",
    ];

    // Linhas
    const rows = relatorioFinal.discrepancias.map((item) => [
      item.codigo_produto,
      `"${item.descricao.replace(/"/g, '""')}"`, // Escapa aspas
      item.saldo_sistema,
      item.saldo_loja || 0,
      item.saldo_estoque || 0,
      item.saldo_contado,
      item.diferenca,
    ]);

    // Monta o arquivo
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    // Download Hack
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
    toast({ title: "Copiado!", description: "Código copiado." });
  };

  // --- Renderização ---

  if (!activeSession) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="max-w-md mx-auto border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Modo Equipe
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Crie uma sala para contagem colaborativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6">
            <div className="space-y-1.5">
              <Label htmlFor="sessionName" className="text-sm">
                Nome da Sessão
              </Label>
              <Input
                id="sessionName"
                placeholder="Ex: Inventário Dezembro"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="h-10 border-none bg-muted/50 focus-visible:ring-primary"
              />
            </div>
            <Button
              onClick={handleCreateSession}
              disabled={isLoading}
              className="w-full h-10"
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
      </motion.div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-[400px] max-w-2xl mx-auto"
    >
      <AnimatePresence>
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {activeSession.nome}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Criada em{" "}
                    {new Date(activeSession.criado_em).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-none">
                  Ativa
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Código de Acesso */}
              <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Código de Acesso
                </p>
                <div
                  className="text-4xl font-mono tracking-widest text-primary cursor-pointer select-all"
                  onClick={() => copyToClipboard(activeSession.codigo_acesso)}
                >
                  {activeSession.codigo_acesso}
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(activeSession.codigo_acesso)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: "Acesse o Inventário",
                            text: `Código: ${activeSession.codigo_acesso}`,
                            url: window.location.origin,
                          })
                          .catch(console.error);
                      } else {
                        copyToClipboard(
                          `${window.location.origin} (Código: ${activeSession.codigo_acesso})`
                        );
                      }
                    }}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    icon: Users,
                    color: "blue-500",
                    value: activeSession._count.participantes,
                    label: "Pessoas",
                  },
                  {
                    icon: Activity,
                    color: "amber-500",
                    value: activeSession._count.movimentos,
                    label: "Bipes",
                  },
                  {
                    icon: RefreshCw,
                    color: "green-500",
                    value: activeSession._count.produtos,
                    label: "Itens",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                    className="bg-background/50 p-4 rounded-xl border border-muted/20 text-center"
                  >
                    <stat.icon
                      className={`h-5 w-5 text-${stat.color} mx-auto mb-2`}
                    />
                    <div className="text-2xl font-semibold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Importação */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="bg-background/60 p-6 rounded-xl border border-dashed border-primary/30 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold flex items-center gap-2 text-primary">
                    <UploadCloud className="h-5 w-5" />
                    Importar Catálogo
                  </h4>
                  {activeSession._count.produtos > 0 && (
                    <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 border-none">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {activeSession._count.produtos} carregados
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleSessionImport}
                      disabled={isImporting}
                      className="cursor-pointer text-sm h-12 file:mr-4 file:py-2 file:px-0 file:border-0 file:text-sm file:font-bold file:text-primary file:bg-transparent hover:file:text-primary/80 transition-all"
                    />
                  </div>

                  {isImporting && (
                    <span className="text-sm text-primary font-medium animate-pulse flex items-center gap-2 whitespace-nowrap">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {importStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Carregue o arquivo CSV (mesmo formato padrão) para que os
                  colaboradores vejam os produtos no celular.
                </p>
              </motion.div>
            </CardContent>

            <CardFooter className="p-6 flex justify-end gap-3 border-t border-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadSessions();
                  loadSessionProducts();
                }}
                disabled={isEnding}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEndSessionConfirmation(true)}
                disabled={isEnding}
              >
                {isEnding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-4 w-4" />
                )}
                Encerrar
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Flutuantes */}
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

      {/* --- MODAL DE RELATÓRIO FINAL --- */}
      <Dialog open={showRelatorioModal} onOpenChange={setShowRelatorioModal}>
        <DialogContent className="max-w-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Relatório Final
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Sessão: {activeSession?.nome} • {relatorioFinal?.data_finalizacao}
            </DialogDescription>
          </DialogHeader>

          {relatorioFinal && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {relatorioFinal.total_produtos}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Itens
                  </div>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {relatorioFinal.total_contados}
                  </div>
                  <div className="text-xs text-muted-foreground">Contados</div>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">
                    {relatorioFinal.total_faltantes}
                  </div>
                  <div className="text-xs text-muted-foreground">Faltantes</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2 flex justify-between items-center">
                  Detalhes por Item
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Ordenado por maior diferença
                  </span>
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {relatorioFinal.discrepancias.map((item, index) => (
                    <div
                      key={index}
                      className="bg-card p-3 rounded-md border text-sm shadow-sm"
                    >
                      <div className="font-semibold text-primary truncate">
                        {item.descricao}
                      </div>
                      <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                        <div className="flex gap-2">
                          {/* Exibição Visual da Separação */}
                          <span className="bg-blue-100 text-blue-700 px-1 rounded">
                            Lj: {item.saldo_loja || 0}
                          </span>
                          <span className="bg-purple-100 text-purple-700 px-1 rounded">
                            Est: {item.saldo_estoque || 0}
                          </span>
                        </div>
                        <div className="font-medium">
                          Total:{" "}
                          <span className="text-foreground">
                            {item.saldo_contado}
                          </span>
                          {item.diferenca !== 0 && (
                            <span
                              className={
                                item.diferenca > 0
                                  ? "text-green-600 ml-1"
                                  : "text-red-500 ml-1"
                              }
                            >
                              ({item.diferenca > 0 ? "+" : ""}
                              {item.diferenca})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between gap-2 border-t pt-4">
            <div className="text-xs text-muted-foreground self-center">
              Duração: {relatorioFinal?.duracao} •{" "}
              {relatorioFinal?.participantes} participantes
            </div>
            <Button onClick={handleDownloadCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar Planilha CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Encerrar */}
      <AlertDialog
        open={showEndSessionConfirmation}
        onOpenChange={setShowEndSessionConfirmation}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              Encerrar sessão de contagem
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a encerrar a sessão{" "}
              <span className="font-semibold">{activeSession?.nome}</span>.
              <br />
              Ao confirmar, a contagem será finalizada e o relatório final será
              gerado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession} disabled={isEnding}>
              {isEnding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
