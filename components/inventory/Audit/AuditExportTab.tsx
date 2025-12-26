// components/inventory/Audit/AuditExportTab.tsx
// esse componente exibe a aba de exportação da auditoria, permitindo salvar e exportar os dados da contagem.
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Save, Package, Hash, DollarSign } from "lucide-react";

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
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const uniqueItemsCounted = productCounts.length;

  const totalValue = productCounts.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
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
      const row: any = {
        Codigo: item.barcode || item.codigo_de_barras,
        Produto: item.name || item.descricao,
        Quantidade: String(item.quantity || item.quant_loja).replace(".", ","),
      };

      if (auditConfig.collectPrice) {
        row.Preco_Unitario = item.price
          ? item.price.toFixed(2).replace(".", ",")
          : "0,00";
        row.Valor_Total = ((item.price || 0) * Number(item.quantity || 0))
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
            <CardTitle className="text-sm font-medium whitespace-nowrap">
              Itens Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueItemsCounted}</div>
          </CardContent>
        </Card>

        <Card className="shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium whitespace-nowrap">
              Total Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumberBR(totalItemsCounted)}
            </div>
          </CardContent>
        </Card>

        {auditConfig.collectPrice && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 shadow-md transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100 whitespace-nowrap">
                Valor Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(totalValue)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Finalizar Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleSaveCount}
              className="w-full py-6 text-base shadow-md transition-all duration-300 hover:shadow-lg sm:flex-1"
              size="lg"
              disabled={!hasData}
            >
              <Save className="mr-2 h-5 w-5" />
              Salvar e Finalizar
            </Button>

            <Button
              variant="outline"
              onClick={handleLocalExport}
              className="w-full py-6 text-base shadow-md transition-all duration-300 hover:shadow-lg sm:flex-1"
              size="lg"
              disabled={!hasData}
            >
              <Download className="mr-2 h-5 w-5" />
              Baixar Planilha (.csv)
            </Button>
          </div>
          {!hasData && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Realize contagens na aba de Conferência para habilitar as ações.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                {auditConfig.collectPrice && (
                  <>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasData ? (
                <TableRow>
                  <TableCell
                    colSpan={auditConfig.collectPrice ? 5 : 3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum item contado.
                  </TableCell>
                </TableRow>
              ) : (
                productCounts.map((item) => (
                  <TableRow key={item.barcode} className="border-b">
                    <TableCell className="font-mono text-xs">
                      {item.barcode || item.codigo_de_barras}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name || item.descricao}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {item.quantity || item.quant_loja}
                    </TableCell>
                    {auditConfig.collectPrice && (
                      <>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            (item.price || 0) *
                              Number(item.quantity || item.quant_loja)
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
