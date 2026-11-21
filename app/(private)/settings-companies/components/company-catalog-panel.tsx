// app/(private)/settings-companies/components/company-catalog-panel.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Search,
  Download,
  History,
  TrendingUp,
  TrendingDown,
  Building2,
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
  const [activeTab, setActiveTab] = useState<"catalogo" | "variacao" | "cadastro">("catalogo");
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

    return list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [products]);

  // Exportar Catálogo em CSV
  const handleExportCsv = () => {
    if (products.length === 0) {
      toast({
        title: "Sem produtos para exportar",
        description: "Esta empresa ainda não possui produtos catalogados.",
        variant: "destructive",
      });
      return;
    }

    const rows = products.map((p) => ({
      "Código de Barras": p.codigo_barras,
      "Código do Produto": p.codigo_produto || "",
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

  const itemsAlta = useMemo(() => {
    return priceVariations.filter((v) => v.diff > 0).length;
  }, [priceVariations]);

  const itemsBaixa = useMemo(() => {
    return priceVariations.filter((v) => v.diff < 0).length;
  }, [priceVariations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Superior com Navegação e Seletor de Empresa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Empresas
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {company.nomeFantasia}
              </h2>
              {company.ativo ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  Ativa
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                  Inativa
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              CNPJ: {company.cnpj || "Não cadastrado"}
              {company.razaoSocial && ` • ${company.razaoSocial}`}
            </p>
          </div>
        </div>

        {/* Alternar rápido entre empresas */}
        <div className="flex items-center gap-2">
          {availableCompanies.length > 1 && (
            <select
              value={company.id}
              onChange={(e) => onSelectCompany(Number(e.target.value))}
              aria-label="Selecionar empresa"
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditCompany(company)}
            className="h-9 cursor-pointer gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar Dados
          </Button>
        </div>
      </div>

      {/* Barra de Abas Minimalistas */}
      <div className="flex items-center gap-1 border-b border-border/50 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("catalogo")}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2",
            activeTab === "catalogo"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Catálogo e Preços ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("variacao")}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2",
            activeTab === "variacao"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Variação de Preços
          {priceVariations.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
              {priceVariations.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cadastro")}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer border-b-2 -mb-px flex items-center gap-2",
            activeTab === "cadastro"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Dados Cadastrais
        </button>
      </div>

      {/* ABA 1: CATÁLOGO DE PRODUTOS E PREÇOS */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          {/* Métricas Resumidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Total de Itens Catalogados
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {products.length.toLocaleString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Itens com Preço Registrado
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {totalWithPrice.toLocaleString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Itens com Histórico de Reajuste
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {priceVariations.length.toLocaleString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por descrição, código ou NCM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadCompanyProducts}
                disabled={isLoading}
                className="h-9 px-3 gap-1.5 cursor-pointer"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                Atualizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={products.length === 0}
                className="h-9 px-3 gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Tabela de Produtos */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Carregando catálogo da empresa...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
              <Package className="h-8 w-8 text-muted-foreground/60 mb-1" />
              <p className="text-sm font-semibold text-foreground">
                {products.length === 0
                  ? "Nenhum produto catalogado ainda para esta empresa"
                  : "Nenhum produto encontrado com este filtro"}
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                {products.length === 0
                  ? "Quando você realizar e salvar um inventário selecionando esta empresa, o catálogo de produtos e seus preços de gôndola serão sincronizados aqui automaticamente."
                  : "Tente buscar por outro termo ou limpe o campo de busca."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[140px] text-xs">Código de Barras</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="w-[100px] text-xs">NCM</TableHead>
                    <TableHead className="text-right text-xs">Último Preço</TableHead>
                    <TableHead className="text-center text-xs">Último Inventário</TableHead>
                    <TableHead className="text-center w-[90px] text-xs">Histórico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => {
                    const hasHistory = p.historico_precos && p.historico_precos.length > 1;

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-medium">
                          {p.codigo_barras}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs text-foreground line-clamp-1">
                            {p.descricao}
                          </div>
                          {p.codigo_produto && p.codigo_produto !== p.codigo_barras && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Cód: {p.codigo_produto}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {p.categoria || "Não Informado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.ncm || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {p.ultimo_preco
                            ? `R$ ${p.ultimo_preco.toFixed(2).replace(".", ",")}`
                            : "R$ 0,00"}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {new Date(p.data_ultimo_inventario).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!hasHistory}
                            onClick={() => setSelectedProductHistory(p)}
                            title={hasHistory ? "Visualizar reajustes deste produto" : "Sem reajustes anteriores"}
                            className={cn(
                              "h-7 w-7 p-0 rounded-md cursor-pointer",
                              hasHistory
                                ? "text-primary hover:bg-primary/10"
                                : "text-muted-foreground/30 pointer-events-none"
                            )}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: ANÁLISE DE VARIAÇÃO DE PREÇOS */}
      {activeTab === "variacao" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Produtos com Reajuste
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {priceVariations.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Produtos em Alta
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {itemsAlta}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/70">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Produtos em Baixa
                  </span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {itemsBaixa}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {priceVariations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
              <TrendingUp className="h-8 w-8 text-muted-foreground/60 mb-1" />
              <p className="text-sm font-semibold text-foreground">
                Nenhum reajuste identificado ainda
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                As variações de preço são calculadas automaticamente quando você realiza novas contagens para o mesmo cliente em datas diferentes. Quando houver alteração de preço em algum produto, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="w-[130px] text-xs">Código de Barras</TableHead>
                    <TableHead className="text-right text-xs">Preço Anterior</TableHead>
                    <TableHead className="text-right text-xs">Preço Atual</TableHead>
                    <TableHead className="text-right text-xs">Variação R$</TableHead>
                    <TableHead className="text-right text-xs">Variação %</TableHead>
                    <TableHead className="text-center text-xs">Data da Mudança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceVariations.map((v) => {
                    const isPositive = v.diff > 0;

                    return (
                      <TableRow key={v.product.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-xs text-foreground line-clamp-1">
                            {v.product.descricao}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {v.product.categoria || "Não Informado"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {v.product.codigo_barras}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          R$ {v.previousPrice.toFixed(2).replace(".", ",")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                          R$ {v.currentPrice.toFixed(2).replace(".", ",")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                            {isPositive ? "+" : ""}R$ {v.diff.toFixed(2).replace(".", ",")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0",
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                            )}
                          >
                            {isPositive ? "+" : ""}{v.percent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {new Date(v.date).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DADOS CADASTRAIS */}
      {activeTab === "cadastro" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Informações Cadastrais da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">Nome Fantasia</span>
                <span className="font-semibold text-foreground block text-sm">
                  {company.nomeFantasia}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">Razão Social</span>
                <span className="font-semibold text-foreground block text-sm">
                  {company.razaoSocial || "-"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">CNPJ</span>
                <span className="font-mono font-semibold text-foreground block text-sm">
                  {company.cnpj || "Não cadastrado"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">Cadastrada em</span>
                <span className="font-mono text-foreground block">
                  {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-end">
              <Button onClick={() => onEditCompany(company)} className="cursor-pointer gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Editar Dados Cadastrais
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Histórico de Reajustes de um Produto */}
      <Dialog
        open={Boolean(selectedProductHistory)}
        onOpenChange={(open) => !open && setSelectedProductHistory(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Reajustes do Produto
            </DialogTitle>
          </DialogHeader>

          {selectedProductHistory && (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <p className="text-xs font-semibold text-foreground">
                  {selectedProductHistory.descricao}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Código: {selectedProductHistory.codigo_barras}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Linha do Tempo de Preços:
                </span>
                <div className="divide-y divide-border/60 border rounded-lg bg-card">
                  {selectedProductHistory.historico_precos.map((h, i) => (
                    <div
                      key={h.id}
                      className="p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-muted-foreground">
                          {new Date(h.data_registro).toLocaleDateString("pt-BR")}
                        </span>
                        {i === 0 && (
                          <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20 py-0">
                            Atual
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
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
