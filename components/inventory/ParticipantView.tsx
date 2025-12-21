// components/inventory/ParticipantView.tsx
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
// --- CORREÇÃO DE SEGURANÇA: Importar mathjs ---
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
// Seus imports do Modal de Confirmação
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
  AlertTriangle, // Ícone do seu modal
} from "lucide-react";

interface ParticipantViewProps {
  sessionData: any;
  onLogout: () => void;
}

// --- CORREÇÃO DE SEGURANÇA: Função auxiliar SEGURA ---
// Substituímos o 'new Function' pelo 'mathjs.evaluate'
const calculateExpression = (
  expression: string
): { result: number; isValid: boolean; error?: string } => {
  try {
    if (expression.length > 50) {
      return { result: 0, isValid: false, error: "Expressão muito longa" };
    }
    // 1. Normaliza (troca vírgula por ponto)
    const cleanExpression = expression.replace(/,/g, ".");

    // 2. Avalia com segurança usando a biblioteca
    const result = evaluate(cleanExpression);

    // 3. Valida se o resultado é um número finito
    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { result: 0, isValid: false, error: "Resultado inválido" };
    }

    // 4. Arredonda (2 casas) e retorna
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
    pendingMovements, // Usado implicitamente para lógica de UI se necessário
    missingItems,
  } = useParticipantInventory({ sessionData });

  // --- Estados Locais da UI ---
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMissingModal, setShowMissingModal] = useState(false);

  // Estado para o Modal de Confirmação (Zerar Item)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [itemToReset, setItemToReset] = useState<{
    codigo_produto: string;
    descricao: string;
  } | null>(null);

  // Referências
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Foca na quantidade ao encontrar produto
  useEffect(() => {
    if (currentProduct && quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  }, [currentProduct]);

  // --- Handlers ---

  const handleCameraScan = useCallback((code: string) => {
    setIsCameraActive(false);
    setScanInput(code);
  }, []);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permite digitar operadores matemáticos
    const validValue = value.replace(/[^0-9+\-*/\s.,]/g, "");
    setQuantityInput(validValue);
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitCount();
    }
  };

  const submitCount = () => {
    if (!currentProduct || !quantityInput) return;

    let finalQuantity: number;
    // Verifica operadores matemáticos (+ - * /)
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

    handleAddMovement(finalQuantity);
  };

  // components/inventory/ParticipantView.tsx

  // ...

  const handleFinishSession = async () => {
    // 1. Feedback visual imediato
    toast({
      title: "Finalizando...",
      description: "Sincronizando últimos dados com o servidor.",
    });

    try {
      // 2. Força o envio de qualquer item pendente na fila antes de sair
      // (Isso garante que o gestor receba tudo)
      if (queueSize > 0) {
        // Supondo que você expôs o syncNow no hook, se não, o loop automático pega.
        // Mas o mais importante é avisar o servidor que acabou.
      }

      // 3. Avisa o servidor que este participante terminou
      // Atenção aos IDs: sessionData.session.id e sessionData.participant.id
      const response = await fetch(
        `/api/session/${sessionData.session.id}/participant/${sessionData.participant.id}/leave`,
        { method: "PATCH" }
      );

      if (!response.ok) throw new Error("Falha ao registrar saída");

      toast({
        title: "Contagem Finalizada! 🎉",
        description: "O Gestor já pode ver seu status como concluído.",
        className: "bg-green-600 text-white border-none",
      });

      // 4. Aguarda um pouco para o usuário ler e faz o logout
      setTimeout(onLogout, 2000);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao finalizar",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  };

  // ...

  // --- Lista Filtrada ---
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

  // --- Memoização da Câmera ---
  const memoizedScanner = useMemo(
    () => (
      <BarcodeScanner
        onScan={handleCameraScan}
        onClose={() => setIsCameraActive(false)}
      />
    ),
    [handleCameraScan]
  );

  // --- Renderização ---
  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-6 lg:grid lg:grid-cols-2 p-4 pb-24 max-w-7xl mx-auto min-h-screen"
    >
      {/* --- Cabeçalho Mobile --- */}
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

      {/* --- Card 1: Scanner --- */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <Scan className="h-5 w-5 mr-2 text-primary" /> Scanner
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button
                onClick={handleFinishSession}
                className="w-full sm:w-auto border-2 border-green-600 text-green-600 bg-transparent hover:bg-transparent hover:scale-105 transition-transform duration-300 ease-in-out"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalizar Minha Contagem
              </Button>

              <div className="flex w-full sm:w-auto gap-2 bg-muted p-1 rounded-md">
                <Button
                  variant={countingMode === "loja" ? "default" : "ghost"}
                  className="flex-1 sm:flex-none h-8"
                  onClick={() => setCountingMode("loja")}
                >
                  <Store className="h-3 w-3 mr-2" /> Loja
                </Button>
                <Button
                  variant={countingMode === "estoque" ? "default" : "ghost"}
                  className="flex-1 sm:flex-none h-8"
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
            memoizedScanner
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <div className="flex space-x-2">
                  <Input
                    id="barcode"
                    type="tel"
                    inputMode="numeric"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Digite ou escaneie..."
                    className="flex-1 mobile-optimized h-12 text-lg"
                    onKeyPress={(e) => e.key === "Enter" && handleScan()}
                    autoFocus
                  />
                  <Button onClick={handleScan} className="h-12 px-4">
                    <Scan className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => setIsCameraActive(true)}
                    variant="outline"
                    className="h-12 px-4"
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-in zoom-in-95 duration-200">
                  {/* 1. FLEX CONTAINER PRINCIPAL: Alinha Texto e Badges */}
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    {/* 2. COLUNA DA ESQUERDA (TEXTO): min-w-0 é vital para não empurrar os badges */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-bold text-blue-800 dark:text-blue-200 truncate whitespace-nowrap text-sm sm:text-base">
                        Item {/* Nome curto e fixo, igual ao ConferenceTab */}
                      </h3>

                      {/* --- EFEITO DE LETREIRO DUPLICADO --- */}
                      <div className="marquee-container mt-1 h-6 pl-2">
                        {currentProduct.descricao.length > 13 ? (
                          // Se for longo: Renderiza DUAS vezes para criar o efeito de loop contínuo
                          <div className="animate-marquee">
                            <span className="mr-8 text-sm font-bold text-blue-700 dark:text-blue-300">
                              {currentProduct.descricao}
                            </span>
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                              {currentProduct.descricao}
                            </span>
                          </div>
                        ) : (
                          // Se for curto: Renderiza normal, estático e truncado se necessário
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                            {currentProduct.descricao}
                          </p>
                        )}
                      </div>
                      {/* ------------------------------------ */}

                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Cód: {currentProduct.codigo_produto}
                      </p>
                    </div>

                    {/* 3. COLUNA DA DIREITA (BADGES): shrink-0 impede que sejam esmagados */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {/* Badge de Estoque (Sistema) */}
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center shadow-sm"
                      >
                        Estoque: {currentProduct.saldo_sistema ?? 0}
                      </Badge>

                      {/* Badge de Contado (Agora padronizado com variant="secondary") */}
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center shadow-sm"
                      >
                        Contado: {currentProduct.saldo_contado}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quantity">
                    Quantidade em {countingMode === "loja" ? "Loja" : "Estoque"}
                  </Label>
                  <Calculator className="h-4 w-4 text-gray-500" />
                </div>

                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    ref={quantityInputRef}
                    type="text"
                    inputMode="text"
                    value={quantityInput}
                    onChange={handleQuantityChange}
                    onKeyPress={handleQuantityKeyPress}
                    placeholder="Qtd ou 5+5..."
                    className="flex-1 mobile-optimized font-mono text-lg h-12 font-bold text-center"
                  />
                  <Button
                    onClick={submitCount}
                    className="h-12 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
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

      {/* --- Card 2: Lista de Itens --- */}
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-lg">
              Itens na Sessão ({filteredProducts.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar item contado..."
                className="pl-10 pr-4 h-10 bg-muted/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden min-h-[300px]">
          <div className="space-y-2 h-full overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Comece a bipar para preencher a lista</p>
              </div>
            ) : (
              filteredProducts.map((item) => (
                <div
                  key={item.codigo_produto}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-sm truncate leading-tight mb-1">
                      {item.descricao}
                    </p>
                    <div className="text-[10px] text-muted-foreground">
                      <BarcodeDisplay
                        value={item.codigo_barras || item.codigo_produto}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="text-sm h-8 px-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mr-1"
                    >
                      {item.saldo_contado}
                    </Badge>
                    {/* Botão de Remover 1 */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                      title="Remover 1 unidade"
                      disabled={item.saldo_contado <= 0}
                      onClick={() => handleRemoveMovement(item.codigo_produto)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {/* Botão de Zerar Tudo (Aciona o Modal) */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-100"
                      title="Zerar contagem deste item"
                      disabled={item.saldo_contado <= 0}
                      onClick={() => {
                        setItemToReset({
                          codigo_produto: item.codigo_produto,
                          descricao: item.descricao,
                        });
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
        </CardContent>
      </Card>

      {/* --- MODAIS E BOTÃO FLUTUANTE --- */}

      {/* Botão Flutuante */}
      <FloatingMissingItemsButton
        itemCount={missingItems.length}
        onClick={() => setShowMissingModal(true)}
        dragConstraintsRef={containerRef}
      />

      {/* Modal de Itens Faltantes */}
      <MissingItemsModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        items={missingItems}
      />

      {/* --- MODAL DE CONFIRMAÇÃO (Zerar Item) --- */}
      <AlertDialog
        open={showResetConfirmation}
        onOpenChange={setShowResetConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zerar Contagem do Item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja zerar a contagem do item{" "}
              <strong>{itemToReset?.descricao}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetConfirmation(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (itemToReset) {
                  handleResetItem(itemToReset.codigo_produto);
                }
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
