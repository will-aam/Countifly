// app/(private)/settings-companies/companies-client.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Plus,
  Loader2,
  Pencil,
  CheckCircle2,
  XCircle,
  Lock,
  Search,
  Package,
  MoreHorizontal,
  Power,
  Store,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { CompanyCatalogPanel } from "./components/company-catalog-panel";

export interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
  createdAt: string;
}

interface Props {
  initialCompanies: Company[];
  initialTotal: number;
  initialActiveCount: number;
  initialInactiveCount: number;
  initialPageSize?: number;
  initialAvailableCompanies?: Array<{ id: number; nomeFantasia: string }>;
  hasEmpresaAccess: boolean;
}

// Máscara para CNPJ
const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};

export function SettingsCompaniesClient({
  initialCompanies,
  initialTotal,
  initialActiveCount,
  initialInactiveCount,
  initialPageSize = 15,
  initialAvailableCompanies = [],
  hasEmpresaAccess,
}: Props) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [availableCompanies, setAvailableCompanies] = useState<
    Array<{ id: number; nomeFantasia: string }>
  >(initialAvailableCompanies);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  // Paginação e filtros de busca (Server-Side)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(initialTotal / initialPageSize)),
  );
  const [counts, setCounts] = useState({
    total: initialActiveCount + initialInactiveCount,
    active: initialActiveCount,
    inactive: initialInactiveCount,
  });
  const isFirstRender = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Campos do Formulário
  const [cnpj, setCnpj] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const loadCompaniesPage = useCallback(
    async (
      targetPage = page,
      targetLimit = pageSize,
      targetQuery = debouncedSearch,
      targetStatus = statusFilter,
      signal?: AbortSignal,
    ) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(targetLimit),
          status: targetStatus,
        });
        if (targetQuery) {
          params.set("q", targetQuery);
        }
        const res = await fetch(`/api/companies?${params.toString()}`, { signal });
        const data = await res.json();
        if (data.success && Array.isArray(data.companies)) {
          setCompanies(data.companies);
          setTotalItems(data.meta?.total ?? data.companies.length);
          setTotalPages(data.meta?.totalPages ?? 1);
          if (data.counts) {
            setCounts(data.counts);
          }
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Erro ao recarregar empresas:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch, statusFilter],
  );

  useEffect(() => {
    if (!hasEmpresaAccess) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (
        page === 1 &&
        pageSize === initialPageSize &&
        !debouncedSearch &&
        statusFilter === "ALL"
      ) {
        return;
      }
    }

    const controller = new AbortController();
    loadCompaniesPage(page, pageSize, debouncedSearch, statusFilter, controller.signal);
    return () => controller.abort();
  }, [hasEmpresaAccess, page, pageSize, debouncedSearch, statusFilter, initialPageSize, loadCompaniesPage]);

  const refreshCompanies = async () => {
    await loadCompaniesPage(page, pageSize, debouncedSearch, statusFilter);
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (data.success && Array.isArray(data.companies)) {
        setAvailableCompanies(
          data.companies
            .filter((c: Company) => c.ativo)
            .map((c: Company) => ({ id: c.id, nomeFantasia: c.nomeFantasia })),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setCnpj(company.cnpj || "");
      setNomeFantasia(company.nomeFantasia);
      setRazaoSocial(company.razaoSocial || "");
      setCep("");
      setCidade("");
      setEstado("");
    } else {
      setEditingCompany(null);
      setCnpj("");
      setNomeFantasia("");
      setRazaoSocial("");
      setCep("");
      setCidade("");
      setEstado("");
    }
    setIsDialogOpen(true);
  };

  // BUSCA NA BRASIL API
  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setCnpj(formatted);

    const rawCnpj = formatted.replace(/\D/g, "");

    if (rawCnpj.length === 14 && !editingCompany) {
      setSearchingCnpj(true);
      try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`,
        );
        if (!response.ok) throw new Error("CNPJ não encontrado");

        const data = await response.json();
        setRazaoSocial(data.razao_social || "");
        setNomeFantasia(data.nome_fantasia || data.razao_social || "");
        setCep(data.cep || "");
        setCidade(data.municipio || "");
        setEstado(data.uf || "");

        toast({
          title: "Dados encontrados!",
          description: "Formulário preenchido automaticamente.",
        });
      } catch {
        toast({
          title: "Atenção",
          description: "Não foi possível puxar os dados deste CNPJ.",
          variant: "destructive",
        });
      } finally {
        setSearchingCnpj(false);
      }
    }
  };

  const handleSave = async () => {
    if (!nomeFantasia.trim()) {
      toast({
        title: "Erro",
        description: "Nome Fantasia é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const url = editingCompany
        ? `/api/companies/${editingCompany.id}`
        : "/api/companies";
      const method = editingCompany ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFantasia: nomeFantasia.trim(),
          razaoSocial: razaoSocial.trim() || null,
          cnpj: cnpj.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: editingCompany
            ? "Empresa atualizada."
            : "Empresa cadastrada.",
        });
        setIsDialogOpen(false);
        refreshCompanies();
      } else {
        throw new Error(data.error || "Erro ao salvar empresa");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (
    companyId: number,
    currentStatus: boolean,
  ) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !currentStatus }),
      });
      if (res.ok) {
        toast({
          title: currentStatus ? "Empresa desativada" : "Empresa ativada",
          description: "Status atualizado com sucesso.",
        });
        refreshCompanies();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Dados já filtrados e paginados no servidor
  const filteredCompanies = companies;
  const activeCount = counts.active;
  const inactiveCount = counts.inactive;

  // TELA DE BLOQUEIO PARA QUEM NÃO TEM ACESSO
  if (!hasEmpresaAccess) {
    return (
      <Card className="border-2 border-dashed border-border/50 bg-muted/10 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4 relative border border-border/50">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background border border-border shadow-sm">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Múltiplas Empresas Bloqueado
          </h3>
          <p className="text-sm text-muted-foreground max-w-[420px] mb-8">
            Este recurso premium não está ativo no seu plano.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Painel de Catálogo & Preços quando selecionado
  const matchedFromPage = companies.find((c) => c.id === selectedCompanyId);
  const matchedAvailable = availableCompanies.find((c) => c.id === selectedCompanyId);
  const selectedCompany: Company | undefined =
    matchedFromPage ??
    (matchedAvailable
      ? {
          id: matchedAvailable.id,
          nomeFantasia: matchedAvailable.nomeFantasia,
          razaoSocial: null,
          cnpj: null,
          ativo: true,
          createdAt: "",
        }
      : undefined);

  if (selectedCompany) {
    return (
      <CompanyCatalogPanel
        company={selectedCompany}
        onBack={() => setSelectedCompanyId(null)}
        onEditCompany={(comp) => handleOpenDialog(comp)}
        availableCompanies={availableCompanies}
        onSelectCompany={(id) => setSelectedCompanyId(id)}
      />
    );
  }

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")}>
      {/* ─── Header Principal ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Gestão de Empresas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Cadastre filiais ou clientes e consulte o catálogo de produtos e inteligência de preços.
          </p>
        </div>

        <Button
          onClick={() => handleOpenDialog()}
          className="h-9 px-4 gap-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {/* ─── Cards de Resumo ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
              Total de Empresas
            </span>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {counts.total}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
              Empresas Ativas
            </span>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-xs">
          <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block">
              Empresas Inativas
            </span>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {inactiveCount}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Barra de Filtros e Busca ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, razão social ou CNPJ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
          />
        </div>

        {/* Alternador de Status */}
        <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
              statusFilter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            Todas ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ACTIVE");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
              statusFilter === "ACTIVE"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            Ativas ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("INACTIVE");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
              statusFilter === "INACTIVE"
                ? "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            Inativas ({inactiveCount})
          </button>
        </div>
      </div>

      {/* ─── Listagem: Tabela Desktop e Cards Mobile ─── */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 text-center space-y-3">
          <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 w-fit mx-auto">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Nenhuma empresa encontrada
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {counts.total === 0
              ? "Comece cadastrando sua primeira filial ou cliente para organizar suas contagens."
              : "Nenhum resultado corresponde ao filtro pesquisado."}
          </p>
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP (TABELA) */}
          <div className="hidden md:block rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/70 dark:bg-zinc-800/40">
                <TableRow className="border-b border-zinc-200/80 dark:border-zinc-800/60">
                  <TableHead className="w-24 text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Nome Fantasia</TableHead>
                  <TableHead className="text-xs font-semibold">Razão Social</TableHead>
                  <TableHead className="text-xs font-semibold w-44">CNPJ</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-56">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    className={cn(
                      "transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30",
                      !company.ativo && "opacity-60 bg-zinc-50/30 dark:bg-zinc-900/20"
                    )}
                  >
                    <TableCell>
                      {company.ativo ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 font-medium">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {company.nomeFantasia}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[240px]">
                      {company.razaoSocial || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {company.cnpj || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {/* Ação Primária: Catálogo & Preços */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCompanyId(company.id)}
                          className="h-8 px-2.5 text-xs font-medium text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-1.5 cursor-pointer"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Catálogo & Preços
                        </Button>

                        {/* Ações Secundárias (Menu Compacto) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(company)}
                              className="text-xs gap-2 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar Empresa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(company.id, company.ativo)}
                              className={cn(
                                "text-xs gap-2 cursor-pointer",
                                company.ativo ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {company.ativo ? "Desativar Empresa" : "Ativar Empresa"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 30, 50]}
              itemLabel="empresas"
              isLoading={loading}
            />
          </div>

          {/* VISÃO MOBILE (CARDS RESPONSIVOS) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className={cn(
                  "p-4 rounded-xl border bg-white dark:bg-zinc-900/60 shadow-xs flex flex-col gap-3",
                  company.ativo
                    ? "border-zinc-200/80 dark:border-zinc-800"
                    : "border-zinc-200 dark:border-zinc-800/60 opacity-75 bg-zinc-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {company.nomeFantasia}
                    </h4>
                    {company.razaoSocial && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {company.razaoSocial}
                      </p>
                    )}
                    <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">
                      CNPJ: {company.cnpj || "Sem CNPJ"}
                    </p>
                  </div>

                  {company.ativo ? (
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 shrink-0">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 shrink-0">
                      Inativa
                    </Badge>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs font-medium text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 gap-1.5 cursor-pointer"
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    <Package className="h-3.5 w-3.5" />
                    Catálogo & Preços
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => handleOpenDialog(company)}
                        className="text-xs gap-2 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar Empresa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(company.id, company.ativo)}
                        className={cn(
                          "text-xs gap-2 cursor-pointer",
                          company.ativo ? "text-red-600" : "text-emerald-600"
                        )}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {company.ativo ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            <TablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10, 15, 30, 50]}
              itemLabel="empresas"
              isLoading={loading}
              className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
            />
          </div>
        </>
      )}

      {/* ─── Dialog de Cadastro / Edição ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCompany ? "Editar Informações da Empresa" : "Cadastrar Nova Empresa"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {!editingCompany &&
                "Digite o CNPJ para buscar os dados cadastrais na Receita Federal automaticamente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="text-xs font-semibold">
                CNPJ (com busca automática)
              </Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  maxLength={18}
                  className="pr-10 h-9 text-xs"
                />
                {searchingCnpj ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nomeFantasia" className="text-xs font-semibold">
                  Nome Fantasia <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nomeFantasia"
                  placeholder="Ex: Matriz Centro"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="razaoSocial" className="text-xs font-semibold">
                  Razão Social
                </Label>
                <Input
                  id="razaoSocial"
                  placeholder="Ex: Comercial ABC Ltda"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Informações de Localidade (preenchimento automático) */}
            <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="space-y-1">
                <Label htmlFor="cep" className="text-[11px] text-zinc-500">CEP</Label>
                <Input id="cep" value={cep} readOnly className="h-8 text-xs bg-zinc-50 dark:bg-zinc-800/50" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cidade" className="text-[11px] text-zinc-500">Cidade</Label>
                <Input id="cidade" value={cidade} readOnly className="h-8 text-xs bg-zinc-50 dark:bg-zinc-800/50" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="estado" className="text-[11px] text-zinc-500">UF</Label>
                <Input id="estado" value={estado} readOnly className="h-8 text-xs bg-zinc-50 dark:bg-zinc-800/50" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar Empresa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
