// app/(private)/settings-companies/components/company-catalog-panel.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Download,
  History,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Package,
  Pencil,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CompanyProduct {
  id: number;
  codigo_barras: string;
  codigo_produto?: string | null;
  descricao: string;
  ncm?: string | null;
  categoria?: string | null;
  ultimo_preco: number | null;
  data_ultimo_inventario: string;
  historico_precos: Array<{
    id: number;
    preco: number;
    data_registro: string;
    contagem_id?: number | null;
  }>;
}

interface CompanyCatalogPanelProps {
  company: {
    id: number;
    nomeFantasia: string;
    razaoSocial: string | null;
    cnpj: string | null;
    ativo: boolean;
    createdAt: string;
  };
  onBack: () => void;
  onEditCompany: (company: any) => void;
  availableCompanies: Array<{
    id: number;
    nomeFantasia: string;
  }>;
  onSelectCompany: (companyId: number) => void;
}

export function CompanyCatalogPanel({
  company,
  onBack,
  onEditCompany,
  availableCompanies,
  onSelectCompany,
}: CompanyCatalogPanelProps) {
  const [activeTab, setActiveTab] = useState<"catalogo" | "variacao">("catalogo");
  const [products, setProducts] = useState<CompanyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductHistory, setSelectedProductHistory] = useState<CompanyProduct | null>(null);

  // Carregar produtos da empresa
  const loadCompanyProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/companies/${company.id}/products?limit=200`);
      if (!res.ok) throw new Error("Falha ao carregar catálogo da empresa");
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch (e: any) {
      toast({
        title: "Erro ao carregar catálogo",
        description: e.message || "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyProducts();
  }, [company.id]);

  // Filtro de busca no cliente
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchDesc = p.descricao?.toLowerCase().includes(q);
      const matchBar = p.codigo_barras?.toLowerCase().includes(q);
      const matchCode = p.codigo_produto?.toLowerCase().includes(q);
      const matchNcm = p.ncm?.toLowerCase().includes(q);
      const matchCat = p.categoria?.toLowerCase().includes(q);
      return matchDesc || matchBar || matchCode || matchNcm || matchCat;
    });
  }, [products, searchQuery]);

  // Análise de Variação de Preços (produtos com mais de 1 preço registrado)
  const priceVariations = useMemo(() => {
    const list: Array<{
      product: CompanyProduct;
      currentPrice: number;
      previousPrice: number;
      diff: number;
      percent: number;
      date: string;
    }> = [];

    products.forEach((p) => {
      if (p.historico_precos && p.historico_precos.length >= 2) {
        const sorted = [...p.historico_precos].sort(
          (a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime()
        );
        const curr = sorted[0].preco;
        const prev = sorted[1].preco;
        if (curr > 0 && prev > 0 && curr !== prev) {
          const diff = curr - prev;
          const percent = ((curr - prev) / prev) * 100;
          list.push({
            product: p,
            currentPrice: curr,
            previousPrice: prev,
            diff,
            percent,
            date: sorted[0].data_registro,
          });
        }
      }
    });

    return list.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
  }, [products]);

  // Exportar Catálogo em CSV
  const handleExportCsv = () => {
    if (products.length === 0) {
      toast({
        title: "Atenção",
        description: "Nenhum produto cadastrado para exportar.",
        variant: "destructive",
      });
      return;
    }

    const rows = products.map((p) => ({
      "Código de Barras": p.codigo_barras,
      "Código Interno": p.codigo_produto || "",
      "Descrição": p.descricao,
      "Categoria": p.categoria || "Não Informado",
      "NCM": p.ncm || "",
      "Último Preço (R$)": p.ultimo_preco ? p.ultimo_preco.toFixed(2).replace(".", ",") : "0,00",
      "Último Inventário": new Date(p.data_ultimo_inventario).toLocaleDateString("pt-BR"),
    }));

    const csv = Papa.unparse(rows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `catalogo_${company.nomeFantasia.toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "Catálogo exportado com sucesso",
      description: `${rows.length} produtos exportados em CSV.`,
    });
  };

  const totalWithPrice = useMemo(() => {
    return products.filter((p) => p.ultimo_preco && p.ultimo_preco > 0).length;
  }, [products]);

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-300">
      {/* ─── Header Superior com Navegação e Seletor de Empresa ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Empresas
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                {company.nomeFantasia}
              </h2>
              {company.ativo ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 font-semibold shrink-0">
                  Ativa
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 shrink-0">
                  Inativa
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
              CNPJ: {company.cnpj || "Não informado"}
              {company.razaoSocial && ` · ${company.razaoSocial}`}
            </p>
          </div>
        </div>

        {/* Alternar rápido entre empresas e Botão Editar Único */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {availableCompanies.length > 1 && (
            <Select
              value={String(company.id)}
              onValueChange={(val) => onSelectCompany(Number(val))}
            >
              <SelectTrigger className="h-9 text-xs w-[180px] bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Alternar empresa" />
              </SelectTrigger>
              <SelectContent align="end">
                {availableCompanies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.nomeFantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditCompany(company)}
            className="h-9 text-xs cursor-pointer gap-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar Empresa
          </Button>
        </div>
      </div>

      {/* ─── Barra de Abas Minimalistas ─── */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("catalogo")}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2",
            activeTab === "catalogo"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Catálogo & Preços ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("variacao")}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2",
            activeTab === "variacao"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Variação de Preços
          {priceVariations.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {priceVariations.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ─── ABA 1: CATÁLOGO DE PRODUTOS E PREÇOS ─── */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          {/* Métricas Resumidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
                  Total de SKUs Catalogados
                </span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {products.length.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
                  Itens com Preço Registrado
                </span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {totalWithPrice.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
                  Itens com Histórico de Reajuste
                </span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {priceVariations.length.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar por descrição, código ou NCM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCompanyProducts}
                disabled={isLoading}
                className="h-9 text-xs gap-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                Atualizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={products.length === 0}
                className="h-9 text-xs gap-1.5 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-50"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-zinc-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-xs">Carregando catálogo da empresa...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                {searchQuery
                  ? "Nenhum produto encontrado com os termos de busca."
                  : "Nenhum produto salvo para esta empresa ainda. Conclua uma contagem informando esta empresa para alimentar o catálogo."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/70 dark:bg-zinc-800/40">
                    <TableRow className="border-b border-zinc-200/80 dark:border-zinc-800/60">
                      <TableHead className="text-xs font-semibold w-40">Cód. Barras</TableHead>
                      <TableHead className="text-xs font-semibold">Descrição</TableHead>
                      <TableHead className="text-xs font-semibold">Categoria</TableHead>
                      <TableHead className="text-xs font-semibold w-24">NCM</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-32">Último Preço</TableHead>
                      <TableHead className="text-xs font-semibold w-32">Último Inventário</TableHead>
                      <TableHead className="text-center text-xs font-semibold w-24">Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredProducts.map((p) => (
                      <TableRow key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 text-xs">
                        <TableCell className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {p.codigo_barras}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                          {p.descricao}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {p.categoria || "Não Informado"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-zinc-400">
                          {p.ncm || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {p.ultimo_preco && p.ultimo_preco > 0
                            ? `R$ ${p.ultimo_preco.toFixed(2).replace(".", ",")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {new Date(p.data_ultimo_inventario).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.historico_precos && p.historico_precos.length > 1 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProductHistory(p)}
                              className="h-7 text-[11px] gap-1 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <History className="h-3 w-3" />
                              {p.historico_precos.length}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA 2: VARIAÇÃO DE PREÇOS (REAJUSTES) ─── */}
      {activeTab === "variacao" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
            {priceVariations.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                Nenhum produto com reajuste de preço identificado até o momento. Conforme novas contagens com novos preços forem salvas, o comparativo aparecerá aqui.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50/70 dark:bg-zinc-800/40">
                    <TableRow className="border-b border-zinc-200/80 dark:border-zinc-800/60">
                      <TableHead className="text-xs font-semibold">Produto</TableHead>
                      <TableHead className="text-xs font-semibold w-40">Cód. Barras</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-32">Preço Anterior</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-32">Preço Atual</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-32">Variação (R$)</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-28">Variação (%)</TableHead>
                      <TableHead className="text-center text-xs font-semibold w-24">Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {priceVariations.map((v) => (
                      <TableRow key={v.product.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 text-xs">
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                          {v.product.descricao}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-zinc-500">
                          {v.product.codigo_barras}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-500">
                          R$ {v.previousPrice.toFixed(2).replace(".", ",")}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          R$ {v.currentPrice.toFixed(2).replace(".", ",")}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono font-semibold", v.diff > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                          {v.diff > 0 ? `+ R$ ${v.diff.toFixed(2).replace(".", ",")}` : `- R$ ${Math.abs(v.diff).toFixed(2).replace(".", ",")}`}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold py-0.5",
                              v.diff > 0
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200"
                            )}
                          >
                            {v.diff > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1 inline" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1 inline" />
                            )}
                            {v.percent > 0 ? `+${v.percent.toFixed(1)}%` : `${v.percent.toFixed(1)}%`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProductHistory(v.product)}
                            className="h-7 text-[11px] gap-1 px-2 text-blue-600 hover:text-blue-700"
                          >
                            <History className="h-3 w-3" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal de Histórico de Reajustes de um Produto ─── */}
      <Dialog
        open={Boolean(selectedProductHistory)}
        onOpenChange={(open) => !open && setSelectedProductHistory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Histórico de Reajustes do Produto
            </DialogTitle>
          </DialogHeader>

          {selectedProductHistory && (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedProductHistory.descricao}
                </p>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Código: {selectedProductHistory.codigo_barras}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Linha do Tempo de Preços:
                </span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
                  {selectedProductHistory.historico_precos.map((h, i) => (
                    <div
                      key={h.id}
                      className="p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="font-mono text-zinc-600 dark:text-zinc-400">
                          {new Date(h.data_registro).toLocaleDateString("pt-BR")}
                        </span>
                        {i === 0 && (
                          <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 py-0 font-semibold">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        R$ {h.preco.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
