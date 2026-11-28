"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Scan,
  ArrowRight,
  Search,
  Trash2,
  Layers,
  Database,
  BarChart3,
  DollarSign,
  Package,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Product } from "@/lib/types";
import * as Papa from "papaparse";
import { cn } from "@/lib/utils";
import {
  TablePagination,
  useClientPagination,
} from "@/components/ui/table-pagination";

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
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportStats(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
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
          const category = row["categoria"] || row["category"] || "Geral";
          const subcategory = (row["subcategoria"] || row["sub_categoria"] || row["sub-categoria"] || row["subcategory"] || "").trim();
          const brand = (row["marca"] || row["brand"] || row["fabricante"] || "").trim();
          const ncm = (
            row["ncm"] ||
            row["NCM"] ||
            row["codigo_ncm"] ||
            row["código ncm"] ||
            row["codigo ncm"] ||
            row["classificacao_fiscal"] ||
            row["classificação fiscal"] ||
            ""
          ).trim();

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
            ncm: ncm || undefined,
            ...({
              codigo_de_barras: barcode,
              subcategoria: subcategory || undefined,
              marca: brand || undefined,
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
          description: `${validCount.toLocaleString("pt-BR")} produtos importados com sucesso para o Modular.`,
        });
      },
      error: (error) => {
        setIsProcessing(false);
        toast({ title: "Erro ao ler arquivo", description: error.message, variant: "destructive" });
      },
    });
  };

  // Estatísticas do Catálogo
  const catalogStats = useMemo(() => {
    if (products.length === 0) return null;
    let totalStock = 0;
    let totalValue = 0;
    let countA = 0;
    let countB = 0;
    let countC = 0;

    products.forEach((p) => {
      const stock = Number(p.saldo_estoque || 0);
      const cost = Number((p as any).custo || p.preco || 0);
      const abc = String((p as any).curva_abc || "C").toUpperCase();
      totalStock += stock;
      totalValue += stock * cost;
      if (abc === "A") countA++;
      else if (abc === "B") countB++;
      else countC++;
    });

    return {
      totalItems: products.length,
      totalStock,
      totalValue,
      countA,
      countB,
      countC,
    };
  }, [products]);

  // Filtragem rápida
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.descricao?.toLowerCase().includes(term) ||
        p.codigo_produto?.toLowerCase().includes(term) ||
        String((p as any).codigo_de_barras || "").toLowerCase().includes(term) ||
        String((p as any).localizacao_padrao || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const pagination = useClientPagination(filteredProducts, 25);
  const displayedProducts = pagination.paginatedItems;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* 1. KPIs / RESUMO DO CATÁLOGO ATIVO (Slide Lateral no Mobile, Grid 4 colunas no Desktop) */}
      {catalogStats && (
        <div className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-none snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary shrink-0" /> SKUs Cadastrados
            </span>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {catalogStats.totalItems.toLocaleString("pt-BR")}
            </p>
            <span className="text-[11px] text-muted-foreground">Itens carregados no catálogo</span>
          </div>

          <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" /> Saldo Esperado
            </span>
            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {catalogStats.totalStock.toLocaleString("pt-BR")}
            </p>
            <span className="text-[11px] text-muted-foreground">Unidades previstas no ERP</span>
          </div>

          <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> Valor em Estoque
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {catalogStats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground">Custo total registrado</span>
          </div>

          <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> Curva ABC
            </span>
            <div className="flex items-center gap-2 mt-1 font-bold text-sm">
              <Badge variant="outline" className="text-xs border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                A: {catalogStats.countA}
              </Badge>
              <Badge variant="outline" className="text-xs border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                B: {catalogStats.countB}
              </Badge>
              <Badge variant="outline" className="text-xs border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                C: {catalogStats.countC}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1 block">Classificação de relevância</span>
          </div>
        </div>
      )}

      {/* 2. GRID PRINCIPAL: DROPZONE DE IMPORTAÇÃO + GUIA DE COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* COLUNA ESQUERDA: Dropzone & Upload (7 colunas no desktop) */}
        <div className="lg:col-span-7 border-0 sm:border sm:border-border/80 bg-transparent sm:bg-card rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-6 space-y-3 sm:space-y-4">
          <div className="pb-1 sm:pb-3 border-b border-border/50 sm:border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  <Upload className="h-5 w-5 text-primary shrink-0" />
                  Importar Planilha do ERP
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Suba o saldo sistêmico com suporte a Custo Unitário, Curva ABC e Localização Padrão.
                </p>
              </div>
              {products.length > 0 && onGoToConference && (
                <Button
                  size="sm"
                  onClick={onGoToConference}
                  className="font-semibold shadow-xs shrink-0 h-9 w-full sm:w-auto"
                >
                  <Scan className="h-4 w-4 mr-1.5 shrink-0" /> Ir para Conferência
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {/* Dropzone com suporte a drag & drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center transition-all cursor-pointer relative",
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : file
                  ? "border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20"
              )}
            >
              <input
                id="mixed-csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet
                className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 transition-colors",
                  file ? "text-emerald-600 dark:text-emerald-400" : "text-primary/70"
                )}
              />
              <div>
                <p className="font-bold text-sm sm:text-base text-foreground break-all">
                  {file ? file.name : "Arraste e solte o arquivo CSV aqui"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB — Pronto para processamento`
                    : "ou toque para selecionar no seu dispositivo"}
                </p>
              </div>
            </div>

            {/* Progresso de leitura */}
            {isProcessing && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                    Processando linhas do arquivo...
                  </span>
                  <span className="text-primary font-mono">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Estatísticas do resultado do import */}
            {importStats && (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 rounded-xl border border-border bg-muted/30 text-center text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Lidas</span>
                  <p className="font-extrabold text-base text-foreground mt-0.5">
                    {importStats.total.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-600 font-semibold block text-[11px]">Importados</span>
                  <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {importStats.valid.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <span className="text-amber-600 font-semibold block text-[11px]">Incompletas</span>
                  <p className="font-extrabold text-base text-amber-600 dark:text-amber-400 mt-0.5">
                    {importStats.errors.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 pt-1">
              <Button
                className="flex-1 font-bold h-11 shadow-xs truncate px-3 sm:px-4"
                disabled={!file || isProcessing}
                onClick={processCsv}
              >
                <Upload className="h-4 w-4 mr-2 shrink-0" />
                <span className="sm:hidden truncate">Processar e Carregar</span>
                <span className="hidden sm:inline truncate">Processar e Carregar Produtos</span>
              </Button>

              {products.length > 0 && (
                <Button
                  variant="outline"
                  className="h-11 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40 font-semibold shrink-0 px-3 sm:px-4"
                  onClick={onClearCatalog}
                  title="Zerar o catálogo atual"
                >
                  <Trash2 className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="sm:hidden">Zerar</span>
                  <span className="hidden sm:inline">Zerar Catálogo</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Especificações do CSV & Modelo (5 colunas no desktop) */}
        <div className="lg:col-span-5 border-0 sm:border sm:border-border/80 bg-transparent sm:bg-card rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  Formato do Arquivo CSV
                </h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Clique para ver os campos aceitos"
                      aria-label="Informações sobre o formato do CSV"
                    >
                      <Info className="h-4 w-4 text-blue-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-3 text-xs space-y-2">
                    <p className="font-semibold text-foreground border-b pb-1">Colunas Reconhecidas no CSV</p>
                    <ul className="space-y-1.5 text-muted-foreground text-[11px]">
                      <li><strong className="text-foreground">codigo_de_barras / EAN:</strong> Leitura no leitor óptico.</li>
                      <li><strong className="text-foreground">codigo_produto / SKU:</strong> Código interno do ERP.</li>
                      <li><strong className="text-foreground">descricao:</strong> Nome oficial do produto.</li>
                      <li><strong className="text-foreground">saldo_estoque:</strong> Quantidade contábil do sistema.</li>
                      <li><strong className="text-foreground">custo_unitario:</strong> Custo para cálculo financeiro (R$).</li>
                      <li><strong className="text-foreground">curva_abc:</strong> Classificação (A, B ou C).</li>
                      <li><strong className="text-foreground">localizacao_padrao:</strong> Endereço físico padrão.</li>
                    </ul>
                    <p className="text-[10px] text-muted-foreground pt-1 border-t">Separadores aceitos: ponto e vírgula (;) ou vírgula (,)</p>
                  </PopoverContent>
                </Popover>
              </div>

              <Button variant="outline" size="sm" onClick={downloadTemplateCSV} className="h-8 text-xs font-semibold shrink-0">
                <Download className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span className="sm:hidden">Modelo</span>
                <span className="hidden sm:inline">Baixar Modelo</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Estrutura para carga e confronto de estoque do sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px]">
              UTF-8
            </span>
            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px]">
              Delimitador: (;) ou (,)
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABELA DE PRODUTOS CARREGADOS (OCUPA TODA A LARGURA DA PÁGINA) */}
      {products.length > 0 && (
        <div className="border-0 sm:border sm:border-border/80 bg-transparent sm:bg-card rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-0 w-full space-y-3 sm:space-y-0">
          <div className="py-2 sm:py-4 px-0 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  <Database className="h-5 w-5 text-primary shrink-0" />
                  Catálogo Ativo ({products.length.toLocaleString("pt-BR")})
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {snapshotDate ? (
                    <span>Data da Fotografia: {new Date(snapshotDate).toLocaleString("pt-BR")}</span>
                  ) : (
                    "Base pronta para confronto de estoque e auditoria."
                  )}
                </p>
              </div>

              {/* Filtro de pesquisa */}
              <div className="flex items-center gap-2 w-full md:w-80">
                <div className="relative w-full">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por código, EAN ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 pl-9 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-0">
            <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-lg sm:rounded-none border border-border/70 sm:border-0 bg-background">
              <table className="w-full text-left text-xs min-w-[640px] sm:min-w-full">
                <thead className="bg-muted/60 border-b sm:border-y border-border text-[10px] uppercase font-semibold text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4">Código / SKU</th>
                    <th className="py-2.5 px-2 sm:px-3">EAN / Cód. Barras</th>
                    <th className="py-2.5 px-2 sm:px-3">Descrição do Produto</th>
                    <th className="py-2.5 px-2 text-center">Local</th>
                    <th className="py-2.5 px-2 text-center">Curva</th>
                    <th className="py-2.5 px-2 sm:px-3 text-center">Saldo Sist.</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Custo Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {displayedProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4 font-bold text-foreground">{prod.codigo_produto}</td>
                      <td className="py-2.5 px-2 sm:px-3 text-muted-foreground">
                        {(prod as any).codigo_de_barras || "—"}
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 font-sans font-medium text-foreground max-w-[180px] sm:max-w-xs truncate">
                        {prod.descricao}
                      </td>
                      <td className="py-2.5 px-2 text-center font-sans text-muted-foreground">
                        {(prod as any).localizacao_padrao || "Geral"}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            (prod as any).curva_abc === "A"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : (prod as any).curva_abc === "B"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          )}
                        >
                          {(prod as any).curva_abc || "C"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 text-center font-bold text-foreground">
                        {Number(prod.saldo_estoque || 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right text-muted-foreground">
                        R$ {Number((prod as any).custo || prod.preco || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé com controle de paginação padronizado */}
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[15, 25, 50, 100]}
              itemLabel="produtos"
            />
          </div>
        </div>
      )}
    </div>
  );
}
