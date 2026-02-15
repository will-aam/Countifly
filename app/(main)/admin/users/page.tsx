"use client";

import { useEffect, useState } from "react";
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
import { DataTable } from "./data-table";
import { createColumns, User } from "./columns";
import { Skeleton } from "@/components/ui/skeleton";

type FilterStatus = "all" | "active" | "inactive";

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useUserModules();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros mobile
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
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

  // Filtrar usuários no mobile
  const filteredUsersMobile = users.filter((user) => {
    // Filtro de busca
    const matchesSearch =
      !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filtro de status
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.ativo) ||
      (filterStatus === "inactive" && !user.ativo);

    return matchesSearch && matchesStatus;
  });

  const columns = createColumns({
    onStatusToggle: handleStatusToggle,
    onModuleToggle: handleModuleToggle,
    updatingUserId,
  });

  // Loading state com Skeleton
  if (authLoading || (loading && users.length === 0)) {
    return (
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl">
        {/* Cabeçalho Skeleton */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Filtros Skeleton */}
        <Card className="p-4 mb-6">
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="w-[50px] lg:w-[180px] h-10" />
          </div>
        </Card>

        {/* Conteúdo Skeleton */}
        <Card className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
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
          <div className="p-2 rounded-md bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Gerenciar Usuários
          </h2>
        </div>
        {/* <p className="text-sm sm:text-base text-muted-foreground">
          Controle as permissões de acesso aos módulos do sistema
        </p> */}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive font-medium">Erro: {error}</p>
        </div>
      )}

      {/* MOBILE: Filtros + Cards */}
      <div className="block lg:hidden space-y-4">
        {/* Filtros Mobile */}
        <Card className="p-3">
          <div className="flex gap-2">
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

            {/* Filtro Status */}
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

          {/* Contador Mobile */}
          <div className="mt-3 text-xs text-muted-foreground">
            Exibindo {filteredUsersMobile.length} de {users.length} usuários
          </div>
        </Card>

        {/* Cards Mobile */}
        {filteredUsersMobile.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? "Nenhum usuário encontrado com os filtros aplicados."
                : "Nenhum usuário cadastrado."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsersMobile.map((user) => {
              const isUpdating = updatingUserId === user.id;
              const isExpanded = expandedUserId === user.id;
              const userName = user.displayName || user.email;

              return (
                <Card key={user.id} className="overflow-hidden">
                  {/* Header do Card */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedUserId(isExpanded ? null : user.id)
                    }
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
        )}
      </div>

      {/* DESKTOP: Data Table */}
      <div className="hidden lg:block">
        <DataTable columns={columns} data={users} />
      </div>
    </div>
  );
}
