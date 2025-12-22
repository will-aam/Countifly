// components/inventory/ConferenceTab.tsx
/**
 * Descrição: Aba principal de conferência (Modo Individual).
 * Responsabilidade: Gerenciar a contagem de itens, escaneamento e lista de conferência.
 */

import React, { useMemo, useState } from "react";

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
  AlertTriangle,
} from "lucide-react";

// --- Tipos ---
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import { formatNumberBR } from "@/lib/utils";

// --- Interfaces e Tipos ---
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
  handleRemoveCount: (id: number) => void; // VOLTAMOS PARA ID (NUMBER)
  handleSaveCount: () => void;
}

// --- Subcomponente do Item da Lista (Design Restaurado) ---
const ProductCountItem: React.FC<{
  item: ProductCount;
  onDeleteClick: (item: ProductCount) => void;
}> = ({ item, onDeleteClick }) => {
  // Recalcula totais para garantir exibição correta
  const qtdLoja = Number(item.quant_loja || 0);
  const qtdEstoque = Number(item.quant_estoque || 0);
  const total = qtdLoja + qtdEstoque;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" title={item.descricao}>
          {item.descricao}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate font-mono mt-0.5">
          Cód: {item.codigo_de_barras} | Sistema:{" "}
          {formatNumberBR(item.saldo_estoque)}
        </p>

        {/* Badges Restauradas */}
        <div className="flex items-center space-x-2 mt-1.5">
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200"
          >
            Loja: {formatNumberBR(qtdLoja)}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-700 border-purple-200"
          >
            Estoque: {formatNumberBR(qtdEstoque)}
          </Badge>
          <Badge
            variant={total === 0 ? "secondary" : "default"}
            className={`text-[10px] h-5 px-1.5 ${
              total > 0 ? "bg-green-600 hover:bg-green-700" : ""
            }`}
          >
            Total: {total > 0 ? "+" : ""}
            {formatNumberBR(total)}
          </Badge>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDeleteClick(item)}
        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
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
  const [searchQuery, setSearchQuery] = useState("");

  // --- Estados para o Modal de Exclusão ---
  const [itemToDelete, setItemToDelete] = useState<ProductCount | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Calcula total atual do item selecionado (para badge ao lado do nome no scanner)
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
    // Ordena por ordem de inserção (últimos primeiro) ou alfabética
    // Aqui mantivemos a ordem inversa de inserção para ver o último item bipado no topo
    const reversedCounts = [...productCounts].reverse();

    if (!searchQuery) {
      return reversedCounts;
    }
    return reversedCounts.filter(
      (item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_de_barras.includes(searchQuery)
    );
  }, [productCounts, searchQuery]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const validValue = value.replace(/[^0-9+\-*/\s.,]/g, "");
    setQuantityInput(validValue);
  };

  // --- Função para Confirmar Exclusão ---
  const confirmDelete = () => {
    if (itemToDelete) {
      // Passa o ID numérico, como o hook espera
      handleRemoveCount(itemToDelete.id);
      setItemToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      {/* Seção 1: Scanner e Input */}
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
                      const numericValue = e.target.value.replace(/\D/g, "");
                      setScanInput(numericValue);
                    }}
                    placeholder="Digite ou escaneie"
                    className="flex-1 mobile-optimized"
                    onKeyPress={(e) => e.key === "Enter" && handleScan(true)}
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
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3
                        className={`font-semibold truncate text-sm sm:text-base pl-2 ${
                          "isTemporary" in currentProduct &&
                          currentProduct.isTemporary
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-green-800 dark:text-green-200"
                        }`}
                      >
                        {"isTemporary" in currentProduct &&
                        currentProduct.isTemporary
                          ? "Item Temporário"
                          : "Item Encontrado"}
                      </h3>
                      <div className="mt-1 pl-2">
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
                      </div>
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

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="min-w-[100px] justify-center shadow-sm"
                      >
                        Estoque:{" "}
                        {formatNumberBR(currentProduct.saldo_estoque || 0)}
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
                    Digite o número ou expressão matemática (ex: 10, 5+3). Enter
                    para calcular.
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

      {/* Seção 2: Lista de Itens */}
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
                  key={item.id} // ID é único
                  item={item}
                  onDeleteClick={(i) => {
                    setItemToDelete(i);
                    setShowDeleteDialog(true);
                  }}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o item{" "}
              <strong>{itemToDelete?.descricao}</strong> da contagem?
              <br />
              <span className="text-xs text-muted-foreground">
                (Isso removerá todo o registro deste item desta sessão)
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
ConferenceTab.displayName = "ConferenceTab";
