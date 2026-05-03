// components/inventory/ConferenceTab.tsx
/**
 * Descrição: Aba principal de conferência (Modo Individual / Importação).
 * Responsabilidade: Gerenciar a contagem, foco automático e visualização de diferenças (Comparação com Sistema)
 */

"use client";

import React, { useMemo, useState, useEffect } from "react";

// --- Componentes de UI ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Componentes de Funcionalidades ---
import { BarcodeScanner } from "@/components/features/barcode-scanner";
import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay"; // <-- IMPORT ADICIONADO AQUI

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
  handleQuantityKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;

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

  const dif = qtdLoja + qtdEstoque - Number(item.saldo_estoque);

  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <div
      className="
    flex items-center justify-between p-3 rounded-lg mb-2
    bg-blue-100 border border-blue-300
    dark:bg-primary/5 dark:border-primary/10
  "
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate uppercase">
          {item.descricao}
        </p>

        {/* --- BARCODE DISPLAY ADICIONADO AQUI --- */}
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
          <span className="font-mono">Cód:</span>
          <BarcodeDisplay value={item.codigo_de_barras} />
          <span className="font-mono truncate">
            | Imp: {formatNumberBR(item.saldo_estoque)}
          </span>
        </div>

        <div className="flex items-center space-x-2 mt-1.5">
          <Badge
            variant="outline"
            className="
  text-[10px] h-5 px-1.5 rounded-md font-medium
  border border-slate-300 bg-white/60 text-slate-900
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
  border border-slate-300 bg-white/60 text-slate-900
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

      <div className="ml-2 shrink-0">
        {!confirming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-transparent transition-colors"
            aria-label="Excluir item"
            title="Excluir item"
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
  handleQuantityKeyPress,
  handleAddCount,
  productCounts,
  handleRemoveCount,
  handleSaveCount,
  handleClearCountsOnly,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    const barcodeInput = document.getElementById("barcode");
    if (barcodeInput instanceof HTMLElement) {
      barcodeInput.focus();
    }
  }, []);

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
        item.codigo_de_barras.includes(searchQuery),
    );
  }, [productCounts, searchQuery]);

  const onAddClick = () => {
    handleAddCount();
    setTimeout(() => document.getElementById("barcode")?.focus(), 100);
  };

  function handleCalculo() {
    if (!quantityInput) return;
    try {
      const normalized = quantityInput.replace(/,/g, ".");
      const result = Function(`"use strict"; return (${normalized})`)();
      if (Number.isFinite(result)) {
        setQuantityInput(String(result));
      }
    } catch {
      // erro silencioso ou toast
    }
  }

  return (
    // 1. Removemos o lg:items-start para permitir que a Grade (Grid) iguale a altura das duas colunas
    <div className="flex flex-col gap-8 lg:gap-6 lg:grid lg:grid-cols-2 w-full lg:items-stretch">
      {/* --- COLUNA ESQUERDA: Scanner e Inputs --- */}
      {/* É esta coluna que vai ditar a altura oficial da tela no Desktop */}
      <div className="flex flex-col gap-4 w-full lg:rounded-xl lg:border lg:border-border lg:shadow-sm lg:bg-card lg:p-6">
        {/* Cabeçalho */}
        <div className="flex items-center mb-2">
          <Scan className="h-5 w-5 mr-2" />
          <span className="font-semibold text-lg">Scanner</span>
        </div>

        {/* Ações e Modo */}
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

        {/* Conteúdo do Scanner */}
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
                    className="flex-1 w-full"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleScan(true);
                    }}
                  />
                  <Button onClick={() => handleScan(true)} type="button">
                    <Scan className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setIsCameraViewActive(true)}
                    variant="outline"
                    type="button"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentProduct && (
                <div
                  className={`p-4 border rounded-lg w-full ${"isTemporary" in currentProduct && currentProduct.isTemporary ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}
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

              <div className="space-y-2 w-full">
                <Label htmlFor="quantity">
                  Quantidade{" "}
                  {countingMode === "loja" ? "em Loja" : "em Estoque"}
                </Label>
                <div className="relative w-full">
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
                          e.target.value.replace(/[^0-9+\-*/.,]/g, ""),
                        )
                      }
                      onKeyDown={handleQuantityKeyPress}
                      inputMode="decimal"
                      className="h-12 text-lg font-semibold pl-9 w-full"
                    />
                    <button type="submit" className="hidden" />
                  </form>
                  <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <Button
                onClick={onAddClick}
                className="w-full h-12 font-bold"
                disabled={!currentProduct || !quantityInput}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: Lista de Itens --- */}
      {/* 2. O Wrapper relativo: Ele ganha a altura da Coluna Esquerda no Desktop */}
      <div className="flex flex-col w-full lg:relative lg:h-full">
        {/* 3. O Card em si (Absolute): Ele preenche a altura exata do wrapper, travando o crescimento infinito */}
        <div className="flex flex-col w-full gap-4 lg:gap-0 lg:absolute lg:inset-0 lg:rounded-xl lg:border lg:border-border lg:shadow-sm lg:bg-card">
          {/* PARTE 1: Cabeçalho e Busca */}
          <div className="space-y-4 w-full shrink-0 lg:p-6 lg:pb-4 lg:border-b lg:border-border/50">
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
                      title="Limpar contagens"
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

          {/* PARTE 2: Área da Lista */}
          {/* O min-h-0 no contêiner-pai é OBRIGATÓRIO no Flexbox para a barra de rolagem funcionar e não estourar o layout */}
          <div className="flex-1 flex flex-col overflow-hidden w-full p-4 bg-card border border-border rounded-xl shadow-sm lg:p-6 lg:bg-transparent lg:border-none lg:rounded-none lg:shadow-none min-h-0">
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
                    onConfirmDelete={(id) => handleRemoveCount(id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ConferenceTab.displayName = "ConferenceTab";
