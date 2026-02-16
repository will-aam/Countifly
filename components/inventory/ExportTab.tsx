// components/inventory/ExportTab.tsx
/**
 * Descrição: Aba para exportação e salvamento da contagem de inventário.
 * Responsabilidade: Exibir um resumo do progresso e uma prévia DETALHADA (Loja/Estoque/Barra) dos dados.
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Ícones ---
import {
  CloudUpload,
  Download,
  Table as TableIcon,
  Pencil,
} from "lucide-react";

// --- Tipos e Utils ---
import type { Product, TempProduct, ProductCount, BarCode } from "@/lib/types";
import { formatNumberBR } from "@/lib/utils";

/**
 * Props para o componente ExportTab.
 */
interface ExportTabProps {
  products: Product[];
  barCodes: BarCode[];
  tempProducts: TempProduct[];
  productCounts: ProductCount[];
  productCountsStats: {
    totalLoja: number;
    totalEstoque: number;
  };
  exportToCsv: () => void;
  handleSaveCount: () => void;
  setShowMissingItemsModal: (show: boolean) => void;
  onEditTempItemDescription: (itemId: number, newDescription: string) => void; // ✅ NOVA PROP
}

/**
 * Componente ExportTab.
 */
export const ExportTab: React.FC<ExportTabProps> = ({
  products,
  barCodes,
  tempProducts,
  productCounts,
  productCountsStats,
  exportToCsv,
  handleSaveCount,
  setShowMissingItemsModal,
  onEditTempItemDescription, // ✅ NOVA PROP
}) => {
  // ✅ Estado para controlar qual item está sendo editado
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // 1. FILTRO: Isola apenas os produtos que NÃO SÃO FIXOS
  const importedProductsOnly = useMemo(() => {
    return products.filter((p) => p.tipo_cadastro !== "FIXO");
  }, [products]);

  // 2. CORREÇÃO DO ERRO TS & Lógica de Faltantes
  const missingItemsCount = Math.max(
    0,
    importedProductsOnly.length -
      productCounts.filter(
        (p) => p.codigo_produto && !p.codigo_produto.startsWith("TEMP"),
      ).length,
  );

  // 3. Lógica dos Dados (Usando a lista filtrada 'importedProductsOnly')
  // 3. Lógica dos Dados (CORRIGIDA: Inclui itens temporários)
  const previewData = useMemo(() => {
    const countMap = new Map(
      productCounts.map((count) => [count.codigo_produto, count]),
    );

    // ✅ PARTE 1: Produtos importados da planilha
    const importedItems = importedProductsOnly.map((product) => {
      const count = countMap.get(product.codigo_produto);

      // Busca o código de barras vinculado ao produto_id
      const barcodeObj = barCodes.find((bc) => bc.produto_id === product.id);
      const barcode = barcodeObj?.codigo_de_barras || "N/A";

      const quantLoja = count?.quant_loja || 0;
      const quantEstoque = count?.quant_estoque || 0;
      const totalContado = quantLoja + quantEstoque;
      const saldoSistema = Number(product.saldo_estoque) || 0;
      const diferenca = totalContado - saldoSistema;

      return {
        id: count?.id || 0,
        codigo: product.codigo_produto,
        barcode,
        descricao: product.descricao,
        saldoSistema,
        quantLoja,
        quantEstoque,
        diferenca,
        isTempItem: false, // ✅ Produtos importados não são temporários
      };
    });

    // ✅ PARTE 2: Itens temporários (que não estão na planilha)
    const tempItems = productCounts
      .filter((count) => {
        // Só pega itens que começam com TEMP- (temporários)
        return count.codigo_produto?.startsWith("TEMP-");
      })
      .map((count) => {
        const quantLoja = count.quant_loja || 0;
        const quantEstoque = count.quant_estoque || 0;
        const totalContado = quantLoja + quantEstoque;
        const diferenca = totalContado; // Itens temporários não têm saldo sistema

        return {
          id: count.id || 0,
          codigo: count.codigo_produto,
          barcode: count.codigo_de_barras || "N/A",
          descricao: count.descricao,
          saldoSistema: 0, // Temporários não têm saldo
          quantLoja,
          quantEstoque,
          diferenca,
          isTempItem: true, // ✅ Marca como temporário
        };
      });

    // ✅ Junta produtos importados + itens temporários
    const allItems = [...importedItems, ...tempItems];

    // ✅ Ordena: maior diferença primeiro, depois alfabético
    return allItems.sort((a, b) => {
      if (Math.abs(b.diferenca) !== Math.abs(a.diferenca)) {
        return Math.abs(b.diferenca) - Math.abs(a.diferenca);
      }
      return a.descricao.localeCompare(b.descricao);
    });
  }, [importedProductsOnly, productCounts, barCodes]);

  const getDiferencaBadgeVariant = (diferenca: number) => {
    if (diferenca > 0) return "default";
    if (diferenca < 0) return "destructive";
    return "secondary";
  };

  // ✅ Funções de edição inline
  const handleStartEdit = (itemId: number, currentDescription: string) => {
    setEditingItemId(itemId);
    setEditingValue(currentDescription);
  };

  const handleSaveEdit = (itemId: number) => {
    if (editingValue.trim() === "") {
      // Não permite salvar vazio
      return;
    }
    onEditTempItemDescription(itemId, editingValue.trim());
    setEditingItemId(null);
    setEditingValue("");
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(itemId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Resumo da Contagem
          </CardTitle>
          <CardDescription>
            Visão geral do progresso da contagem atual (Apenas Importados)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {importedProductsOnly.length}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Itens no Catálogo
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {productCounts.length}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Itens Contados
              </p>
            </div>
            <div
              className="p-4 border border-blue-400 rounded-lg text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              onClick={() => setShowMissingItemsModal(true)}
            >
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {missingItemsCount}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Itens Faltantes
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 underline">
                Clique para ver a lista
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Ações de Contagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center gap-2">
            <Button
              onClick={exportToCsv}
              variant="outline"
              className="flex-1 border border-dashed"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleSaveCount} className="flex-1">
              <CloudUpload className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TableIcon className="h-5 w-5 mr-2" />
            Prévia dos Dados
          </CardTitle>
          <CardDescription>
            Duplo clique na descrição de itens temporários para editar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    Produto / Códigos
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Sistema
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Loja
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Estoque
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Dif.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum item importado para exibir ou contagem vazia.
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {/* ✅ Edição inline para itens temporários */}
                          {item.isTempItem && editingItemId === item.id ? (
                            <Input
                              type="text"
                              value={editingValue}
                              onChange={(e) =>
                                setEditingValue(e.target.value.slice(0, 30))
                              }
                              onKeyDown={(e) => handleKeyDown(e, item.id)}
                              onBlur={() => handleSaveEdit(item.id)}
                              autoFocus
                              className="h-7 text-sm"
                              maxLength={30}
                            />
                          ) : (
                            <div
                              className={`font-medium line-clamp-2 leading-tight ${
                                item.isTempItem
                                  ? "group cursor-pointer px-2 py-1 rounded relative"
                                  : ""
                              }`}
                              onDoubleClick={() =>
                                item.isTempItem &&
                                handleStartEdit(item.id, item.descricao)
                              }
                            >
                              {item.descricao}
                              {/* ✅ Ícone de lápis aparece no hover */}
                              {item.isTempItem && (
                                <Pencil
                                  className="h-3.5 w-3.5 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() =>
                                    handleStartEdit(item.id, item.descricao)
                                  }
                                />
                              )}
                            </div>
                          )}
                          <div className="text-[12px] text-muted-foreground font-mono">
                            Cód: {item.codigo} | Cód. de Barras: {item.barcode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumberBR(item.saldoSistema)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumberBR(item.quantLoja)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumberBR(item.quantEstoque)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={getDiferencaBadgeVariant(item.diferenca)}
                        >
                          {item.diferenca > 0 ? "+" : ""}
                          {formatNumberBR(item.diferenca)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {previewData.length > 10 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Mostrando todos os {previewData.length} itens. Role para ver mais.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

ExportTab.displayName = "ExportTab";
