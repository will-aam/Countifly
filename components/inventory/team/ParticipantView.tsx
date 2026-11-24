// app/components/inventory/team/ParticipantView.tsx
/**
 * Descrição: Interface "Pro" para o Colaborador.
 * Responsabilidade: Replicar a experiência completa da ConferenceTab,
 * mas conectada ao sistema multiplayer e com visualização de Itens Faltantes.
 */

"use client";
import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay";
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useParticipantInventory } from "@/hooks/useParticipantInventory";
import { useExternalScannerMode } from "@/hooks/useExternalScannerMode";
import { BarcodeScanner } from "@/components/features/barcode-scanner";
import { evaluate } from "mathjs";

// --- Componentes Compartilhados ---
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

// --- UI (Removido Card e mantido apenas componentes atômicos) ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Ícones ---
import {
  Scan,
  Bluetooth,
  Store,
  Package,
  Camera,
  Plus,
  Search,
  Calculator,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Trash2,
  XCircle,
  AlertTriangle,
  Eraser,
} from "lucide-react";

interface ParticipantViewProps {
  sessionData: any;
  onLogout: () => void;
}

const calculateExpression = (
  expression: string,
): { result: number; isValid: boolean; error?: string } => {
  try {
    if (expression.length > 50) {
      return { result: 0, isValid: false, error: "Expressão muito longa" };
    }
    const cleanExpression = expression.replace(/,/g, ".");
    const result = evaluate(cleanExpression);
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { result: 0, isValid: false, error: "Resultado inválido" };
    }
    return { result: Math.round(result * 100) / 100, isValid: true };
  } catch (error) {
    return { result: 0, isValid: false, error: "Erro ao calcular" };
  }
};

export function ParticipantView({
  sessionData,
  onLogout,
}: ParticipantViewProps) {
  // --- Hook de Lógica Multiplayer ---
  const {
    products,
    queueSize,
    isSyncing,
    scanInput,
    setScanInput,
    quantityInput,
    setQuantityInput,
    currentProduct,
    handleScan,
    handleAddMovement,
    handleRemoveMovement,
    handleResetItem,
    missingItems,
  } = useParticipantInventory({ sessionData });
  const {
    externalScannerMode,
    setExternalScannerMode,
    externalScannerModeReady,
  } = useExternalScannerMode();

  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [directScanEnabled, setDirectScanEnabled] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [itemToReset, setItemToReset] = useState<{
    codigo_produto: string;
    descricao: string;
  } | null>(null);

  const quantityInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerFocusInitializedRef = useRef(false);
  const directScanCodeRef = useRef("");

  useEffect(() => {
    const checkIsDesktop = () => {
      if (typeof window === "undefined" || typeof navigator === "undefined") return;
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 1024;
      const isTouch = navigator.maxTouchPoints > 0;
      const isMobile = isMobileUA || (isSmallScreen && isTouch);
      setIsDesktop(!isMobile);
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const handleCameraClick = () => {
    if (isDesktop) {
      toast({
        title: "Câmera disponível apenas no celular",
        description: "A leitura por câmera é exclusiva para dispositivos móveis (smartphones/coletores). No computador, utilize o leitor de código de barras ou digite o código.",
      });
      return;
    }
    setIsCameraActive(true);
  };

  useEffect(() => {
    try {
      setDirectScanEnabled(
        localStorage.getItem(`countifly_team_direct_scan_${sessionData.participant.id}`) === "true",
      );
    } catch {
      setDirectScanEnabled(false);
    }
  }, [sessionData.participant.id]);

  const updateDirectScan = (enabled: boolean) => {
    setDirectScanEnabled(enabled);
    try {
      localStorage.setItem(`countifly_team_direct_scan_${sessionData.participant.id}`, String(enabled));
    } catch {
      // A preferência continua ativa durante esta sessão.
    }
  };

  useEffect(() => {
    if (!externalScannerModeReady || isCameraActive) return;
    if (currentProduct && quantityInputRef.current) {
      quantityInputRef.current.focus();
    } else if (externalScannerMode || !scannerFocusInitializedRef.current) {
      barcodeInputRef.current?.focus();
      scannerFocusInitializedRef.current = true;
    }
  }, [currentProduct, externalScannerMode, externalScannerModeReady, isCameraActive]);

  // Bip automático ao atingir 13 caracteres
  useEffect(() => {
    if (scanInput.length === 13) {
      const timer = setTimeout(() => {
        handleScan();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scanInput, handleScan]);

  useEffect(() => {
    if (!directScanEnabled || !currentProduct || !scanInput.trim()) return;
    const code = scanInput.trim();
    if (directScanCodeRef.current === code) return;
    directScanCodeRef.current = code;
    handleAddMovement(1, countingMode === "estoque" ? "ESTOQUE" : "LOJA");
  }, [directScanEnabled, currentProduct, scanInput, countingMode, handleAddMovement]);

  const handleCameraScan = useCallback(
    (code: string) => {
      setIsCameraActive(false);
      directScanCodeRef.current = "";
      setScanInput(code);
    },
    [setScanInput],
  );

  // Detecta quando sessão é encerrada remotamente e redireciona
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionData.session.id}/status`,
        );

        if (!response.ok) {
          if (response.status === 409 || response.status === 404) {
            toast({
              title: "⚠️ Sessão Encerrada",
              description: "O gerente finalizou a contagem.",
              variant: "destructive",
              duration: 5000,
            });

            setTimeout(() => {
              sessionStorage.setItem(
                "sessionEndedMessage",
                "A sessão foi encerrada pelo gerente. Faça login novamente para iniciar uma nova contagem.",
              );
              sessionStorage.removeItem("sessionData");
              sessionStorage.removeItem("currentSession");
              localStorage.removeItem("participant_token");
              window.location.href = "/login";
            }, 3000);
            return;
          }
        }

        const data = await response.json();

        if (data.status === "FINALIZADA" || data.status === "ENCERRANDO") {
          toast({
            title: "⚠️ Sessão Encerrada",
            description: "O gerente finalizou a contagem.",
            variant: "destructive",
            duration: 5000,
          });

          setTimeout(() => {
            sessionStorage.setItem(
              "sessionEndedMessage",
              "A sessão foi encerrada pelo gerente. Faça login novamente para iniciar uma nova contagem.",
            );
            sessionStorage.removeItem("sessionData");
            sessionStorage.removeItem("currentSession");
            localStorage.removeItem("participant_token");
            window.location.href = "/login";
          }, 3000);
        }
      } catch (error) {
        console.error("Erro ao verificar status da sessão:", error);
      }
    };

    const interval = setInterval(checkSessionStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionData]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validValue = value.replace(/[^0-9+\-*/\s.,]/g, "");
    setQuantityInput(validValue);
  };

  const submitCount = () => {
    if (!currentProduct || !quantityInput) return;

    let finalQuantity: number;
    const hasOperators = /[+\-*/]/.test(quantityInput);

    if (hasOperators) {
      const calculation = calculateExpression(quantityInput);
      if (!calculation.isValid) {
        toast({
          title: "Erro",
          description: calculation.error,
          variant: "destructive",
        });
        return;
      }
      finalQuantity = calculation.result;
    } else {
      const parsed = parseFloat(quantityInput.replace(",", "."));
      if (isNaN(parsed)) return;
      finalQuantity = parsed;
    }

    const localParaEnviar = countingMode === "estoque" ? "ESTOQUE" : "LOJA";
    handleAddMovement(finalQuantity, localParaEnviar);
  };

  const handleFinishSession = async () => {
    toast({
      title: "Finalizando...",
      description: "Sincronizando dados com o servidor.",
    });

    try {
      const response = await fetch(
        `/api/session/${sessionData.session.id}/participant/${sessionData.participant.id}/leave`,
        { method: "PATCH" },
      );

      if (!response.ok) throw new Error("Falha ao registrar saída");

      toast({
        title: "Contagem Finalizada! 🎉",
        className: "bg-green-600 text-white border-none",
      });

      setTimeout(() => {
        sessionStorage.removeItem("sessionData");
        localStorage.removeItem("participant_token");
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    }
  };

  const filteredProducts = useMemo(() => {
    let items = products.filter((p) => p.saldo_contado > 0 || searchQuery);
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.descricao.toLowerCase().includes(lowerQuery) ||
          (item.codigo_barras && item.codigo_barras.includes(lowerQuery)) ||
          item.codigo_produto.includes(lowerQuery),
      );
    }
    return items.sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [products, searchQuery]);

  return (
    // Grid usando lg:items-stretch garante que o tamanho natural é ditado pela coluna mais alta (Scanner)
    <div
      ref={containerRef}
      className="relative flex flex-col gap-6 lg:grid lg:grid-cols-2 w-full lg:items-stretch pb-24 lg:pb-8 max-w-7xl mx-auto"
    >
      {/* Cabeçalho */}
      <div className="lg:col-span-2 flex justify-between items-center mb-1">
        <div>
          <h2 className="font-bold text-lg">
            Olá, {sessionData.participant.nome} 👋
          </h2>
          <p className="text-xs text-muted-foreground">
            Sessão: {sessionData.session.nome}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={queueSize === 0 ? "outline" : "secondary"}
            className="gap-1.5"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : queueSize === 0 ? (
              <Wifi className="w-3 h-3 text-emerald-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-500" />
            )}
            {queueSize > 0 ? `${queueSize} Pendentes` : "Online"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onLogout} title="Sair da Sessão">
            <LogOut className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* --- COLUNA ESQUERDA: Scanner e Inputs --- */}
      <div className="flex flex-col gap-4 w-full p-4 sm:p-6 bg-card border border-border shadow-sm rounded-xl">
        {/* Header Scanner */}
        <div className="flex items-center mb-1">
          <Scan className="h-5 w-5 mr-2 text-primary" />
          <span className="font-semibold text-lg">Scanner</span>
        </div>

        {/* Ações e Modo */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="default"
            onClick={handleFinishSession}
            className="w-full sm:w-auto font-medium"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
          </Button>

          <Tabs
            value={countingMode}
            onValueChange={(v) => setCountingMode(v as "loja" | "estoque")}
            className="w-full sm:w-auto flex-1"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-md bg-muted p-1">
              <TabsTrigger
                value="loja"
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Store className="h-3.5 w-3.5" />
                Loja
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Package className="h-3.5 w-3.5" />
                Estoque
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-muted/20">
            <Label htmlFor="participant-direct-scan" className="text-xs whitespace-nowrap cursor-pointer">
              Bipagem rápida (+1)
            </Label>
            <Switch
              id="participant-direct-scan"
              checked={directScanEnabled}
              onCheckedChange={updateDirectScan}
            />
          </div>
        </div>

        {/* Conteúdo do Scanner */}
        <div className="flex flex-col gap-4 mt-1">
          {isCameraActive ? (
            <BarcodeScanner
              onScan={handleCameraScan}
              onClose={() => setIsCameraActive(false)}
            />
          ) : (
            <>
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between gap-3">
                  <Label>Código de Barras</Label>
                  <div className="flex items-center gap-2">
                    <Bluetooth className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label htmlFor="participant-external-scanner" className="text-xs text-muted-foreground">
                      Leitor externo
                    </Label>
                    <Switch
                      id="participant-external-scanner"
                      checked={externalScannerMode}
                      onCheckedChange={setExternalScannerMode}
                      disabled={!externalScannerModeReady}
                    />
                  </div>
                </div>
                <div className="flex space-x-2 w-full">
                  <Input
                    ref={barcodeInputRef}
                    value={scanInput}
                    type="tel"
                    inputMode={externalScannerMode ? "none" : "numeric"}
                    onChange={(e) => {
                      directScanCodeRef.current = "";
                      setScanInput(e.target.value.replace(/\D/g, ""));
                    }}
                    onKeyPress={(e) => e.key === "Enter" && handleScan()}
                    placeholder="Bipe ou digite..."
                    className="flex-1 h-12 text-lg font-mono"
                  />
                  <Button
                    onClick={() => handleScan()}
                    className="h-12 w-12 shrink-0"
                    title="Buscar código"
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleCameraClick}
                    variant="outline"
                    className="h-12 w-12 shrink-0"
                    title="Leitura por câmera"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div className="p-3.5 border rounded-lg bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Produto Identificado
                      </p>
                      <p className="text-sm font-bold text-foreground truncate mt-0.5">
                        {currentProduct.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        Cód: {currentProduct.codigo_produto}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs min-w-[90px] justify-center"
                      >
                        Sist: {currentProduct.saldo_sistema ?? 0}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs min-w-[90px] justify-center font-bold bg-primary/10 text-primary"
                      >
                        Contado: {currentProduct.saldo_contado}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 w-full">
                <Label>Quantidade em {countingMode}</Label>
                <div className="relative w-full">
                  <Input
                    ref={quantityInputRef}
                    value={quantityInput}
                    onChange={handleQuantityChange}
                    onKeyPress={(e) => e.key === "Enter" && submitCount()}
                    placeholder="Qtd ou 5+5..."
                    className="font-mono text-lg h-12 font-bold pl-9 w-full"
                    inputMode="decimal"
                  />
                  <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <Button
                onClick={submitCount}
                className="w-full h-11 font-medium"
                disabled={!currentProduct || !quantityInput}
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: Lista de Itens --- */}
      <div className="flex flex-col w-full lg:relative lg:h-full">
        <div className="flex flex-col w-full gap-4 lg:gap-0 lg:absolute lg:inset-0 bg-card border border-border shadow-sm rounded-xl">
          {/* PARTE 1: Cabeçalho e Busca */}
          <div className="w-full space-y-4 p-4 lg:p-6 lg:pb-4 lg:border-b lg:border-border/50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">
                Contados nesta Sessão ({filteredProducts.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por descrição ou código..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* PARTE 2: Área da Lista */}
          <div className="flex-1 flex flex-col overflow-hidden w-full p-4 lg:p-6 lg:pt-4 min-h-0">
            <div className="space-y-2 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y pr-1 w-full flex-1 max-h-[45vh] sm:max-h-[400px] lg:max-h-none">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground h-full flex flex-col items-center justify-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum item contado ainda</p>
                </div>
              ) : (
                filteredProducts.map((item) => (
                  <div
                    key={item.codigo_produto}
                    className="flex items-center justify-between p-3 rounded-lg mb-2 bg-blue-100/60 border border-blue-200/80 dark:bg-primary/5 dark:border-primary/10"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm truncate uppercase">
                        {item.descricao}
                      </p>

                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5 truncate">
                        <span>Cód:</span>
                        <BarcodeDisplay
                          value={item.codigo_barras || item.codigo_produto}
                        />
                        <span className="truncate">| Sist: {item.saldo_sistema ?? 0}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5 rounded-md font-medium border border-slate-300 bg-white/60 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100 backdrop-blur-md"
                        >
                          Contado: {item.saldo_contado}
                        </Badge>
                        {typeof item.saldo_sistema === "number" && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 rounded-md font-medium ${
                              item.saldo_contado - item.saldo_sistema === 0
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : item.saldo_contado - item.saldo_sistema > 0
                                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                  : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            Dif: {item.saldo_contado - item.saldo_sistema > 0 ? `+${item.saldo_contado - item.saldo_sistema}` : item.saldo_contado - item.saldo_sistema}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          handleRemoveMovement(item.codigo_produto)
                        }
                        disabled={item.saldo_contado <= 0}
                        title="Remover 1 contagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => {
                          setItemToReset(item);
                          setShowResetConfirmation(true);
                        }}
                        title="Zerar contagem deste item"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
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

      {/* Modal de Confirmação */}
      <AlertDialog
        open={showResetConfirmation}
        onOpenChange={setShowResetConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Zerar Contagem?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja zerar o item <strong>{itemToReset?.descricao}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (itemToReset) handleResetItem(itemToReset.codigo_produto);
                setShowResetConfirmation(false);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
