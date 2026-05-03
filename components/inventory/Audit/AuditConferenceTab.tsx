// components/inventory/Audit/AuditConferenceTab.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
// Imports de Card foram removidos pois substituímos por divs
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeScanner } from "@/components/features/barcode-scanner";
import { AuditConfig } from "@/components/inventory/Audit/AuditSettingsTab";
import { ManualItemSheet } from "@/components/inventory/Audit/ManualItemSheet";
import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay"; // <-- IMPORT MANTIDO

import {
  Scan,
  Camera,
  Plus,
  Trash2,
  Search,
  Calculator,
  DollarSign,
  Package,
  Store,
  Eraser,
  Check,
  X,
  TrendingUp,
  CloudUpload,
} from "lucide-react";
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import {
  formatNumberBR,
  calculateExpression,
  formatCurrency,
} from "@/lib/utils";

interface AuditConferenceTabProps {
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
  handleAddCount: (quantity: number, price?: number) => void;
  handleAddManualItem: (desc: string, qty: number, price?: number) => void;
  productCounts: ProductCount[];
  handleRemoveCount: (id: number) => void;
  handleSaveCount: () => void;
  handleClearCountsOnly: () => void;
  auditConfig: AuditConfig;
  fileName: string;
  setFileName: (name: string) => void;
}

const ProductCountItem: React.FC<{
  item: ProductCount;
  onRemove: (id: number) => void;
}> = ({ item, onRemove }) => {
  const unitPrice = item.price || 0;
  const totalQty =
    (Number(item.quant_loja) || 0) +
    (Number(item.quant_estoque) || 0) +
    (Number(item.quantity) || 0);
  const totalValue = totalQty * unitPrice;

  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-lg mb-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="font-medium text-sm truncate" title={item.descricao}>
              {item.descricao}
            </p>
            {item.codigo_de_barras.startsWith("SEM-COD") && (
              <span className="text-[10px] text-blue-500 font-medium">
                Item Manual
              </span>
            )}
          </div>
          {unitPrice > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            >
              {formatCurrency(unitPrice)}
            </Badge>
          )}
        </div>

        {/* --- BARCODE DISPLAY ADICIONADO AQUI --- */}
        {!item.codigo_de_barras.startsWith("SEM-COD") && (
          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5">
            <div className="flex items-center gap-1 truncate">
              <span>Cód:</span>
              <BarcodeDisplay value={item.codigo_de_barras} />
            </div>
            {item.categoria && (
              <>
                <span className="hidden sm:inline mx-1">|</span>
                <span className="truncate">Cat: {item.categoria}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center space-x-2 mt-2">
          {item.quant_loja > 0 && (
            <Badge
              variant="outline"
              className="
                text-[10px] h-5 px-1.5 rounded-md font-medium
                border border-slate-200/60 bg-white/60 text-slate-900
                dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100
                backdrop-blur-md"
            >
              Loja: {formatNumberBR(item.quant_loja)}
            </Badge>
          )}
          {item.quant_estoque > 0 && (
            <Badge
              variant="outline"
              className="
                text-[10px] h-5 px-1.5 rounded-md font-medium
                border border-slate-200/60 bg-white/60 text-slate-900
                dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100
                backdrop-blur-md"
            >
              Estoque: {formatNumberBR(item.quant_estoque)}
            </Badge>
          )}
          {!item.quant_loja && !item.quant_estoque && (
            <Badge
              variant="outline"
              className="
                text-[10px] h-5 px-1.5 rounded-md font-medium
                border border-slate-200/60 bg-white/60 text-slate-900
                dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100
                backdrop-blur-md"
            >
              Qtd: {formatNumberBR(item.quantity)}
            </Badge>
          )}
          {totalValue > 0 && totalQty > 1 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            >
              Total: {formatCurrency(totalValue)}
            </Badge>
          )}
        </div>
      </div>
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
              onClick={() => onRemove(item.id)}
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

export function AuditConferenceTab({
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
  handleAddManualItem,
  productCounts,
  handleRemoveCount,
  handleSaveCount,
  handleClearCountsOnly,
  auditConfig,
  fileName,
  setFileName,
}: AuditConferenceTabProps) {
  const [priceInput, setPriceInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualSheetOpen, setIsManualSheetOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    const barcodeInput = document.getElementById("barcode");
    if (barcodeInput instanceof HTMLElement) {
      barcodeInput.focus();
    }
  }, []);

  useEffect(() => {
    if (currentProduct && !priceInput && auditConfig.collectPrice) {
      let productPrice = 0;
      if ("price" in currentProduct && currentProduct.price) {
        productPrice = currentProduct.price;
      } else if ("preco" in currentProduct && (currentProduct as any).preco) {
        productPrice = (currentProduct as any).preco;
      }
      if (productPrice > 0) {
        const formatted = productPrice.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setPriceInput(formatted);
      }
    } else if (!currentProduct) {
      setPriceInput("");
    }
  }, [currentProduct, auditConfig.collectPrice, priceInput]);

  useEffect(() => {
    if (!confirmClearAll) return;
    const t = setTimeout(() => setConfirmClearAll(false), 3500);
    return () => clearTimeout(t);
  }, [confirmClearAll]);

  const currentTotalCount = useMemo(() => {
    if (!currentProduct) return 0;
    const found = productCounts.find(
      (p) => p.codigo_produto === currentProduct.codigo_produto,
    );
    const loja = Number(found?.quant_loja || 0);
    const estoque = Number(found?.quant_estoque || 0);
    const geral = Number(found?.quantity || 0);
    return loja + estoque + geral;
  }, [currentProduct, productCounts]);

  const auditedTotalValue = useMemo(() => {
    return productCounts.reduce((acc, item) => {
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0);
      const price = Number(item.price) || 0;
      return acc + qty * price;
    }, 0);
  }, [productCounts]);

  const filteredProductCounts = useMemo(() => {
    const sortedCounts = [...productCounts].reverse();
    if (!searchQuery) return sortedCounts;
    return sortedCounts.filter(
      (item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_de_barras.includes(searchQuery),
    );
  }, [productCounts, searchQuery]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setPriceInput("");
      return;
    }
    const value = Number(rawValue) / 100;
    const formatted = value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setPriceInput(formatted);
  };

  const processAddition = () => {
    const { result, isValid } = calculateExpression(quantityInput);
    if (!isValid || result === 0) return;
    let price: number | undefined = undefined;
    if (auditConfig.collectPrice && priceInput) {
      const cleanPrice = priceInput.replace(/\./g, "").replace(",", ".");
      price = parseFloat(cleanPrice);
    }
    handleAddCount(result, price);
    setQuantityInput("");
    setPriceInput("");
    const barcodeInput = document.getElementById("barcode");
    if (barcodeInput) barcodeInput.focus();
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validValue = value.replace(/[^0-9+\-*/.,]/g, "");
    setQuantityInput(validValue);
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const hasMath = /[+\-*/]/.test(quantityInput);
      if (hasMath) {
        const { result, isValid } = calculateExpression(quantityInput);
        if (isValid) setQuantityInput(result.toString());
      } else {
        processAddition();
      }
    }
  };

  const handlePriceKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") processAddition();
  };

  return (
    // Grid usando lg:items-stretch garante que o tamanho natural é ditado pela coluna mais alta (Scanner)
    <div className="flex flex-col gap-8 lg:gap-6 lg:grid lg:grid-cols-2 w-full lg:items-stretch">
      <ManualItemSheet
        isOpen={isManualSheetOpen}
        onClose={() => setIsManualSheetOpen(false)}
        auditConfig={auditConfig}
        onConfirm={(data) => {
          handleAddManualItem(data.description, data.quantity, data.price);
        }}
      />

      {/* --- COLUNA ESQUERDA: Scanner/Audit --- */}
      {/* Esta coluna dita a altura base no Desktop */}
      <div className="flex flex-col gap-4 w-full lg:bg-card lg:border lg:border-border lg:shadow-sm lg:rounded-xl lg:p-6">
        {/* Header */}
        <div className="flex items-center mb-2">
          <Scan className="h-5 w-5 mr-2" />
          <span className="font-semibold text-lg">Scanner</span>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
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
            className="w-full sm:w-auto flex-1"
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

        {/* Conteúdo */}
        <div className="flex flex-col gap-4 mt-2">
          {isCameraViewActive ? (
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onClose={() => setIsCameraViewActive(false)}
            />
          ) : (
            <>
              <div className="space-y-2 w-full">
                <Label htmlFor="barcode">Código de Barras</Label>
                <div className="flex space-x-2 w-full">
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
                  <Button
                    onClick={() => setIsManualSheetOpen(true)}
                    title="Adicionar item manualmente"
                    variant="default"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setIsCameraViewActive(true)}
                    variant="outline"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          {currentProduct && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold truncate uppercase">
                  {currentProduct.descricao}
                </h3>
                <Badge
                  variant="secondary"
                  className="min-w-[90px] justify-center text-[10px]"
                >
                  Cont: {currentTotalCount}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-xs text-blue-900/70 dark:text-blue-200/70 font-mono">
                <span className="truncate">
                  Cód:{" "}
                  {("codigo_de_barras" in currentProduct
                    ? currentProduct.codigo_de_barras
                    : currentProduct.codigo_produto) || scanInput}
                </span>
                {"categoria" in currentProduct && currentProduct.categoria && (
                  <>
                    <span className="hidden sm:inline mx-1">|</span>
                    <span className="truncate">
                      Cat: {currentProduct.categoria}
                    </span>
                  </>
                )}
              </div>
              {(() => {
                const displayPrice =
                  ("price" in currentProduct ? currentProduct.price : 0) ||
                  ("preco" in currentProduct
                    ? (currentProduct as any).preco
                    : 0);
                if (displayPrice && displayPrice > 0) {
                  return (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Preço Cadastrado:{" "}
                      {formatCurrency(displayPrice)}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div
              className={auditConfig.collectPrice ? "col-span-1" : "col-span-2"}
            >
              <Label
                htmlFor="quantity"
                className="text-xs mb-1.5 block text-gray-500"
              >
                Quantidade
              </Label>
              <div className="relative">
                <Input
                  id="quantity"
                  value={quantityInput}
                  onChange={handleQuantityChange}
                  onKeyPress={handleQuantityKeyPress}
                  inputMode="decimal"
                  className="h-12 text-lg font-semibold pl-9"
                />
                <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            {auditConfig.collectPrice && (
              <div className="col-span-1">
                <Label
                  htmlFor="price"
                  className="text-xs mb-1.5 block text-gray-500"
                >
                  Preço Unitário (R$)
                </Label>
                <div className="relative">
                  <Input
                    id="price"
                    value={priceInput}
                    onChange={handlePriceChange}
                    onKeyPress={handlePriceKeyPress}
                    placeholder="0,00"
                    className="h-12 text-lg font-semibold pl-9 focus-visible:ring-blue-500 text-green-700 dark:text-green-500"
                    inputMode="numeric"
                  />
                  <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-green-600 dark:text-green-500" />
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={processAddition}
            className="w-full h-12 font-bold"
            disabled={!currentProduct || !quantityInput}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar item
          </Button>
        </div>
      </div>

      {/* --- COLUNA DIREITA: Lista --- */}
      {/* Wrapper relativo para herdar a altura do Grid no Desktop */}
      <div className="flex flex-col w-full lg:relative lg:h-full">
        {/* Card em si (Absolute no Desktop para travar o limite e não empurrar a tela toda) */}
        <div className="flex flex-col w-full gap-4 lg:gap-0 lg:absolute lg:inset-0 lg:bg-card lg:border lg:border-border lg:shadow-sm lg:rounded-xl">
          {/* PARTE 1: Cabeçalho e Busca */}
          <div className="w-full space-y-4 p-4 shrink-0 lg:p-6 lg:pb-4 lg:border-b lg:border-border/50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">
                Itens Contados ({productCounts.length})
              </span>
              {productCounts.length > 0 && (
                <div className="flex items-center gap-1">
                  {!confirmClearAll ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-transparent px-2"
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
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-transparent"
                        onClick={() => setConfirmClearAll(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* PARTE 2: Área da Lista + Rodapé */}
          {/* min-h-0 é obrigatório para o flexbox permitir a rolagem dos itens filhos sem estourar */}
          <div className="flex-1 flex flex-col overflow-hidden w-full bg-card border border-border rounded-xl shadow-sm p-4 lg:bg-transparent lg:border-none lg:rounded-none lg:shadow-none lg:p-6 min-h-0">
            {/* O max-h-[400px] segura a onda no mobile, e no Desktop o lg:max-h-none libera porque a altura absoluta já tá travando tudo */}
            <div className="space-y-2 overflow-y-auto pr-1 w-full flex-1 max-h-[400px] lg:max-h-none">
              {filteredProductCounts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 h-full flex flex-col items-center justify-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum item na lista</p>
                </div>
              ) : (
                filteredProductCounts.map((item) => (
                  <ProductCountItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemoveCount}
                  />
                ))
              )}
            </div>

            {/* Rodapé (Patrimônio) grudado embaixo */}
            {productCounts.length > 0 && (
              <div className="shrink-0 bg-muted/30 border-t border-border p-4 rounded-b-lg mt-4 lg:bg-transparent lg:p-0 lg:pt-4 lg:mt-6 lg:rounded-none">
                <div className="w-full flex justify-between items-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Patrimônio Auditado:
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-500">
                    {formatCurrency(auditedTotalValue)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
