// components/inventory/ConferenceTab.tsx

/**
 * Descrição: Aba principal de conferência (Modo Individual).
 * Responsabilidade: Gerenciar a contagem, foco automático e visualização de diferenças
 */
import React, { useMemo, useState, useEffect } from "react";

// --- Componentes de UI ---
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // CORREÇÃO: Importar do shadcn/ui

// --- Componentes de Funcionalidades ---
import { BarcodeScanner } from "@/components/features/barcode-scanner";

// --- Ícones ---
import {
  CloudUpload,
  Scan,
  Store,
  Package,
  Camera,
  Plus,
  Trash2,
  Search,
  Eraser,
  Check,
  X,
  Calculator,
} from "lucide-react";

// --- Tipos e Utils ---
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import { formatNumberBR } from "@/lib/utils";

interface ConferenceTabProps {
  countingMode: "loja" | "estoque";
  setCountingMode: (mode: "loja" | "estoque") => void;

  scanInput: string;
  setScanInput: (value: string) => void;
  handleScan: (isManualAction?: boolean) => void;

  isCameraViewActive: boolean;
  setIsCameraViewActive: (show: boolean) => void;
  handleBarcodeScanned: (barcode: string) => void;

  currentProduct: Product | TempProduct | null;

  quantityInput: string;
  setQuantityInput: (value: string) => void;

  handleAddCount: () => void;

  productCounts: ProductCount[];
  handleRemoveCount: (id: number) => void;

  handleSaveCount: () => void;
  handleClearCountsOnly: () => void;
}

// --- Subcomponente do Item da Lista ---
const ProductCountItem: React.FC<{
  item: ProductCount;
  onConfirmDelete: (id: number) => void;
}> = ({ item, onConfirmDelete }) => {
  const qtdLoja = Number(item.quant_loja || 0);
  const qtdEstoque = Number(item.quant_estoque || 0);

  // A diferença é o que foi contado (Loja + Estoque) menos o que o sistema diz ter
  const dif = qtdLoja + qtdEstoque - Number(item.saldo_estoque);

  const [confirming, setConfirming] = useState(false);

  // Clean: confirma some sozinho depois de um tempo
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg mb-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate uppercase">
          {item.descricao}
        </p>

        <p className="text-xs text-gray-600 dark:text-gray-400 truncate font-mono mt-0.5">
          Cód: {item.codigo_de_barras} | Sistema:{" "}
          {formatNumberBR(item.saldo_estoque)}
        </p>

        <div className="flex items-center space-x-2 mt-1.5">
          <Badge
            variant="outline"
            className="
              text-[10px] h-5 px-1.5 rounded-md font-medium
              border border-slate-200/60 bg-white/60 text-slate-900
              dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100
              backdrop-blur-md
            "
          >
            Loja: {formatNumberBR(qtdLoja)}
          </Badge>

          <Badge
            variant="outline"
            className="
              text-[10px] h-5 px-1.5 rounded-md font-medium
              border border-slate-200/60 bg-white/60 text-slate-900
              dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100
              backdrop-blur-md
            "
          >
            Estoque: {formatNumberBR(qtdEstoque)}
          </Badge>

          <Badge
            variant="outline"
            className={`text-[10px] h-5 px-1.5 rounded-md bg-transparent ${
              dif > 0
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : dif < 0
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            }`}
          >
            Dif: {dif > 0 ? "+" : ""}
            {formatNumberBR(dif)}
          </Badge>
        </div>
      </div>

      {/* Ação direita: lixeira OU confirmação inline (bem clean, sem texto) */}
      <div className="ml-2 shrink-0">
        {!confirming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-transparent transition-colors"
            aria-label="Excluir item"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfirmDelete(item.id)}
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-transparent"
              aria-label="Confirmar exclusão"
              title="Confirmar"
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
              aria-label="Cancelar exclusão"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Componente Principal ---
export const ConferenceTab: React.FC<ConferenceTabProps> = ({
  countingMode,
  setCountingMode,
  scanInput,
  setScanInput,
  handleScan,
  isCameraViewActive,
  setIsCameraViewActive,
  handleBarcodeScanned,
  currentProduct,
  quantityInput,
  setQuantityInput,

  handleAddCount,
  productCounts,
  handleRemoveCount,
  handleSaveCount,
  handleClearCountsOnly,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Efeito para pular o foco para a Quantidade assim que um produto for identificado
  useEffect(() => {
    if (currentProduct) {
      const qtyInput = document.getElementById("quantity");
      if (qtyInput) qtyInput.focus();
    }
  }, [currentProduct]);

  // Auto-cancelar confirmação de limpar após alguns segundos
  useEffect(() => {
    if (!confirmClearAll) return;
    const t = setTimeout(() => setConfirmClearAll(false), 3500);
    return () => clearTimeout(t);
  }, [confirmClearAll]);

  const currentTotalCount = useMemo(() => {
    if (!currentProduct) return 0;

    const found = productCounts.find(
      (p) => p.codigo_produto === currentProduct.codigo_produto
    );

    return found
      ? Number(found.quant_loja || 0) + Number(found.quant_estoque || 0)
      : 0;
  }, [currentProduct, productCounts]);

  const filteredProductCounts = useMemo(() => {
    const reversed = [...productCounts].reverse();
    if (!searchQuery) return reversed;

    return reversed.filter(
      (item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_de_barras.includes(searchQuery)
    );
  }, [productCounts, searchQuery]);

  // Wrapper para garantir foco de volta no código de barras após adicionar
  const onAddClick = () => {
    handleAddCount();
    setTimeout(() => document.getElementById("barcode")?.focus(), 100);
  };

  function handleCalculo() {
    if (!quantityInput) return;

    try {
      // normaliza vírgula para ponto
      const normalized = quantityInput.replace(/,/g, ".");

      // cálculo simples (assumindo confiança no input)
      const result = Function(`"use strict"; return (${normalized})`)();

      if (Number.isFinite(result)) {
        setQuantityInput(String(result));
      }
    } catch {
      // se der erro, não faz nada (ou mostra toast)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-4">
            <Scan className="h-5 w-5 mr-2" /> Scanner
          </CardTitle>

          <CardDescription>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button
                onClick={handleSaveCount}
                variant="default"
                className="w-full sm:w-auto"
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Salvar Contagem
              </Button>

              <Tabs
                value={countingMode}
                onValueChange={(v) => setCountingMode(v as "loja" | "estoque")}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-md bg-muted p-1">
                  <TabsTrigger
                    value="loja"
                    className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Store className="h-3 w-3" />
                    Loja
                  </TabsTrigger>

                  <TabsTrigger
                    value="estoque"
                    className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <Package className="h-3 w-3" />
                    Estoque
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isCameraViewActive ? (
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onClose={() => setIsCameraViewActive(false)}
            />
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
                    onChange={(e) =>
                      setScanInput(e.target.value.replace(/\D/g, ""))
                    }
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleScan(true);
                      }
                    }}
                  />

                  <Button onClick={() => handleScan(true)}>
                    <Scan className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => setIsCameraViewActive(true)}
                    variant="outline"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div
                  className={`p-4 border rounded-lg ${
                    "isTemporary" in currentProduct &&
                    currentProduct.isTemporary
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-semibold truncate text-xs uppercase opacity-70">
                        {"isTemporary" in currentProduct &&
                        currentProduct.isTemporary
                          ? "Item Temporário"
                          : "Item Encontrado"}
                      </h3>

                      <p className="text-sm font-bold truncate uppercase mt-1">
                        {currentProduct.descricao}
                      </p>

                      <p className="text-[11px] mt-1 font-mono">
                        Cód: {scanInput}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="secondary"
                        className="min-w-[90px] justify-center text-[10px]"
                      >
                        Sist:{" "}
                        {formatNumberBR(currentProduct.saldo_estoque || 0)}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="min-w-[90px] justify-center text-[10px]"
                      >
                        Cont: {formatNumberBR(currentTotalCount)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantidade{" "}
                  {countingMode === "loja" ? "em Loja" : "em Estoque"}
                </Label>

                <div className="relative">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCalculo();
                    }}
                  >
                    <Input
                      id="quantity"
                      type="tel"
                      value={quantityInput}
                      onChange={(e) =>
                        setQuantityInput(
                          e.target.value.replace(/[^0-9+\-*/.,]/g, "")
                        )
                      }
                      inputMode="decimal"
                      className="h-12 text-lg font-semibold pl-9"
                    />

                    {/* botão invisível só para o Enter funcionar */}
                    <button type="submit" className="hidden" />
                  </form>

                  <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <Button
                onClick={onAddClick}
                className="w-full h-12 font-bold"
                disabled={!currentProduct || !quantityInput}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Itens Contados ({productCounts.length})
            </CardTitle>

            {productCounts.length > 0 && (
              <div className="flex items-center gap-1">
                {!confirmClearAll ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-transparent"
                    onClick={() => setConfirmClearAll(true)}
                    title="Limpar itens"
                  >
                    <Eraser className="h-4 w-4 mr-1.5" /> Limpar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 hover:bg-transparent"
                      onClick={() => {
                        handleClearCountsOnly();
                        setConfirmClearAll(false);
                      }}
                      aria-label="Confirmar limpar"
                      title="Confirmar"
                    >
                      <Check className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-transparent"
                      onClick={() => setConfirmClearAll(false)}
                      aria-label="Cancelar limpar"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredProductCounts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum item na lista</p>
              </div>
            ) : (
              filteredProductCounts.map((item) => (
                <ProductCountItem
                  key={item.id}
                  item={item}
                  onConfirmDelete={(id) => handleRemoveCount(id)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

ConferenceTab.displayName = "ConferenceTab";
