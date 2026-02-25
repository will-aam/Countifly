// app/(main)/admin/users/admin-users-client.tsx
"use client";

import { useState } from "react";
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
import { DataTable } from "./data-table";
import { createColumns, User } from "./columns";

type FilterStatus = "all" | "active" | "inactive";

interface AdminUsersClientProps {
  initialUsers: User[];
}

export function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Filtros mobile
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const handleModuleToggle = async (
    userId: number,
    moduleName:
      | "modulo_importacao"
      | "modulo_livre"
      | "modulo_sala"
      | "modulo_empresa",
    currentValue: boolean,
  ) => {
    try {
      setUpdatingUserId(userId);
      const res = await fetch(`/api/admin/users/${userId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [moduleName]: !currentValue }),
      });

      if (!res.ok) throw new Error("Falha ao atualizar módulo");
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Erro ao atualizar módulo");

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                moduloImportacao: data.user.moduloImportacao,
                moduloLivre: data.user.moduloLivre,
                moduloSala: data.user.moduloSala,
                moduloEmpresa: data.user.moduloEmpresa,
              }
            : user,
        ),
      );
    } catch (err: any) {
      console.error(err);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !currentStatus }),
      });

      if (!res.ok) throw new Error("Falha ao atualizar status");
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Erro ao atualizar status");

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, ativo: data.user.ativo } : user,
        ),
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao atualizar status");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filtrar usuários no mobile
  const filteredUsersMobile = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl animate-in fade-in duration-300">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-md bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Gerenciar Usuários
          </h2>
        </div>
      </div>

      {/* MOBILE: Filtros + Cards */}
      <div className="block lg:hidden space-y-4">
        <Card className="p-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
          <div className="mt-3 text-xs text-muted-foreground">
            Exibindo {filteredUsersMobile.length} de {users.length} usuários
          </div>
        </Card>

        {filteredUsersMobile.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsersMobile.map((user) => {
              const isUpdating = updatingUserId === user.id;
              const isExpanded = expandedUserId === user.id;
              const userName = user.displayName || user.email;

              return (
                <Card key={user.id} className="overflow-hidden">
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

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-4">
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

                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                          Módulos Habilitados
                        </p>
                        <div className="space-y-3">
                          {[
                            {
                              id: "importacao",
                              label: "Importação",
                              key: "moduloImportacao",
                              patch: "modulo_importacao",
                            },
                            {
                              id: "livre",
                              label: "Contagem Livre",
                              key: "moduloLivre",
                              patch: "modulo_livre",
                            },
                            {
                              id: "sala",
                              label: "Gerenciar Sala",
                              key: "moduloSala",
                              patch: "modulo_sala",
                            },
                            {
                              id: "empresa",
                              label: "Empresas",
                              key: "moduloEmpresa",
                              patch: "modulo_empresa",
                            },
                          ].map((mod) => (
                            <div
                              key={mod.id}
                              className="flex items-center justify-between"
                            >
                              <Label
                                htmlFor={`mobile-${mod.id}-${user.id}`}
                                className="text-sm"
                              >
                                {mod.label}
                              </Label>
                              <Switch
                                id={`mobile-${mod.id}-${user.id}`}
                                checked={user[mod.key as keyof User] as boolean}
                                onCheckedChange={() =>
                                  handleModuleToggle(
                                    user.id,
                                    mod.patch as any,
                                    user[mod.key as keyof User] as boolean,
                                  )
                                }
                                disabled={isUpdating || !user.ativo}
                              />
                            </div>
                          ))}
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
