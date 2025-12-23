// components/inventory/ParticipantView.tsx
/**
 * Descrição: Interface "Pro" para o Colaborador com suporte Multiplayer e Bip Automático.
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
    // CORREÇÃO: Removido pendingMovements pois não é fornecido pelo hook atualizado
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

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCount();
    }
  };

  const handleFinishSession = async () => {
    toast({
      title: "Finalizando...",
      description: "Sincronizando últimos dados.",
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
      <div className="lg:col-span-2 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">
            Olá, {sessionData.participant.nome} 👋
          </h2>
          <p className="text-xs text-muted-foreground">
            Sessão: {sessionData.session.nome}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={queueSize === 0 ? "outline" : "secondary"}>
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
            ) : queueSize === 0 ? (
              <Wifi className="w-3 h-3 text-green-500 mr-1" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-500 mr-1" />
            )}
            {queueSize > 0 ? `${queueSize} Pendentes` : "Online"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Scanner */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Scan className="mr-2 h-5 w-5" /> Scanner
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                onClick={handleFinishSession}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
              </Button>
              <div className="flex bg-muted p-1 rounded-md">
                <Button
                  variant={countingMode === "loja" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCountingMode("loja")}
                >
                  <Store className="h-3 w-3 mr-2" /> Loja
                </Button>
                <Button
                  variant={countingMode === "estoque" ? "default" : "ghost"}
                  size="sm"
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
                <div className="flex gap-2">
                  <Input
                    value={scanInput}
                    onChange={(e) =>
                      setScanInput(e.target.value.replace(/\D/g, ""))
                    }
                    onKeyPress={(e) => e.key === "Enter" && handleScan()}
                    placeholder="Bipe aqui..."
                    className="h-12 text-lg"
                    autoFocus
                  />
                  <Button onClick={() => handleScan()} className="h-12">
                    <Scan />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCameraActive(true)}
                    className="h-12"
                  >
                    <Camera />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-blue-800">
                        ITEM SELECIONADO
                      </p>
                      <p className="font-bold truncate">
                        {currentProduct.descricao}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
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
                    onKeyPress={handleQuantityKeyPress}
                    placeholder="Qtd..."
                    className="h-12 text-center text-lg font-bold"
                  />
                  <Button
                    onClick={submitCount}
                    disabled={!currentProduct || !quantityInput}
                    className="h-12 bg-blue-600 text-white px-6"
                  >
                    <Plus className="mr-1" /> ADICIONAR
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Contagem Atual ({filteredProducts.length})</CardTitle>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
          {filteredProducts.map((item) => (
            <div
              key={item.codigo_produto}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="truncate flex-1">
                <p className="font-medium text-sm truncate">{item.descricao}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.codigo_produto}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">
                  {item.saldo_contado}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveMovement(item.codigo_produto)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => {
                    setItemToReset(item);
                    setShowResetConfirmation(true);
                  }}
                >
                  <XCircle className="h-4 w-4" />
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

      <AlertDialog
        open={showResetConfirmation}
        onOpenChange={setShowResetConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Zerar Item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja zerar a contagem de{" "}
              <strong>{itemToReset?.descricao}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={() =>
                itemToReset && handleResetItem(itemToReset.codigo_produto)
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
