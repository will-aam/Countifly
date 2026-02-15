"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Shield,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useUserModules } from "@/hooks/useUserModules";

interface User {
  id: number;
  email: string;
  displayName: string | null;
  createdAt: string;
  ativo: boolean;
  moduloImportacao: boolean;
  moduloLivre: boolean;
  moduloSala: boolean;
}

type SortField = "name" | "email" | "createdAt" | "status";
type SortOrder = "asc" | "desc";
type FilterStatus = "all" | "active" | "inactive";

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useUserModules();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros e ordenação
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // Redirecionar se não for admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, authLoading, router]);

  // Carregar lista de usuários
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/users");

        if (!res.ok) {
          throw new Error("Falha ao carregar usuários");
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Erro ao carregar usuários");
        }

        setUsers(data.users);
        setError(null);
      } catch (err: any) {
        console.error("Erro ao carregar usuários:", err);
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, authLoading]);

  // Filtrar e ordenar usuários
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.displayName?.toLowerCase().includes(query),
      );
    }

    // Filtro de status
    if (filterStatus === "active") {
      filtered = filtered.filter((user) => user.ativo);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((user) => !user.ativo);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortField) {
        case "name":
          compareA = (a.displayName || a.email).toLowerCase();
          compareB = (b.displayName || b.email).toLowerCase();
          break;
        case "email":
          compareA = a.email.toLowerCase();
          compareB = b.email.toLowerCase();
          break;
        case "createdAt":
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        case "status":
          compareA = a.ativo ? 1 : 0;
          compareB = b.ativo ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, filterStatus, sortField, sortOrder]);

  const handleModuleToggle = async (
    userId: number,
    moduleName: "modulo_importacao" | "modulo_livre" | "modulo_sala",
    currentValue: boolean,
  ) => {
    try {
      setUpdatingUserId(userId);
      const res = await fetch(`/api/admin/users/${userId}/modules`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [moduleName]: !currentValue,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao atualizar módulo");
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao atualizar módulo");
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                moduloImportacao: data.user.moduloImportacao,
                moduloLivre: data.user.moduloLivre,
                moduloSala: data.user.moduloSala,
              }
            : user,
        ),
      );
    } catch (err: any) {
      console.error("Erro ao atualizar módulo:", err);
      alert(err.message || "Erro ao atualizar módulo");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: boolean) => {
    try {
      setUpdatingUserId(userId);
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo: !currentStatus,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao atualizar status");
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao atualizar status");
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, ativo: data.user.ativo } : user,
        ),
      );
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      alert(err.message || "Erro ao atualizar status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Gerenciar Usuários</h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Controle as permissões de acesso aos módulos do sistema
        </p>
      </div>

      {/* Filtros e Busca */}
      <Card className="p-3 sm:p-4 mb-6">
        {/* MOBILE: Linha única com busca + ícone de filtro */}
        <div className="flex lg:hidden gap-2">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Botão Filtro (abre popover/sheet) */}
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as FilterStatus)}
          >
            <SelectTrigger className="w-[50px] px-2">
              <Filter className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DESKTOP: Layout original com todos os filtros */}
        <div className="hidden lg:flex gap-3">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro Status */}
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as FilterStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordenar */}
          <Select
            value={`${sortField}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split("-") as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Mais recentes</SelectItem>
              <SelectItem value="createdAt-asc">Mais antigos</SelectItem>
              <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
              <SelectItem value="email-asc">Email (A-Z)</SelectItem>
              <SelectItem value="status-desc">Ativos primeiro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contador de resultados */}
        <div className="mt-3 text-xs text-muted-foreground">
          Exibindo {filteredAndSortedUsers.length} de {users.length} usuários
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive font-medium">Erro: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || filterStatus !== "all"
              ? "Nenhum usuário encontrado com os filtros aplicados."
              : "Nenhum usuário cadastrado."}
          </p>
        </div>
      )}

      {/* MOBILE: Cards (visible apenas em telas pequenas) */}
      <div className="block lg:hidden space-y-3">
        {filteredAndSortedUsers.map((user) => {
          const isUpdating = updatingUserId === user.id;
          const isExpanded = expandedUserId === user.id;
          const userName = user.displayName || user.email;

          return (
            <Card key={user.id} className="overflow-hidden">
              {/* Header do Card */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{userName}</h3>
                      {user.ativo ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    {user.displayName && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Conteúdo Expandido */}
              {isExpanded && (
                <div className="border-t bg-muted/20 p-4 space-y-4">
                  {/* Botão Status */}
                  <Button
                    variant={user.ativo ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleStatusToggle(user.id, user.ativo)}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    {isUpdating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {user.ativo ? "Desativar Conta" : "Ativar Conta"}
                  </Button>

                  {/* Módulos */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Módulos Habilitados
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`mobile-importacao-${user.id}`}
                          className="text-sm"
                        >
                          Importação
                        </Label>
                        <Switch
                          id={`mobile-importacao-${user.id}`}
                          checked={user.moduloImportacao}
                          onCheckedChange={() =>
                            handleModuleToggle(
                              user.id,
                              "modulo_importacao",
                              user.moduloImportacao,
                            )
                          }
                          disabled={isUpdating}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`mobile-livre-${user.id}`}
                          className="text-sm"
                        >
                          Contagem Livre
                        </Label>
                        <Switch
                          id={`mobile-livre-${user.id}`}
                          checked={user.moduloLivre}
                          onCheckedChange={() =>
                            handleModuleToggle(
                              user.id,
                              "modulo_livre",
                              user.moduloLivre,
                            )
                          }
                          disabled={isUpdating}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`mobile-sala-${user.id}`}
                          className="text-sm"
                        >
                          Gerenciar Sala
                        </Label>
                        <Switch
                          id={`mobile-sala-${user.id}`}
                          checked={user.moduloSala}
                          onCheckedChange={() =>
                            handleModuleToggle(
                              user.id,
                              "modulo_sala",
                              user.moduloSala,
                            )
                          }
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* DESKTOP: Tabela (visible apenas em telas grandes) */}
      {/* DESKTOP: Tabela (visible apenas em telas grandes) */}
      <div className="hidden lg:block">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th
                    className="text-left p-4 font-semibold text-sm cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </th>
                  <th
                    className="text-left p-4 font-semibold text-sm cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Nome
                  </th>
                  <th
                    className="text-left p-4 font-semibold text-sm cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    Email
                  </th>
                  <th
                    className="text-left p-4 font-semibold text-sm cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort("createdAt")}
                  >
                    Cadastro
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Importação
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Livre
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Sala
                  </th>
                  <th className="text-center p-4 font-semibold text-sm">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user) => {
                  const isUpdating = updatingUserId === user.id;
                  const userName = user.displayName || "—";

                  return (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      {/* Status */}
                      <td className="p-4">
                        {user.ativo ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-emerald-600 font-medium">
                              Ativo
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive font-medium">
                              Inativo
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Nome */}
                      <td className="p-4">
                        <p className="font-medium text-sm">{userName}</p>
                      </td>

                      {/* Email */}
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </td>

                      {/* Módulo Importação */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={user.moduloImportacao}
                            onCheckedChange={() =>
                              handleModuleToggle(
                                user.id,
                                "modulo_importacao",
                                user.moduloImportacao,
                              )
                            }
                            disabled={isUpdating}
                          />
                        </div>
                      </td>

                      {/* Módulo Livre */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={user.moduloLivre}
                            onCheckedChange={() =>
                              handleModuleToggle(
                                user.id,
                                "modulo_livre",
                                user.moduloLivre,
                              )
                            }
                            disabled={isUpdating}
                          />
                        </div>
                      </td>

                      {/* Módulo Sala */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={user.moduloSala}
                            onCheckedChange={() =>
                              handleModuleToggle(
                                user.id,
                                "modulo_sala",
                                user.moduloSala,
                              )
                            }
                            disabled={isUpdating}
                          />
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="p-4">
                        <div className="flex justify-center">
                          <Button
                            variant={user.ativo ? "ghost" : "default"}
                            size="sm"
                            onClick={() =>
                              handleStatusToggle(user.id, user.ativo)
                            }
                            disabled={isUpdating}
                            className={
                              user.ativo
                                ? "hover:bg-destructive/10 hover:text-destructive"
                                : ""
                            }
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.ativo ? (
                              "Desativar"
                            ) : (
                              "Ativar"
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
