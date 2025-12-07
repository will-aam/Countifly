// components/inventory/ExportTab.tsx
/**
 * Descrição: Aba para exportação e salvamento da contagem de inventário.
 * Responsabilidade: Exibir um resumo do progresso e uma prévia DETALHADA (Loja/Estoque) dos dados.
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
import type { Product, TempProduct, ProductCount } from "@/lib/types";
import { formatNumberBR } from "@/lib/utils"; // <--- 1. IMPORTANTE: Importar a função

/**
 * Props para o componente ExportTab.
 */
interface ExportTabProps {
  products: Product[];
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

  // 1. Lógica dos Dados (Atualizada para incluir Loja e Estoque separados)
  const previewData = useMemo(() => {
    const countMap = new Map(
      productCounts.map((count) => [count.codigo_produto, count])
    );

    return products
      .map((product) => {
        const count = countMap.get(product.codigo_produto);
        // Pegamos os valores individuais. Se não tiver contagem, é 0.
        const quantLoja = count?.quant_loja || 0;
        const quantEstoque = count?.quant_estoque || 0;

        const totalContado = quantLoja + quantEstoque;
        const saldoSistema = Number(product.saldo_estoque) || 0;
        const diferenca = totalContado - saldoSistema;

        return {
          codigo: product.codigo_produto,
          descricao: product.descricao,
          saldoSistema,
          quantLoja, // Novo campo
          quantEstoque, // Novo campo
          diferenca,
        };
      })
      .sort((a, b) => {
        // Ordena por maior diferença (negativa ou positiva) para destacar problemas
        if (Math.abs(b.diferenca) !== Math.abs(a.diferenca)) {
          return Math.abs(b.diferenca) - Math.abs(a.diferenca);
        }
        return a.descricao.localeCompare(b.descricao);
      });
  }, [products, productCounts]);

  const getDiferencaBadgeVariant = (diferenca: number) => {
    if (diferenca > 0) return "default"; // Verde (Sobra)
    if (diferenca < 0) return "destructive"; // Vermelho (Falta)
    return "secondary"; // Cinza (Ok)
  };

  return (
    <div className="space-y-6">
      {/* Card de Resumo (Mantido igual) */}
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

      {/* Card de Ações (Mantido igual) */}
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

      {/* 🎨 Card de Prévia dos Dados */}
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
          {/* MUDANÇA AQUI: 
             1. overflow-x-auto: Permite rolar para o lado no celular se as colunas não couberem.
             2. max-h-[500px] + overflow-y-auto: Cria a janela vertical para listas grandes.
          */}
          <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Produto</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Sistema
                  </TableHead>
                  {/* Novas Colunas */}
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
                        <div>
                          <div className="font-medium line-clamp-2">
                            {item.descricao}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {item.codigo}
                          </div>
                        </div>
                      </TableCell>

                      {/* APLICAÇÃO DO FORMATADOR AQUI 👇 */}
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
          {/* Rodapézinho informativo se a lista for longa */}
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
