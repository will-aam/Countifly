// app/(main)/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
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

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useUserModules();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    currentValue: boolean
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

      // Atualizar estado local
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                moduloImportacao: data.user.moduloImportacao,
                moduloLivre: data.user.moduloLivre,
                moduloSala: data.user.moduloSala,
              }
            : user
        )
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

      // Atualizar estado local
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? { ...user, ativo: data.user.ativo }
            : user
        )
      );
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      alert(err.message || "Erro ao atualizar status");
    } finally {
      setUpdatingUserId(null);
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
    return null; // Será redirecionado
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        </div>
        <p className="text-muted-foreground">
          Controle as permissões de acesso aos módulos do sistema para cada usuário.
        </p>
      </div>

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

      {/* Lista de Usuários */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="space-y-4">
          {users.map((user) => {
            const isUpdating = updatingUserId === user.id;
            const userName = user.displayName || user.email;

            return (
              <Card key={user.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Informações do Usuário */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{userName}</h3>
                      {!user.ativo && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          Inativo
                        </span>
                      )}
                    </div>
                    {user.displayName && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastrado em: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  {/* Controles */}
                  <div className="flex flex-col gap-4 min-w-[280px]">
                    {/* Botão Ativar/Desativar */}
                    <Button
                      variant={user.ativo ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleStatusToggle(user.id, user.ativo)}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {user.ativo ? "Desativar Conta" : "Ativar Conta"}
                    </Button>

                    {/* Módulos */}
                    <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Módulos Habilitados
                      </p>

                      {/* Contagem por Importação */}
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`importacao-${user.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          Contagem por Importação
                        </Label>
                        <Switch
                          id={`importacao-${user.id}`}
                          checked={user.moduloImportacao}
                          onCheckedChange={() =>
                            handleModuleToggle(user.id, "modulo_importacao", user.moduloImportacao)
                          }
                          disabled={isUpdating}
                        />
                      </div>

                      {/* Contagem Livre */}
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`livre-${user.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          Contagem Livre
                        </Label>
                        <Switch
                          id={`livre-${user.id}`}
                          checked={user.moduloLivre}
                          onCheckedChange={() =>
                            handleModuleToggle(user.id, "modulo_livre", user.moduloLivre)
                          }
                          disabled={isUpdating}
                        />
                      </div>

                      {/* Gerenciar Sala */}
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`sala-${user.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          Gerenciar Sala
                        </Label>
                        <Switch
                          id={`sala-${user.id}`}
                          checked={user.moduloSala}
                          onCheckedChange={() =>
                            handleModuleToggle(user.id, "modulo_sala", user.moduloSala)
                          }
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
