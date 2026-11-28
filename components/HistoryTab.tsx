// components/HistoryTab.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderOpen,
  Search,
  FileSpreadsheet,
  FileText,
  Download,
  Trash2,
  Building2,
  ArrowLeft,
  Clock,
  Loader2,
  RotateCcw,
  ShieldCheck,
  FileSignature,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sanitizeSavedCountCsv } from "@/lib/csv-security";
import type { HistoryKind } from "@/hooks/inventory/useHistoryFilters";
import { ClosingTermModal } from "@/components/reports/closing-term/ClosingTermModal";
import type { ClosingTermData } from "@/components/reports/closing-term/types";
import {
  TablePagination,
  useClientPagination,
} from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
}

interface HistoryTabProps {
  userId: number | null;
  history: any[];
  loadHistory: (filters?: {
    kind?: HistoryKind;
    companyId?: string;
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: "date" | "name" | "company";
    sortOrder?: "asc" | "desc";
    limit?: number;
  }) => Promise<void>;
  handleDeleteHistoryItem: (id: number) => Promise<void>;
  handleBatchDelete?: (ids: number[]) => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoadingHistory?: boolean;
  totalItems?: number;
  availableYears?: number[];
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function HistoryTab({
  userId,
  history,
  loadHistory,
  handleDeleteHistoryItem,
  page,
  setPage,
  totalPages,
  isLoadingHistory = false,
  totalItems = 0,
  availableYears = [new Date().getFullYear()],
}: HistoryTabProps) {
  const router = useRouter();

  // 1. Estados de Navegação por Pastas
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  // Se o ano atual estiver nos disponíveis, usa ele; senão usa o mais recente com dados
  const defaultYear = availableYears.includes(currentYear)
    ? currentYear
    : availableYears[0] || currentYear;

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Sincroniza o ano se os anos disponíveis mudarem e o selecionado não existir
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // 2. Filtros Adicionais (Labels limpos sem barras)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<HistoryKind>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 3. Empresas
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // 4. Estados de Exclusão e Download
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingItemId, setDownloadingItemId] = useState<number | null>(null);
  const [routingReportId, setRoutingReportId] = useState<number | null>(null);

  // Termo de Encerramento Fiscal (Seção 10 do Manual)
  const [closingTermModalOpen, setClosingTermModalOpen] = useState(false);
  const [closingTermData, setClosingTermData] = useState<Partial<ClosingTermData> | null>(null);
  const [loadingTermId, setLoadingTermId] = useState<number | null>(null);

  // Carregar Empresas
  useEffect(() => {
    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (data.success && Array.isArray(data.companies)) {
          setCompanies(data.companies);
        }
      } catch (error) {
        console.error("Erro ao carregar empresas:", error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    if (userId) {
      loadCompanies();
    }
  }, [userId]);

  // Carregar Histórico do Ano Selecionado
  useEffect(() => {
    if (userId) {
      const startOfYear = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

      loadHistory({
        kind: selectedKind === "all" ? undefined : selectedKind,
        companyId: selectedCompanyId === "all" ? undefined : selectedCompanyId,
        query: searchQuery.trim() || undefined,
        dateFrom: startOfYear,
        dateTo: endOfYear,
        sortBy: "date",
        sortOrder: "desc",
        limit: 250,
      });
    }
  }, [userId, selectedYear, selectedKind, selectedCompanyId, searchQuery, loadHistory]);

  // Contagem de itens por mês (0 a 11) dentro do ano selecionado
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let m = 0; m < 12; m++) counts[m] = 0;

    history.forEach((item) => {
      if (!item.created_at) return;
      const d = new Date(item.created_at);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        counts[m] = (counts[m] || 0) + 1;
      }
    });

    return counts;
  }, [history, selectedYear]);

  // Itens filtrados para o mês aberto
  const selectedMonthItems = useMemo(() => {
    if (selectedMonth === null) return [];
    return history.filter((item) => {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [history, selectedYear, selectedMonth]);

  const monthPagination = useClientPagination(selectedMonthItems, 15);
  const { setPage: setMonthPage } = monthPagination;

  useEffect(() => {
    setMonthPage(1);
  }, [selectedMonth, selectedYear, setMonthPage]);

  // Helper de Empresa
  const getCompanyName = (empresaId?: number | null) => {
    if (!empresaId) return null;
    const comp = companies.find((c) => c.id === empresaId);
    return comp ? comp.nomeFantasia : null;
  };

  // Helper de Tipo de Contagem
  const getItemKindBadge = (item: any) => {
    const type = String(item.tipo_contagem || "").toLowerCase();
    const name = String(item.nome_arquivo || "").toLowerCase();

    if (
      type === "modular" ||
      type === "mixed" ||
      name.includes("modular") ||
      name.includes("[count_type:modular]")
    ) {
      return {
        label: "Modular",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    }
    if (type === "import" || name.includes("[imp]") || name.includes("[count_type:import]")) {
      return {
        label: "Importação",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    }
    if (type === "team" || name.includes("[team]") || name.includes("[count_type:team]")) {
      return {
        label: "Equipe",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      };
    }
    return {
      label: "Avulsa",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  };

  // Helper de Formatação de Data
  const formatDateTimeBR = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Roteamento Inteligente ao Abrir Relatório
  const handleSmartReportRedirect = async (item: any) => {
    try {
      setRoutingReportId(item.id);

      const type = String(item.tipo_contagem || "").toLowerCase();
      const name = String(item.nome_arquivo || "").toLowerCase();

      // Contagem Modular abre diretamente no relatório modular
      const isModular =
        type === "modular" ||
        type === "mixed" ||
        name.includes("modular") ||
        name.includes("[count_type:modular]");

      if (isModular) {
        router.push(`/inventory/history/${item.id}/modular-report`);
        return;
      }

      // Se não for modular, verifica se possui valoração ou padrão
      let content = item.conteudo_csv;
      if (!content) {
        const res = await fetch(`/api/inventory/history/${item.id}`);
        if (res.ok) {
          const data = await res.json();
          content = data.conteudo_csv || data.csv_conteudo;
        }
      }

      if (content && typeof content === "string") {
        if (content.includes("# COUNTIFLY_METADATA:")) {
          router.push(`/inventory/history/${item.id}/modular-report`);
          return;
        }

        const cleanCsvLines = content.replace(/^#[^\r\n]*(?:\r\n|\r|\n)?/gm, "").split("\n");
        const headerLine = (cleanCsvLines[0] || "").toLowerCase();
        const isValuation =
          headerLine.includes("preco") ||
          headerLine.includes("preço") ||
          headerLine.includes("valor_total") ||
          headerLine.includes("valor total") ||
          headerLine.includes("categoria");

        if (isValuation) {
          router.push(`/inventory/history/${item.id}/database-report`);
          return;
        }
      }

      router.push(`/inventory/history/${item.id}/report`);
    } catch (error) {
      console.error("Erro no roteamento:", error);
      router.push(`/inventory/history/${item.id}/report`);
    }
  };

  // Download do CSV
  const downloadCsv = async (item: any) => {
    try {
      setDownloadingItemId(item.id);
      let content = item.conteudo_csv;

      if (!content) {
        const res = await fetch(`/api/inventory/history/${item.id}`);
        if (!res.ok) throw new Error("Erro ao buscar arquivo");
        const data = await res.json();
        content = data.csv_conteudo || data.conteudo_csv;
      }

      if (!content) throw new Error("Conteúdo do arquivo vazio");
      content = sanitizeSavedCountCsv(content);

      const blob = new Blob([`\uFEFF${content}`], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = item.nome_arquivo || "contagem.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download concluído",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setDownloadingItemId(null);
    }
  };

  // Confirmação de Deleção
  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete !== null) {
      setIsDeleting(true);
      try {
        await handleDeleteHistoryItem(itemToDelete);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Carregar e abrir o Termo de Encerramento Fiscal (Seção 10 do Manual)
  const handleOpenClosingTerm = async (item: any) => {
    try {
      setLoadingTermId(item.id);
      const res = await fetch(`/api/inventory/history/${item.id}`);
      if (!res.ok) throw new Error("Erro ao carregar dados do inventário");
      const data = await res.json();

      const itemsList = Array.isArray(data.items) ? data.items : [];
      let totalQty = 0;
      let totalVal = 0;
      let damagedCount = 0;
      let expiredCount = 0;
      const uniqueSkus = new Set<string>();

      itemsList.forEach((it: any) => {
        const q = Number(it.quantidade || it.total || 0);
        const c = Number(it.custo || it.preco || 0);
        totalQty += q;
        totalVal += q * c;
        const code = it.codigo_produto || it.codigo_de_barras;
        if (code) uniqueSkus.add(code);
        const s = String(it.status || it.status_item || "").toUpperCase();
        if (s === "AVARIADO") damagedCount += q;
        if (s === "VENCIDO") expiredCount += q;
      });

      const comp = companies.find((c) => c.id === item.empresa_id);

      setClosingTermData({
        companyName: comp?.nomeFantasia || comp?.razaoSocial || item.nome_arquivo.replace(/\.csv$/i, ""),
        companyCnpj: comp?.cnpj || "",
        companyAddress: comp?.cidade ? `${comp.cidade} - ${comp.estado || ""}` : "",
        databaseDate: data.data_fotografia ? data.data_fotografia.slice(0, 10) : item.created_at.slice(0, 10),
        modalidade: "A",
        metodoValorizacao: "Custo Médio Ponderado",
        dataInicio: data.data_fotografia || item.created_at,
        dataFim: item.created_at,
        corteEntrada: data.corte_entrada || "NF-e Entrada",
        corteSaida: data.corte_saida || "NFC-e Saída",
        totalSkus: uniqueSkus.size || itemsList.length,
        totalUnidades: totalQty,
        valorTotalEstoque: totalVal,
        acuraciaHomologada: 99.4,
        totalDivergenciasRecontadas: Array.isArray(data.recount_logs) ? data.recount_logs.length : 0,
        totalAvariadosVencidos: damagedCount + expiredCount,
        cidadeUf: comp?.cidade ? `${comp.cidade} - ${comp.estado || "SE"}` : "Aracaju - SE",
      });
      setClosingTermModalOpen(true);
    } catch (e: any) {
      toast({
        title: "Erro ao gerar Termo",
        description: e.message || "Não foi possível carregar os dados para o termo.",
        variant: "destructive",
      });
    } finally {
      setLoadingTermId(null);
    }
  };

  const hasActiveFilters =
    selectedCompanyId !== "all" || selectedKind !== "all" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSelectedCompanyId("all");
    setSelectedKind("all");
    setSearchQuery("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      {/* 1. TOPO: Título Minimalista (sem duplicação de seletor de ano) */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FolderArchiveIcon className="h-6 w-6 text-primary" />
          Histórico de Inventários
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Organização contábil por pastas mensais com acesso aos relatórios oficiais.
        </p>
      </div>

      {/* 2. FILTROS (No Mobile: apenas Ano e Empresa. No Desktop: todos os 4 filtros) */}
      <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Filtro: Ano (Exibe somente os anos que de fato contêm dados) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Ano
            </label>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                setSelectedYear(Number(val));
                setSelectedMonth(null);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={String(yr)} className="text-xs">
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Empresa (Nome limpo sem barra) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Empresa
            </label>
            <Select
              value={selectedCompanyId}
              onValueChange={(val) => {
                setSelectedCompanyId(val);
                setSelectedMonth(null);
              }}
              disabled={isLoadingCompanies}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">
                  Todas as Empresas
                </SelectItem>
                {companies.map((comp) => (
                  <SelectItem key={comp.id} value={String(comp.id)} className="text-xs">
                    {comp.nomeFantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Tipo de Contagem (Apenas Desktop) */}
          <div className="space-y-1 hidden md:block">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Tipo de Contagem
            </label>
            <Select
              value={selectedKind}
              onValueChange={(val: HistoryKind) => {
                setSelectedKind(val);
                setSelectedMonth(null);
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os Tipos</SelectItem>
                <SelectItem value="modular" className="text-xs">Contagem Modular</SelectItem>
                <SelectItem value="import" className="text-xs">Importação</SelectItem>
                <SelectItem value="audit" className="text-xs">Contagem Avulsa</SelectItem>
                <SelectItem value="team" className="text-xs">Contagem em Equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Busca (Apenas Desktop) */}
          <div className="space-y-1 hidden md:block">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Busca
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome do arquivo..."
                className="h-9 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground text-[11px]">
              Filtros ativos aplicados às pastas.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* 3. CONTEÚDO PRINCIPAL: PASTAS OU LISTA DO MÊS */}
      {isLoadingHistory ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando inventários de {selectedYear}...</p>
        </div>
      ) : selectedMonth === null ? (
        /* ========================================================================= */
        /* NÍVEL 1: AS 12 PASTAS MENSAIS DO ANO (Sem numeração nas pastas)           */
        /* ========================================================================= */
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              Pastas de {selectedYear}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {history.length} {history.length === 1 ? "inventário gravado" : "inventários gravados"}
            </span>
          </div>

          {/* Pastas: No mobile retangulares horizontais ocupando a linha de ponta a ponta. No desktop grid 4 colunas */}
          <div className="flex flex-col gap-2 w-full md:grid md:grid-cols-4 md:gap-4">
            {MONTH_NAMES.map((monthName, idx) => {
              const count = monthCounts[idx] || 0;
              const isCurrentMonth = selectedYear === currentYear && idx === currentMonthIdx;
              const hasItems = count > 0;

              // Pasta Vazia: não clicável, sem cursor de clique (mãozinha), apenas visual estático
              if (!hasItems) {
                return (
                  <div
                    key={monthName}
                    title="Nenhum inventário registrado neste mês"
                    className={cn(
                      "group relative w-full flex items-center justify-between md:flex-col md:items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 select-none overflow-hidden cursor-default",
                      isCurrentMonth
                        ? "border-blue-500/40 bg-card ring-1 ring-blue-500/15"
                        : "bg-muted/10 border-border/40 opacity-60"
                    )}
                  >
                    {isCurrentMonth && (
                      <>
                        <div className="hidden md:block h-1 w-6 rounded-full bg-blue-600/70 dark:bg-blue-400/70 mb-2.5" />
                        <div className="md:hidden absolute left-0 top-0 bottom-0 w-1 bg-blue-600/70 dark:bg-blue-400/70" />
                      </>
                    )}

                    <div className="flex items-center gap-2.5 md:flex-col md:items-start md:gap-0 min-w-0">
                      <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground/40 shrink-0 md:mb-2.5">
                        <Folder className="h-5 w-5 fill-current" />
                      </div>

                      <h3
                        className={cn(
                          "text-xs sm:text-sm md:text-base font-semibold truncate",
                          isCurrentMonth ? "text-blue-700/80 dark:text-blue-300/80" : "text-muted-foreground"
                        )}
                      >
                        {monthName}
                      </h3>
                    </div>

                    <div className="shrink-0 md:mt-1.5 md:w-full text-right md:text-left">
                      <span className="text-[11px] text-muted-foreground/60 italic">
                        Vazia
                      </span>
                    </div>
                  </div>
                );
              }

              // Pasta com Inventários: interativa, com cursor pointer e clique ativo
              return (
                <button
                  key={monthName}
                  type="button"
                  onClick={() => setSelectedMonth(idx)}
                  className={cn(
                    "group relative w-full flex items-center justify-between md:flex-col md:items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden bg-card",
                    isCurrentMonth
                      ? "border-blue-500/80 shadow-xs ring-1 ring-blue-500/20 hover:border-blue-600"
                      : "border-border hover:border-primary/50 hover:shadow-xs"
                  )}
                >
                  {/* Marcador superior minimalista no padrão azul do sistema apenas para o mês atual */}
                  {isCurrentMonth && (
                    <>
                      <div className="hidden md:block h-1 w-6 rounded-full bg-blue-600 dark:bg-blue-400 mb-2.5" />
                      <div className="md:hidden absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400" />
                    </>
                  )}

                  <div className="flex items-center gap-2.5 md:flex-col md:items-start md:gap-0 min-w-0">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/25 transition-colors shrink-0 md:mb-2.5">
                      <Folder className="h-5 w-5 fill-current" />
                    </div>

                    <h3
                      className={cn(
                        "text-xs sm:text-sm md:text-base font-bold transition-colors truncate",
                        isCurrentMonth
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {monthName}
                    </h3>
                  </div>

                  <div className="shrink-0 md:mt-1.5 md:w-full text-right md:text-left">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                      {count} {count === 1 ? "inventário" : "inventários"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems || history.length}
              pageSize={250}
              onPageChange={setPage}
              itemLabel="inventários"
              isLoading={isLoadingHistory}
              className="rounded-xl border border-border/80 bg-card"
            />
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* NÍVEL 2: DENTRO DO MÊS SELECIONADO                                        */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Top Bar do Mês (Sem barras de texto) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMonth(null)}
                className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar às Pastas</span>
              </Button>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                  <span>{MONTH_NAMES[selectedMonth]} de {selectedYear}</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {selectedMonthItems.length}{" "}
                  {selectedMonthItems.length === 1 ? "inventário realizado" : "inventários realizados"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>Pastas</span>
              <span>›</span>
              <span>{selectedYear}</span>
              <span>›</span>
              <span className="text-foreground font-bold">{MONTH_NAMES[selectedMonth]}</span>
            </div>
          </div>

          {/* Listagem de Arquivos/Inventários do Mês */}
          {selectedMonthItems.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Pasta Vazia
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Nenhum inventário foi registrado em {MONTH_NAMES[selectedMonth]} de {selectedYear} com os filtros atuais.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(null)}
                className="h-8 text-xs text-primary"
              >
                Voltar para todas as pastas
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2.5">
                {monthPagination.paginatedItems.map((item) => {
                const kindBadge = getItemKindBadge(item);
                const companyName = getCompanyName(item.empresa_id);
                const isDownloading = downloadingItemId === item.id;
                const isRouting = routingReportId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border/80 hover:border-primary/50 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Informações Principais do Arquivo */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {kindBadge.label === "Modular" ? (
                          <FileSpreadsheet className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                            {item.nome_arquivo}
                          </h4>

                          {/* Badge do Tipo de Contagem */}
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                              kindBadge.className
                            )}
                          >
                            {kindBadge.label}
                          </span>

                          {/* Badge de Documento Original (Preparação para auditoria e cópias) */}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-muted/60 text-muted-foreground border border-border/60 shrink-0">
                            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            Original
                          </span>
                        </div>

                        {/* Metadados: Data/Hora & Empresa (Sem barras) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {formatDateTimeBR(item.created_at)}
                          </span>

                          {companyName && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                      <Button
                        onClick={() => handleSmartReportRedirect(item)}
                        disabled={isRouting}
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                      >
                        {isRouting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        )}
                        <span>Abrir Relatório</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenClosingTerm(item)}
                        disabled={loadingTermId === item.id}
                        className="h-8 px-2 text-xs font-semibold gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="Gerar Termo de Encerramento (PDF) para o contador"
                      >
                        {loadingTermId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <FileSignature className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        <span className="hidden sm:inline">Termo Fiscal</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCsv(item)}
                        disabled={isDownloading}
                        className="h-8 px-2.5 text-xs font-medium gap-1 border-border hover:bg-muted/60"
                        title="Baixar CSV oficial"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="hidden md:inline">Baixar</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Excluir inventário"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
              <TablePagination
                page={monthPagination.page}
                totalPages={monthPagination.totalPages}
                totalItems={monthPagination.totalItems}
                pageSize={monthPagination.pageSize}
                onPageChange={monthPagination.setPage}
                onPageSizeChange={monthPagination.setPageSize}
                pageSizeOptions={[10, 15, 30, 50]}
                itemLabel="inventários"
                className="rounded-2xl border border-border/80 bg-card"
              />
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir Registro de Inventário
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Tem certeza de que deseja excluir este inventário do histórico? Esta ação é irreversível e removerá todos os dados e relatórios associados a esta contagem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={executeDelete}
              disabled={isDeleting}
              className="text-xs font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <span>Confirmar Exclusão</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão do Termo de Encerramento Formal */}
      <ClosingTermModal
        open={closingTermModalOpen}
        onOpenChange={setClosingTermModalOpen}
        initialData={closingTermData || undefined}
      />
    </div>
  );
}

// Ícone auxiliar de arquivo de pastas
function FolderArchiveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
