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
import * as Papa from "papaparse"; // Certifique-se de ter instalado: pnpm add papaparse

type AuditProduct = Product & { price?: number };
type AuditProductCount = ProductCount & { price?: number };
type AuditTempProduct = TempProduct & { price?: number };

interface ExportTabProps {
  products: AuditProduct[];
  tempProducts: AuditTempProduct[];
  productCounts: AuditProductCount[];
  handleSaveCount: () => Promise<void>;
  auditConfig: AuditConfig;
  fileName: string; // Recebe o nome vindo do page.tsx
}

export function ExportTab({
  products,
  tempProducts,
  productCounts,
  handleSaveCount,
  auditConfig,
  fileName,
}: ExportTabProps) {
  // Verifica se há dados para habilitar os botões
  const hasData = productCounts.length > 0;

  // 1. Cálculos de Totais
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

  // 2. FUNÇÃO BLINDADA DE EXPORTAÇÃO (LOCAL)
  const handleLocalExport = () => {
    if (!hasData) return; // Segurança extra

    // Mapeia os dados exatamente como estão na tela
    const csvData = productCounts.map((item) => {
      const row: any = {
        Codigo: item.barcode || item.codigo_de_barras,
        Produto: item.name || item.descricao,
        Quantidade: String(item.quantity || item.quant_loja).replace(".", ","),
      };

      // Adiciona colunas financeiras apenas se o modo estiver ativo
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

    // Gera o CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ";", // Padrão Excel Brasileiro
      quotes: true,
    });

    // Define o nome do arquivo (Personalizado ou Padrão)
    const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    let finalName = fileName.trim();

    if (!finalName) {
      finalName = `auditoria_${dateStr}`;
    }

    // Garante a extensão .csv
    if (!finalName.toLowerCase().endsWith(".csv")) {
      finalName += ".csv";
    }

    // Download via Blob
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
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div
        className={`grid gap-4 ${
          auditConfig.collectPrice ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Únicos</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueItemsCounted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Unidades
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumberBR(totalItemsCounted)}
            </div>
          </CardContent>
        </Card>

        {auditConfig.collectPrice && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
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

      {/* Ações (Botões travados se não tiver dados) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Finalizar Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Botão de Salvar no Banco (Se fizer sentido manter, bloqueia se vazio) */}
            <Button
              onClick={handleSaveCount}
              className="flex-1"
              size="lg"
              disabled={!hasData} // <--- TRAVADO SE VAZIO
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar e Finalizar
            </Button>

            {/* Botão de CSV Local (Usa o nome personalizado) */}
            <Button
              variant="outline"
              onClick={handleLocalExport}
              className="flex-1"
              size="lg"
              disabled={!hasData} // <--- TRAVADO SE VAZIO
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Planilha (.csv)
            </Button>
          </div>
          {!hasData && (
            <p className="text-xs text-center text-red-500 mt-2">
              Realize contagens na aba de Conferência para habilitar as ações.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Detalhamento */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
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
                  <TableRow key={item.barcode}>
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
