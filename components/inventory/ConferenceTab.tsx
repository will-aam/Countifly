/**
 * Descrição: Aba principal de conferência (Modo Individual).
 * Responsabilidade: Gerenciar a contagem de itens, escaneamento e lista de conferência.
 */

import React, { useMemo } from "react";

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
  Calculator,
} from "lucide-react";

// --- Tipos ---
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import { formatNumberBR } from "@/lib/utils"; // <--- 1. Importe no topo

// --- Interfaces e Tipos ---
interface ConferenceTabProps {
  countingMode: "loja" | "estoque";
  setCountingMode: (mode: "loja" | "estoque") => void;
  scanInput: string;
  setScanInput: (value: string) => void;
  // ATUALIZADO: handleScan agora aceita um parâmetro booleano opcional
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
}

interface ProductCountItemProps {
  item: ProductCount;
  onRemove: (id: number) => void;
}

// --- Subcomponentes ---
const ProductCountItem: React.FC<ProductCountItemProps> = ({
  item,
  onRemove,
}) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate" title={item.descricao}>
        {item.descricao}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
        {/* AQUI: Formata o saldo do sistema */}
        Cód. Barras: {item.codigo_de_barras}| Sistema:{" "}
        {formatNumberBR(item.saldo_estoque)}
      </p>
      <div className="flex items-center space-x-2 mt-1">
        <Badge variant="outline" className="text-xs">
          {/* AQUI: Formata as contagens */}
          Loja: {formatNumberBR(item.quant_loja)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Estoque: {formatNumberBR(item.quant_estoque)}
        </Badge>
        <Badge
          variant={
            item.total === 0
              ? "secondary"
              : item.total > 0
              ? "outline"
              : "destructive"
          }
          className={`text-xs ${
            item.total > 0
              ? "bg-green-800 text-white hover:bg-green-900 border-transparent"
              : ""
          }`}
        >
          Total: {item.total > 0 ? "+" : ""}
          {formatNumberBR(item.total)}
        </Badge>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={() => onRemove(item.id)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);
ProductCountItem.displayName = "ProductCountItem";

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
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  // --- NOVO CÁLCULO: Total já contado do Item atual ---
  const currentTotalCount = useMemo(() => {
    if (!currentProduct) return 0;
    // Busca na lista de contagens se esse Item já existe
    const found = productCounts.find(
      (p) => p.codigo_produto === currentProduct.codigo_produto
    );
    return found ? found.total : 0;
  }, [currentProduct, productCounts]);
  // -------------------------------------------------------

  const filteredProductCounts = useMemo(() => {
    const sortedCounts = [...productCounts].sort((a, b) =>
      a.descricao.localeCompare(b.descricao)
    );

    if (!searchQuery) {
      return sortedCounts;
    }
    return sortedCounts.filter(
      (item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_de_barras.includes(searchQuery)
    );
  }, [productCounts, searchQuery]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permite caracteres matemáticos para a calculadora
    const validValue = value.replace(/[^0-9+\-*/\s.,]/g, "");
    setQuantityInput(validValue);
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Seção de Escaneamento e Entrada de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-4">
            <Scan className="h-5 w-5 mr-2" /> Scanner
          </CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button
                onClick={handleSaveCount}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Salvar Contagem
              </Button>

              <div className="flex w-full sm:w-auto gap-2">
                <Button
                  variant={countingMode === "loja" ? "default" : "outline"}
                  className="flex-1 sm:flex-none"
                  onClick={() => setCountingMode("loja")}
                >
                  <Store className="h-4 w-4 mr-2" /> Loja
                </Button>
                <Button
                  variant={countingMode === "estoque" ? "default" : "outline"}
                  className="flex-1 sm:flex-none"
                  onClick={() => setCountingMode("estoque")}
                >
                  <Package className="h-4 w-4 mr-2" /> Estoque
                </Button>
              </div>
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
                    onChange={(e) => {
                      // Mantém apenas números para o código de barras
                      const numericValue = e.target.value.replace(/\D/g, "");
                      setScanInput(numericValue);
                    }}
                    placeholder="Digite ou escaneie"
                    className="flex-1 mobile-optimized"
                    // ATUALIZADO: Enter é uma ação manual, deve forçar a busca
                    onKeyPress={(e) => e.key === "Enter" && handleScan(true)}
                  />
                  {/* ATUALIZADO: O Botão é a ação manual por excelência. Força a busca (true) */}
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
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  }`}
                >
                  {/* 1. FLEX CONTAINER PRINCIPAL: Alinha Texto e Badges */}
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    {/* 2. COLUNA DA ESQUERDA (TEXTO): min-w-0 é vital para não empurrar os badges */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3
                        className={`font-semibold truncate whitespace-nowrap text-sm sm:text-base pl-2 ${
                          "isTemporary" in currentProduct &&
                          currentProduct.isTemporary
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-green-800 dark:text-green-200"
                        }`}
                        title={
                          "isTemporary" in currentProduct &&
                          currentProduct.isTemporary
                            ? "Item Temporário"
                            : "Item Encontrado"
                        }
                      >
                        {"isTemporary" in currentProduct &&
                        currentProduct.isTemporary
                          ? "Item Temporário"
                          : "Item Encontrado"}
                      </h3>
                      {/* --- Container do Letreiro --- */}
                      <div className="marquee-container mt-1 h-6 pl-2">
                        {currentProduct.descricao.length > 15 ? (
                          <div className="animate-marquee">
                            {/* BLOCO 1: Original */}
                            <div className="flex items-center pr-12">
                              <span
                                className={`text-sm font-bold whitespace-nowrap ${
                                  "isTemporary" in currentProduct &&
                                  currentProduct.isTemporary
                                    ? "text-amber-700 dark:text-amber-300"
                                    : "text-green-700 dark:text-green-300"
                                }`}
                              >
                                {currentProduct.descricao}
                              </span>
                            </div>

                            {/* BLOCO 2: Cópia para o Loop */}
                            <div className="flex items-center pr-12">
                              <span
                                className={`text-sm font-bold whitespace-nowrap ${
                                  "isTemporary" in currentProduct &&
                                  currentProduct.isTemporary
                                    ? "text-amber-700 dark:text-amber-300"
                                    : "text-green-700 dark:text-green-300"
                                }`}
                              >
                                {currentProduct.descricao}
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Se for curto, não anima, só exibe estático
                          <p
                            className={`text-sm font-bold truncate ${
                              "isTemporary" in currentProduct &&
                              currentProduct.isTemporary
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-green-700 dark:text-green-300"
                            }`}
                          >
                            {currentProduct.descricao}
                          </p>
                        )}
                      </div>
                      {/* ---------------------------------------------------------- */}

                      <p
                        className={`text-xs mt-1 pl-2 ${
                          "isTemporary" in currentProduct &&
                          currentProduct.isTemporary
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        Cód. Barras: {scanInput}
                      </p>
                    </div>

                    {/* 3. COLUNA DA DIREITA (BADGES): shrink-0 impede que sejam esmagados ou jogados pra fora */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center shadow-sm"
                      >
                        Estoque: {formatNumberBR(currentProduct.saldo_estoque)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center shadow-sm"
                      >
                        Contado: {formatNumberBR(currentTotalCount)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="quantity">
                      Quantidade{" "}
                      {countingMode === "loja" ? "em Loja" : "em Estoque"}
                    </Label>
                    <Calculator className="h-4 w-4 text-gray-500" />
                  </div>

                  <Input
                    id="quantity"
                    type="text"
                    inputMode="text"
                    value={quantityInput}
                    onChange={handleQuantityChange}
                    onKeyPress={handleQuantityKeyPress}
                    placeholder="Qtd ou expressão"
                    className="flex-1 mobile-optimized font-mono"
                  />

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Digite o número ou expressão matemática (ex: 10, 5+3, 20-2,
                    5*4, 20/5). Pressione Enter para calcular.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleAddCount}
                className="w-full mobile-button"
                disabled={!currentProduct || !quantityInput}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contagem de{" "}
                {countingMode === "loja" ? "Loja" : "Estoque"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção de Lista de Itens Contados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-lg">
              Itens Contados ({productCounts.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por descrição ou código..."
                className="pl-10 pr-4 h-10 text-sm bg-background border-input shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:border-ring"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProductCounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">
                  {searchQuery
                    ? `Nenhum Item encontrado para "${searchQuery}"`
                    : "Nenhum Item contado ainda"}
                </p>
                <p className="text-sm">
                  {!searchQuery && "Escaneie um código para começar"}
                </p>
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
};
ConferenceTab.displayName = "ConferenceTab";
