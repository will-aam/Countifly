"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  TrendingUp,
  History,
  Download,
  Calendar,
  Loader2,
  DollarSign,
  Barcode,
} from "lucide-react";
import { formatCurrency, formatNumberBR } from "@/lib/utils";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";

interface CompanyProductItem {
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

interface CompanyProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number | null;
  companyName: string;
}

export function CompanyProductsModal({
  isOpen,
  onClose,
  companyId,
  companyName,
}: CompanyProductsModalProps) {
  const [products, setProducts] = useState<CompanyProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen || !companyId) return;

    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}/products?limit=200`);
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data.products) ? data.products : []);
        } else {
          setProducts([]);
        }
      } catch (e) {
        console.error("Erro ao carregar catálogo da empresa:", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [isOpen, companyId]);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.descricao.toLowerCase().includes(q) ||
      p.codigo_barras.toLowerCase().includes(q) ||
      (p.codigo_produto && p.codigo_produto.toLowerCase().includes(q)) ||
      (p.ncm && p.ncm.includes(q))
    );
  });

  const handleExportCsv = () => {
    if (products.length === 0) {
      toast({ title: "Nenhum produto cadastrado para exportar", variant: "destructive" });
      return;
    }

    const exportRows = products.map((p) => ({
      "Código de Barras": p.codigo_barras,
      "Código do Produto": p.codigo_produto || "",
      "Descrição": p.descricao,
      "NCM": p.ncm || "",
      "Categoria": p.categoria || "Geral",
      "Último Preço (R$)": p.ultimo_preco ? p.ultimo_preco.toFixed(2) : "0.00",
      "Último Inventário": new Date(p.data_ultimo_inventario).toLocaleDateString("pt-BR"),
      "Histórico de Preços": p.historico_precos.map((h) => `R$ ${h.preco.toFixed(2)} (${new Date(h.data_registro).toLocaleDateString("pt-BR")})`).join(" | "),
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.download = `catalogo_precos_${cleanName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Catálogo da empresa exportado com sucesso!" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary shrink-0" />
                Catálogo & Histórico de Preços
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Produtos e série histórica de preços do cliente <span className="font-semibold text-foreground">{companyName}</span>
              </DialogDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto shrink-0"
              disabled={loading || products.length === 0}
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exportar Catálogo</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Barra de Busca e Indicadores */}
        <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, código ou NCM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto shrink-0">
            <span className="font-mono font-semibold text-foreground">{filteredProducts.length}</span> itens registrados
          </div>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-border/80 rounded-xl bg-card">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Carregando catálogo do cliente...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-2">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-1" />
              <p className="text-sm font-semibold text-foreground">
                {products.length === 0 ? "Nenhum produto registrado ainda" : "Nenhum produto encontrado"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {products.length === 0
                  ? "Ao salvar uma contagem atrelada a esta empresa, os produtos e preços contados são sincronizados automaticamente aqui."
                  : "Tente outro termo na busca."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredProducts.map((p) => {
                const hasPriceHistory = p.historico_precos && p.historico_precos.length > 1;

                return (
                  <div
                    key={p.id}
                    className="p-3 sm:p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{p.descricao}</span>
                        {p.ncm && (
                          <Badge variant="outline" className="text-[10px] font-mono h-4 px-1.5 text-muted-foreground">
                            NCM {p.ncm}
                          </Badge>
                        )}
                        {p.categoria && p.categoria !== "Geral" && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {p.categoria}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3 text-muted-foreground" />
                          {p.codigo_barras}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          Último inventário: {new Date(p.data_ultimo_inventario).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Histórico de Variações */}
                    <div className="flex flex-col sm:items-end justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[10px] text-muted-foreground uppercase font-sans">Último Preço:</span>
                        <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {p.ultimo_preco ? formatCurrency(p.ultimo_preco) : "Sem preço"}
                        </span>
                      </div>

                      {hasPriceHistory && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <History className="h-3 w-3 text-primary shrink-0" />
                          <span>Preços anteriores: </span>
                          <div className="flex items-center gap-1 font-mono">
                            {p.historico_precos.slice(1, 3).map((h) => (
                              <span key={h.id} className="underline decoration-dotted" title={new Date(h.data_registro).toLocaleDateString("pt-BR")}>
                                {formatCurrency(h.preco)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
