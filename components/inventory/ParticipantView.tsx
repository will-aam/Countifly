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

// --- UI ---
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
} from "lucide-react";

interface ParticipantViewProps {
  sessionData: any;
  onLogout: () => void;
}

const calculateExpression = (
  expression: string
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
    // CORREÇÃO: Removido pendingMovements para evitar erro de TS
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
    [setScanInput]
  );

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
        { method: "PATCH" }
      );
      if (!response.ok) throw new Error("Falha ao registrar saída");
      toast({
        title: "Contagem Finalizada! 🎉",
        className: "bg-green-600 text-white border-none",
      });
      setTimeout(onLogout, 2000);
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
          item.codigo_produto.includes(lowerQuery)
      );
    }
    return items.sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [products, searchQuery]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-6 lg:grid lg:grid-cols-2 p-4 pb-24 max-w-7xl mx-auto min-h-screen"
    >
      {/* Cabeçalho */}
      <div className="lg:col-span-2 flex justify-between items-center mb-2">
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

      {/* Card Scanner */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <Scan className="h-5 w-5 mr-2 text-primary" /> Scanner
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button
                onClick={handleFinishSession}
                className="w-full sm:w-auto border-2 border-green-600 text-green-600 bg-transparent hover:bg-transparent"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
              </Button>
              <div className="flex w-full sm:w-auto gap-2 bg-muted p-1 rounded-md">
                <Button
                  variant={countingMode === "loja" ? "default" : "ghost"}
                  className="flex-1 h-8"
                  onClick={() => setCountingMode("loja")}
                >
                  <Store className="h-3 w-3 mr-2" /> Loja
                </Button>
                <Button
                  variant={countingMode === "estoque" ? "default" : "ghost"}
                  className="flex-1 h-8"
                  onClick={() => setCountingMode("estoque")}
                >
                  <Package className="h-3 w-3 mr-2" /> Estoque
                </Button>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCameraActive ? (
            <BarcodeScanner
              onScan={handleCameraScan}
              onClose={() => setIsCameraActive(false)}
            />
          ) : (
            <>
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <div className="flex space-x-2">
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
                  <Button onClick={() => handleScan()} className="h-12">
                    <Scan />
                  </Button>
                  <Button
                    onClick={() => setIsCameraActive(true)}
                    variant="outline"
                    className="h-12"
                  >
                    <Camera />
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
                    {/* RESTAURADO: Badges de Sistema e Contado */}
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

              <div className="space-y-2">
                <Label>Quantidade em {countingMode}</Label>
                <div className="flex gap-2">
                  <Input
                    ref={quantityInputRef}
                    value={quantityInput}
                    onChange={handleQuantityChange}
                    onKeyPress={(e) => e.key === "Enter" && submitCount()}
                    placeholder="Qtd ou 5+5..."
                    className="flex-1 font-mono text-lg h-12 font-bold text-center"
                  />
                  <Button
                    onClick={submitCount}
                    className="h-12 px-6 font-bold bg-blue-600 text-white"
                    disabled={!currentProduct || !quantityInput}
                  >
                    <Plus className="h-5 w-5 mr-1" /> ADICIONAR
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista de Itens */}
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Contados nesta Sessão ({filteredProducts.length})
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-10 h-10 bg-muted/50"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-[300px] space-y-2">
          {filteredProducts.map((item) => (
            <div
              key={item.codigo_produto}
              className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm"
            >
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-medium text-sm truncate">{item.descricao}</p>
                <div className="text-[10px] text-muted-foreground">
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
                  onClick={() => handleRemoveMovement(item.codigo_produto)}
                  disabled={item.saldo_contado <= 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-400"
                  onClick={() => {
                    setItemToReset(item);
                    setShowResetConfirmation(true);
                  }}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
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
              className="bg-destructive hover:bg-destructive/90"
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
