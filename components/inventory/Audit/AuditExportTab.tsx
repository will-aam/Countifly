// components/inventory/Audit/AuditExportTab.tsx
// esse componente exibe a aba de exportação da auditoria, permitindo salvar e exportar os dados da contagem.
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, CloudUpload, TableIcon } from "lucide-react";

import { Product, TempProduct, ProductCount } from "@/lib/types";
import { AuditConfig } from "@/components/inventory/Audit/AuditSettingsTab";
import { formatNumberBR } from "@/lib/utils";
import * as Papa from "papaparse";

type AuditProduct = Product & { price?: number };
type AuditProductCount = ProductCount & { price?: number };
type AuditTempProduct = TempProduct & { price?: number };

interface ExportTabProps {
  products: AuditProduct[];
  tempProducts: AuditTempProduct[];
  productCounts: AuditProductCount[];
  handleSaveCount: () => void;
  auditConfig: AuditConfig;
  fileName: string;
}

export function ExportTab({
  products,
  tempProducts,
  productCounts,
  handleSaveCount,
  auditConfig,
  fileName,
}: ExportTabProps) {
  const hasData = productCounts.length > 0;

  const totalItemsCounted = productCounts.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) +
      Number(item.quant_loja || 0) +
      Number(item.quant_estoque || 0),
    0,
  );
  const uniqueItemsCounted = productCounts.length;

  const totalValue = productCounts.reduce((sum, item) => {
    const qty =
      Number(item.quantity || 0) +
      Number(item.quant_loja || 0) +
      Number(item.quant_estoque || 0);
    const price = item.price || 0;
    return sum + qty * price;
  }, 0);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleLocalExport = () => {
    if (!hasData) return;

    const csvData = productCounts.map((item) => {
      // Calcula o total real (considerando Loja + Estoque se houver)
      const totalQty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0);

      const row: any = {
        // Mapeamento solicitado:
        cod_de_barras:
          item.codigo_produto || item.codigo_de_barras || item.barcode,
        descricao: item.descricao || item.name,
        categoria: item.categoria || "",
        subcategoria: item.subcategoria || "", // Agora vai pegar corretamente do estado

        // Quantidades separadas
        Loja: String(item.quant_loja || 0).replace(".", ","),
        Estoque: String(item.quant_estoque || 0).replace(".", ","),
        "Qtd Total": String(totalQty).replace(".", ","),
      };

      if (auditConfig.collectPrice) {
        row.preco_unitario = item.price
          ? item.price.toFixed(2).replace(".", ",")
          : "0,00";
        row.valor_total = ((item.price || 0) * totalQty)
          .toFixed(2)
          .replace(".", ",");
      }

      return row;
    });

    const csv = Papa.unparse(csvData, {
      delimiter: ";",
      quotes: true,
    });

    const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    let finalName = fileName.trim();

    if (!finalName) {
      finalName = `auditoria_${dateStr}`;
    }

    if (!finalName.toLowerCase().endsWith(".csv")) {
      finalName += ".csv";
    }

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div
        className={`grid gap-4 ${
          auditConfig.collectPrice
            ? "grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2"
        }`}
      >
        <Card className="shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Itens Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {uniqueItemsCounted}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Total Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumberBR(totalItemsCounted)}
            </div>
          </CardContent>
        </Card>

        {auditConfig.collectPrice && (
          <Card className="border border-blue-400 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalValue)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
              onClick={handleLocalExport}
              variant="outline"
              className="flex-1 border border-dashed"
              disabled={!hasData}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              onClick={handleSaveCount}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!hasData}
            >
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
          {/* <CardDescription>
                    Duplo clique na descrição de itens temporários para editar
                  </CardDescription> */}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. de Barras</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Loja</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {auditConfig.collectPrice && (
                    <>
                      <TableHead className="text-right">Preço Unt.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasData ? (
                  <TableRow>
                    <TableCell
                      colSpan={auditConfig.collectPrice ? 8 : 6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum item contado.
                    </TableCell>
                  </TableRow>
                ) : (
                  productCounts.map((item) => {
                    const totalQty =
                      (Number(item.quant_loja) || 0) +
                      (Number(item.quant_estoque) || 0) +
                      (Number(item.quantity) || 0);

                    return (
                      <TableRow key={item.id} className="border-b">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.barcode || item.codigo_de_barras}
                        </TableCell>
                        <TableCell
                          className="font-medium max-w-[200px] truncate"
                          title={item.descricao}
                        >
                          {item.name || item.descricao}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.categoria || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.quant_loja || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {item.quant_estoque || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {totalQty}
                        </TableCell>
                        {auditConfig.collectPrice && (
                          <>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency((item.price || 0) * totalQty)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
