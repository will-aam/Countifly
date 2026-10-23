// components/inventory/Audit/AuditExportTab.tsx
// esse componente exibe a aba de exportação da auditoria, permitindo salvar e exportar os dados da contagem.
"use client";

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

import type { ProductCount } from "@/lib/types";
import type { AuditConfig } from "@/lib/audit";
import { formatNumberBR } from "@/lib/utils";
import { buildAuditReportRows } from "@/lib/audit-report";
import * as Papa from "papaparse";

type AuditProductCount = ProductCount & { price?: number };

interface ExportTabProps {
  productCounts: AuditProductCount[];
  handleSaveCount: () => void;
  auditConfig: AuditConfig;
  fileName: string;
  clientName: string;
}

export function ExportTab({
  productCounts,
  handleSaveCount,
  auditConfig,
  fileName,
  clientName,
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
  const pendingPrices = auditConfig.collectPrice
    ? productCounts.filter(
        (item) => !(item.priceCaptured ?? Number(item.price || 0) > 0),
      ).length
    : 0;
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

    const csvData = buildAuditReportRows(productCounts, auditConfig, clientName);

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
    <div className="space-y-6 w-full">
      <section className="flex flex-col gap-4 w-full rounded-none border-none bg-transparent p-0 shadow-none lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-sm">
        <div className="mb-2 flex flex-col gap-1 lg:mb-0">
          <h2 className="text-lg font-semibold">Resumo da Contagem</h2>
          <p className="text-sm text-muted-foreground">
            Visão geral dos itens registrados na contagem livre.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uniqueItemsCounted}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Itens Contados
              </p>
            </div>
            {auditConfig.collectQuantity && (
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumberBR(totalItemsCounted)}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Unidades Contadas
                </p>
              </div>
            )}
            {auditConfig.collectPrice && (
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {productCounts.length - pendingPrices}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Preços Coletados
                </p>
              </div>
            )}
            {auditConfig.collectPrice && pendingPrices > 0 && (
              <div className="rounded-lg border border-amber-400 bg-card p-4 text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pendingPrices}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Preços Pendentes
                </p>
              </div>
            )}
            {auditConfig.collectPrice && auditConfig.collectQuantity && (
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {pendingPrices > 0 ? "Valor Parcial" : "Valor Total"}
                </p>
              </div>
            )}
        </div>
      </section>

      <section className="flex w-full flex-col gap-4 rounded-none border-none bg-transparent p-0 shadow-none lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-sm">
        <div className="mb-2 flex flex-col gap-1 lg:mb-0">
          <h2 className="flex items-center text-lg font-semibold">
            Ações de Contagem
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
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
            className="flex-1"
            disabled={!hasData}
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            Salvar
          </Button>
        </div>
      </section>

      <section className="flex w-full flex-col gap-4 rounded-none border-none bg-transparent p-0 shadow-none lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-sm">
        <div className="mb-2 flex flex-col gap-1 lg:mb-0">
          <h2 className="flex items-center text-lg font-semibold">
            <TableIcon className="h-5 w-5 mr-2" />
            Prévia dos Dados
          </h2>
        </div>
        <div className="max-h-[500px] overflow-x-auto overflow-y-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cód. de Barras</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                {auditConfig.collectQuantity &&
                  (auditConfig.quantityLayout === "split" ? (
                    <>
                      <TableHead className="text-right">Loja</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                    </>
                  ) : (
                    <TableHead className="text-right">Quantidade</TableHead>
                  ))}
                {auditConfig.collectPrice && (
                  <>
                    <TableHead className="text-right">Preço Unt.</TableHead>
                    <TableHead>Estado do preço</TableHead>
                    {auditConfig.collectQuantity && (
                      <TableHead className="text-right">Valor Total</TableHead>
                    )}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasData ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      3 +
                      (auditConfig.collectQuantity
                        ? auditConfig.quantityLayout === "split"
                          ? 2
                          : 1
                        : 0) +
                      (auditConfig.collectPrice
                        ? auditConfig.collectQuantity
                          ? 3
                          : 2
                        : 0)
                    }
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
                  const hasPrice = item.priceCaptured ?? Number(item.price || 0) > 0;

                  return (
                    <TableRow key={item.id} className="border-b">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.codigo_de_barras || item.barcode}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate font-medium"
                        title={item.descricao}
                      >
                        {item.descricao || item.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.categoria || "-"}
                      </TableCell>
                      {auditConfig.collectQuantity &&
                        (auditConfig.quantityLayout === "split" ? (
                          <>
                            <TableCell className="text-right font-bold">
                              {formatNumberBR(item.quant_loja || 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatNumberBR(item.quant_estoque || 0)}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="text-right font-bold">
                            {formatNumberBR(totalQty)}
                          </TableCell>
                        ))}
                      {auditConfig.collectPrice && (
                        <>
                          <TableCell className="text-right text-muted-foreground">
                            {hasPrice ? formatCurrency(item.price) : "—"}
                          </TableCell>
                          <TableCell>
                            {hasPrice ? "Coletado" : "Pendente"}
                          </TableCell>
                          {auditConfig.collectQuantity && (
                            <TableCell className="text-right font-medium">
                              {hasPrice
                                ? formatCurrency((item.price || 0) * totalQty)
                                : "—"}
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
