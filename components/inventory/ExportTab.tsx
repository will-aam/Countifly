// components/inventory/ExportTab.tsx
/**
 * Descrição: Aba para exportação e salvamento da contagem de inventário.
 * Responsabilidade: Exibir um resumo do progresso e uma prévia DETALHADA (Loja/Estoque/Barra) dos dados.
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Ícones ---
import { CloudUpload, Download, Table as TableIcon } from "lucide-react";

// --- Tipos e Utils ---
import type { Product, TempProduct, ProductCount, BarCode } from "@/lib/types"; //
import { formatNumberBR } from "@/lib/utils";

/**
 * Props para o componente ExportTab.
 */
interface ExportTabProps {
  products: Product[];
  barCodes: BarCode[]; // <--- 1. ADICIONADO: Recebe a lista de códigos de barras
  tempProducts: TempProduct[];
  productCounts: ProductCount[];
  productCountsStats: {
    totalLoja: number;
    totalEstoque: number;
  };
  exportToCsv: () => void;
  handleSaveCount: () => void;
  setShowMissingItemsModal: (show: boolean) => void;
}

/**
 * Componente ExportTab.
 */
export const ExportTab: React.FC<ExportTabProps> = ({
  products,
  barCodes, // <--- 2. ADICIONADO: Destrutura a nova prop
  tempProducts,
  productCounts,
  productCountsStats,
  exportToCsv,
  handleSaveCount,
  setShowMissingItemsModal,
}) => {
  const missingItemsCount = Math.max(
    0,
    products.length -
      productCounts.filter((p) => !p.codigo_produto.startsWith("TEMP-")).length
  );

  // 3. Lógica dos Dados (Atualizada para incluir Código de Barras)
  const previewData = useMemo(() => {
    const countMap = new Map(
      productCounts.map((count) => [count.codigo_produto, count])
    );

    return products
      .map((product) => {
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
          codigo: product.codigo_produto,
          barcode, // <--- Novo campo no objeto
          descricao: product.descricao,
          saldoSistema,
          quantLoja,
          quantEstoque,
          diferenca,
        };
      })
      .sort((a, b) => {
        if (Math.abs(b.diferenca) !== Math.abs(a.diferenca)) {
          return Math.abs(b.diferenca) - Math.abs(a.diferenca);
        }
        return a.descricao.localeCompare(b.descricao);
      });
  }, [products, productCounts, barCodes]); //

  const getDiferencaBadgeVariant = (diferenca: number) => {
    if (diferenca > 0) return "default";
    if (diferenca < 0) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      {/* ... Cards de Resumo e Ações (Mantidos conforme seu código) ... */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Resumo da Contagem
          </CardTitle>
          <CardDescription>
            Visão geral do progresso da contagem atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {products.length}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Itens no Catálogo
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {productCounts.length}
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Itens Contados
              </p>
            </div>
            <div
              className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              onClick={() => setShowMissingItemsModal(true)}
            >
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {missingItemsCount}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Itens Faltantes
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
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
            <Button onClick={exportToCsv} variant="outline" className="flex-1">
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
            Visualização detalhada (Loja vs Estoque)
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
                      Nenhum item no catálogo para exibir
                    </TableCell>
                  </TableRow>
                ) : (
                  previewData.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="font-medium line-clamp-2 leading-tight">
                            {item.descricao}
                          </div>
                          <div className="text-[12px] text-muted-foreground font-mono">
                            Cód: {item.codigo} | Cód. de Barras: {item.barcode}{" "}
                            {/* <--- 4. EXIBIÇÃO: Mostra os dois códigos */}
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
