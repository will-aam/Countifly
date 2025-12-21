"use client";

import React, { useState, useMemo } from "react";
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
import { BarcodeScanner } from "@/components/features/barcode-scanner";
import { AuditConfig } from "@/components/inventory/Audit/AuditSettingsTab";
// IMPORT ATUALIZADO PARA O SHEET
import { ManualItemSheet } from "@/components/inventory/Audit/ManualItemSheet";
import {
  Scan,
  Camera,
  Plus,
  Trash2,
  Search,
  Calculator,
  DollarSign,
  FileSignature,
  Package,
  Store,
  PackagePlus,
} from "lucide-react";
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import { formatNumberBR, calculateExpression } from "@/lib/utils";

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
  handleQuantityKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleAddCount: (quantity: number, price?: number) => void;
  handleAddManualItem: (desc: string, qty: number, price?: number) => void;
  productCounts: ProductCount[];
  handleRemoveCount: (id: number) => void;
  handleSaveCount: () => void;
  auditConfig: AuditConfig;
  fileName: string;
  setFileName: (name: string) => void;
}

const ProductCountItem: React.FC<{
  item: any;
  onRemove: (id: number) => void;
}> = ({ item, onRemove }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start pr-2">
        <div className="flex flex-col">
          <p className="font-medium text-sm truncate" title={item.descricao}>
            {item.descricao}
          </p>
          {item.codigo_de_barras.startsWith("SEM-COD") && (
            <span className="text-[10px] text-blue-500 font-medium">
              Item Manual
            </span>
          )}
        </div>
        {item.price && (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-none whitespace-nowrap ml-2"
          >
            R$ {formatNumberBR(item.price)}
          </Badge>
        )}
      </div>
      {!item.codigo_de_barras.startsWith("SEM-COD") && (
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
          Cód: {item.codigo_de_barras}
        </p>
      )}
      <div className="flex items-center space-x-2 mt-2">
        {item.quant_loja > 0 && (
          <Badge
            variant="outline"
            className="text-xs border-blue-200 text-blue-700"
          >
            Loja: {formatNumberBR(item.quant_loja)}
          </Badge>
        )}
        {item.quant_estoque > 0 && (
          <Badge
            variant="outline"
            className="text-xs border-amber-200 text-amber-700"
          >
            Estoque: {formatNumberBR(item.quant_estoque)}
          </Badge>
        )}
        {!item.quant_loja && !item.quant_estoque && (
          <Badge variant="outline" className="text-xs">
            Qtd: {formatNumberBR(item.quantity)}
          </Badge>
        )}
      </div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
      onClick={() => onRemove(item.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);

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
  auditConfig,
  fileName,
  setFileName,
}: AuditConferenceTabProps) {
  const [priceInput, setPriceInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Estado controla a abertura do Sheet agora
  const [isManualSheetOpen, setIsManualSheetOpen] = useState(false);

  const currentTotalCount = useMemo(() => {
    if (!currentProduct) return 0;
    const found = productCounts.find(
      (p) => p.codigo_produto === currentProduct.codigo_produto
    );
    const loja = Number(found?.quant_loja || 0);
    const estoque = Number(found?.quant_estoque || 0);
    const geral = Number(found?.quantity || 0);
    return loja + estoque + geral;
  }, [currentProduct, productCounts]);

  const filteredProductCounts = useMemo(() => {
    const sortedCounts = [...productCounts].reverse();
    if (!searchQuery) return sortedCounts;
    return sortedCounts.filter(
      (item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_de_barras.includes(searchQuery)
    );
  }, [productCounts, searchQuery]);

  const processAddition = () => {
    const { result, isValid } = calculateExpression(quantityInput);

    if (!isValid || result === 0) return;

    let price: number | undefined = undefined;
    if (auditConfig.collectPrice && priceInput) {
      const sanitizedPrice = priceInput
        .replace("R$", "")
        .trim()
        .replace(",", ".");
      price = parseFloat(sanitizedPrice);
    }

    handleAddCount(result, price);
    setQuantityInput("");
    setPriceInput("");
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* SHEET DE ITEM MANUAL (Lado Direito) */}
      <ManualItemSheet
        isOpen={isManualSheetOpen}
        onClose={() => setIsManualSheetOpen(false)}
        auditConfig={auditConfig}
        onConfirm={(data) => {
          handleAddManualItem(data.description, data.quantity, data.price);
        }}
      />

      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Auditoria
            </span>
            <div className="flex gap-2">
              {auditConfig.collectPrice && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-green-100 text-green-800"
                >
                  Valor Ativo
                </Badge>
              )}
            </div>
          </CardTitle>

          <div className="flex w-full gap-2 mt-2">
            <Button
              variant={countingMode === "loja" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setCountingMode("loja")}
            >
              <Store className="h-4 w-4 mr-2" /> Loja
            </Button>
            <Button
              variant={countingMode === "estoque" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setCountingMode("estoque")}
            >
              <Package className="h-4 w-4 mr-2" /> Estoque
            </Button>
          </div>

          {auditConfig.enableCustomName && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FileSignature className="h-3 w-3" /> Nome da Contagem
              </Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Ex: Corredor B - Matinais"
                className="h-9 text-sm"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Scanner */}
          {isCameraViewActive ? (
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              onClose={() => setIsCameraViewActive(false)}
            />
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={scanInput}
                    onChange={(e) =>
                      setScanInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Bipar código..."
                    className="pl-10 h-12 text-lg"
                    onKeyPress={(e) => e.key === "Enter" && handleScan(true)}
                    autoFocus
                  />
                  <Scan className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                <Button
                  onClick={() => setIsCameraViewActive(true)}
                  variant="outline"
                  className="h-12 w-12 p-0"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => setIsManualSheetOpen(true)}
                  className="h-12 w-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  title="Adicionar item manualmente"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}

          {currentProduct && (
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-lg border border-blue-100 dark:border-blue-900 animate-in fade-in slide-in-from-top-2">
              <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100 leading-tight">
                {currentProduct.descricao}
              </h3>
              <div className="flex justify-between items-end mt-2">
                <span className="text-xs text-blue-600 font-mono bg-blue-100 px-2 py-1 rounded">
                  {scanInput}
                </span>
                <Badge variant="outline" className="bg-white dark:bg-black">
                  Total já contado: {currentTotalCount}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div
              className={auditConfig.collectPrice ? "col-span-1" : "col-span-2"}
            >
              <Label className="text-xs mb-1.5 block text-gray-500">
                Quantidade ({countingMode === "loja" ? "Loja" : "Estoque"})
              </Label>
              <div className="relative">
                <Input
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  onKeyPress={handleQuantityKeyPress}
                  // placeholder="Qtd (ex: 5+5)"
                  className="h-12 text-lg font-semibold pl-9"
                  inputMode="text"
                />
                <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {auditConfig.collectPrice && (
              <div className="col-span-1">
                <Label className="text-xs mb-1.5 block text-gray-500">
                  Preço Unitário
                </Label>
                <div className="relative">
                  <Input
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onKeyPress={handlePriceKeyPress}
                    placeholder="0,00"
                    className="h-12 text-lg font-semibold pl-9 border-green-200 focus-visible:ring-green-500"
                    inputMode="decimal"
                  />
                  <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-green-600" />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={processAddition}
            className="w-full h-12 text-base font-semibold shadow-lg transition-all active:scale-95"
            disabled={!currentProduct || !quantityInput}
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Adicionar item
          </Button>
        </CardContent>
      </Card>

      <Card className="flex flex-col h-[500px] lg:h-auto">
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filtrar lançamentos..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-2">
            {filteredProductCounts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum item lançado</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
