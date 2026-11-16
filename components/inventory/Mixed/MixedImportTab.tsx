"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Scan, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import * as Papa from "papaparse";

interface MixedImportTabProps {
  products: Product[];
  onImportComplete: (newProducts: Product[]) => void;
  downloadTemplateCSV: () => void;
  onClearCatalog: () => void;
  onGoToConference?: () => void;
  snapshotDate?: string | null;
}

export function MixedImportTab({
  products,
  onImportComplete,
  downloadTemplateCSV,
  onClearCatalog,
  onGoToConference,
  snapshotDate,
}: MixedImportTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ total: number; valid: number; errors: number } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportStats(null);
    }
  };

  const processCsv = () => {
    if (!file) {
      toast({ title: "Selecione um arquivo CSV primeiro", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setProgress(70);
        const rows = results.data as Record<string, string>[];
        const newCatalog: Product[] = [];
        let validCount = 0;
        let errorCount = 0;

        rows.forEach((row, index) => {
          const barcode =
            row["codigo_de_barras"] ||
            row["código de barras"] ||
            row["EAN"] ||
            row["barcode"] ||
            "";
          const code =
            row["codigo_produto"] ||
            row["código do produto"] ||
            row["SKU"] ||
            row["codigo"] ||
            barcode;
          const desc = row["descricao"] || row["descrição"] || row["nome"] || "Item sem descrição";
          const stock = parseFloat(
            String(row["saldo_estoque"] || row["saldo"] || row["quantidade"] || "0").replace(",", ".")
          );
          const cost = parseFloat(
            String(row["custo_unitario"] || row["custo"] || row["preco"] || row["preço"] || "0").replace(",", ".")
          );
          const abc = (row["curva_abc"] || row["classe"] || "C").toUpperCase().trim();
          const location = row["localizacao_padrao"] || row["localizacao"] || row["corredor"] || "Geral";
          const category = row["categoria"] || "Geral";

          if (!code && !barcode) {
            errorCount++;
            return;
          }

          validCount++;
          newCatalog.push({
            id: index + 1,
            codigo_produto: code,
            descricao: desc,
            saldo_estoque: isNaN(stock) ? 0 : stock,
            preco: isNaN(cost) ? 0 : cost,
            price: isNaN(cost) ? 0 : cost,
            categoria: category,
            ...({
              codigo_de_barras: barcode,
              custo: isNaN(cost) ? 0 : cost,
              curva_abc: abc,
              localizacao_padrao: location,
            } as any),
          });
        });

        setProgress(100);
        setIsProcessing(false);
        setImportStats({ total: rows.length, valid: validCount, errors: errorCount });
        onImportComplete(newCatalog);

        toast({
          title: "Importação concluída!",
          description: `${validCount} produtos importados com sucesso para o Modular.`,
        });
      },
      error: (error) => {
        setIsProcessing(false);
        toast({ title: "Erro ao ler arquivo", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner de Operação Híbrida: Opcionalidade de Importação */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Scan className="h-4 w-4 text-primary" />
            Importação Opcional: Contagem com ou sem catálogo
          </p>
          <p className="text-xs text-muted-foreground">
            Para realizar Contagem Cega ou Levantamento de Estoque sem saldo prévio do ERP, você pode ir direto para a Conferência.
          </p>
        </div>
        {onGoToConference && (
          <Button variant="default" size="sm" onClick={onGoToConference} className="shrink-0 font-medium">
            Iniciar Sem Catálogo <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Card de Importação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Importar Base do Modular</CardTitle>
              <CardDescription>
                Suba o saldo sistêmico com suporte a Custo Unitário, Curva ABC e Localização Padrão.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
              <Download className="h-4 w-4 mr-2" /> Baixar Modelo CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border p-6 rounded-xl text-center space-y-3 bg-muted/10">
            <FileSpreadsheet className="h-10 w-10 text-primary mx-auto opacity-70" />
            <div>
              <Label htmlFor="mixed-csv-upload" className="cursor-pointer font-semibold text-primary hover:underline">
                Clique para selecionar o arquivo CSV
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .CSV (separado por vírgula ou ponto e vírgula)</p>
            </div>
            <Input
              id="mixed-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file && (
              <p className="text-xs font-mono font-bold text-foreground bg-muted p-2 rounded-md max-w-xs mx-auto">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processando linhas...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {importStats && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 text-center text-xs">
              <div>
                <span className="text-muted-foreground">Total de Linhas</span>
                <p className="font-bold text-base text-foreground">{importStats.total}</p>
              </div>
              <div>
                <span className="text-emerald-600 font-semibold">Válidos Importados</span>
                <p className="font-bold text-base text-emerald-600">{importStats.valid}</p>
              </div>
              <div>
                <span className="text-amber-600 font-semibold">Linhas com Erro</span>
                <p className="font-bold text-base text-amber-600">{importStats.errors}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 font-bold h-11"
              disabled={!file || isProcessing}
              onClick={processCsv}
            >
              <Upload className="h-4 w-4 mr-2" /> Processar e Carregar Produtos
            </Button>
            {products.length > 0 && (
              <Button
                variant="destructive"
                className="h-11"
                onClick={onClearCatalog}
                title="Limpar catálogo atual"
              >
                Limpar Catálogo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo do Catálogo Ativo */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Catálogo Ativo ({products.length} itens)</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                {snapshotDate && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Fotografia: {new Date(snapshotDate).toLocaleString("pt-BR")}
                  </span>
                )}
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Base pronta para contagem
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-y border-border text-[10px] uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Descrição</th>
                    <th className="py-2 px-2 text-center">Curva ABC</th>
                    <th className="py-2 px-2 text-center">Saldo</th>
                    <th className="py-2 px-3 text-right">Custo Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {products.slice(0, 50).map((prod) => (
                    <tr key={prod.id} className="hover:bg-muted/10">
                      <td className="py-2 px-3">{prod.codigo_produto}</td>
                      <td className="py-2 px-3 font-sans font-medium text-foreground">{prod.descricao}</td>
                      <td className="py-2 px-2 text-center font-bold">{(prod as any).curva_abc || "C"}</td>
                      <td className="py-2 px-2 text-center">{prod.saldo_estoque}</td>
                      <td className="py-2 px-3 text-right">
                        R$ {Number((prod as any).custo || prod.preco || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {products.length > 50 && (
              <p className="p-2.5 text-center text-[11px] text-muted-foreground bg-muted/20 border-t border-border">
                Exibindo os primeiros 50 itens de {products.length}.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
