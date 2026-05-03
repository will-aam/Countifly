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

  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [itemToReset, setItemToReset] = useState<{
    codigo_produto: string;
    descricao: string;
  } | null>(null);

  const quantityInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentProduct && quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  }, [currentProduct]);

  // Bip automático ao atingir 13 caracteres
  useEffect(() => {
    if (scanInput.length === 13) {
      const timer = setTimeout(() => {
        handleScan();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scanInput, handleScan]);

  const handleCameraScan = useCallback(
    (code: string) => {
      setIsCameraActive(false);
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
      className="relative flex flex-col gap-8 lg:gap-6 lg:grid lg:grid-cols-2 w-full lg:items-stretch pb-24 lg:pb-8 max-w-7xl mx-auto"
    >
      {/* Cabeçalho */}
      <div className="lg:col-span-2 flex justify-between items-center mb-2 px-4 lg:px-0">
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
            className="gap-1"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : queueSize === 0 ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-500" />
            )}
            {queueSize > 0 ? `${queueSize} Pendentes` : "Online"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* --- COLUNA ESQUERDA: Scanner e Inputs --- */}
      {/* Esta coluna dita a altura base no Desktop */}
      <div className="flex flex-col gap-4 w-full lg:bg-card lg:border lg:border-border lg:shadow-sm lg:rounded-xl lg:p-6">
        {/* Header Scanner */}
        <div className="flex items-center mb-2 px-4 lg:px-0">
          <Scan className="h-5 w-5 mr-2 text-primary" />
          <span className="font-semibold text-lg">Scanner</span>
        </div>

        {/* Ações e Modo */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full px-4 lg:px-0">
          <Button
            variant="default"
            onClick={handleFinishSession}
            className="w-full sm:w-auto"
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
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background"
              >
                <Store className="h-3 w-3" />
                Loja
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background"
              >
                <Package className="h-3 w-3" />
                Estoque
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conteúdo do Scanner */}
        <div className="flex flex-col gap-4 mt-2 px-4 lg:px-0">
          {isCameraActive ? (
            <BarcodeScanner
              onScan={handleCameraScan}
              onClose={() => setIsCameraActive(false)}
            />
          ) : (
            <>
              <div className="space-y-2 w-full">
                <Label>Código de Barras</Label>
                <div className="flex space-x-2 w-full">
                  <Input
                    value={scanInput}
                    onChange={(e) =>
                      setScanInput(e.target.value.replace(/\D/g, ""))
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleScan()}
                    placeholder="Bipe ou digite..."
                    className="flex-1 h-12 text-lg"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleScan()}
                    className="h-12 w-12 shrink-0"
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setIsCameraActive(true)}
                    variant="outline"
                    className="h-12 w-12 shrink-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-blue-800 dark:text-blue-200 truncate text-sm sm:text-base">
                        Item
                      </h3>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                        {currentProduct.descricao}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Cód: {currentProduct.codigo_produto}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center"
                      >
                        Sistema: {currentProduct.saldo_sistema ?? 0}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center"
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
                  <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <Button
                onClick={submitCount}
                className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!currentProduct || !quantityInput}
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: Lista de Itens --- */}
      {/* Wrapper relativo para herdar a altura do Grid no Desktop */}
      <div className="flex flex-col w-full lg:relative lg:h-full">
        {/* Card em si (Absolute no Desktop para travar o limite e não empurrar a tela toda) */}
        <div className="flex flex-col w-full gap-4 lg:gap-0 lg:absolute lg:inset-0 lg:bg-card lg:border lg:border-border lg:shadow-sm lg:rounded-xl">
          {/* PARTE 1: Cabeçalho e Busca */}
          <div className="w-full space-y-4 p-4 shrink-0 lg:p-6 lg:pb-4 lg:border-b lg:border-border/50">
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
                placeholder="Buscar..."
                className="pl-10 w-full bg-muted/50"
              />
            </div>
          </div>

          {/* PARTE 2: Área da Lista */}
          {/* min-h-0 é obrigatório para o flexbox permitir a rolagem sem estourar o layout pai */}
          <div className="flex-1 flex flex-col overflow-hidden w-full bg-card border border-border rounded-xl shadow-sm p-4 lg:bg-transparent lg:border-none lg:rounded-none lg:shadow-none lg:p-6 min-h-0">
            <div className="space-y-2 overflow-y-auto pr-1 w-full flex-1 max-h-[400px] lg:max-h-none">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 h-full flex flex-col items-center justify-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum item na lista</p>
                </div>
              ) : (
                filteredProducts.map((item) => (
                  <div
                    key={item.codigo_produto}
                    className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg mb-2"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm truncate uppercase">
                        {item.descricao}
                      </p>

                      {/* BARCODE DISPLAY INTEGRADO */}
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5">
                        <span>Cód:</span>
                        <BarcodeDisplay
                          value={item.codigo_barras || item.codigo_produto}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="text-sm h-8 px-3 bg-blue-100 text-blue-700"
                      >
                        {item.saldo_contado}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleRemoveMovement(item.codigo_produto)
                        }
                        disabled={item.saldo_contado <= 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          setItemToReset(item);
                          setShowResetConfirmation(true);
                        }}
                      >
                        <XCircle className="h-5 w-5" />
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
