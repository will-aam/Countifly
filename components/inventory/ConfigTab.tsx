// components/inventory/ConfigTab.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
}

interface ConfigTabProps {
  userId: number | null;
}

export function ConfigTab({ userId }: ConfigTabProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar empresas
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/companies");
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Erro ao carregar empresas");
        }

        // Filtrar apenas empresas ativas
        const activeCompanies = data.companies.filter((c: Company) => c.ativo);
        setCompanies(activeCompanies);

        // Carregar empresa salva do localStorage
        const savedCompanyId = localStorage.getItem("selectedCompanyId");
        if (savedCompanyId) {
          // Verificar se a empresa ainda existe e está ativa
          const exists = activeCompanies.find(
            (c: Company) => c.id === parseInt(savedCompanyId),
          );
          if (exists) {
            setSelectedCompanyId(savedCompanyId);
          } else {
            // Limpar se não existir mais
            localStorage.removeItem("selectedCompanyId");
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar empresas:", err);
        setError(err.message || "Erro ao carregar empresas");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadCompanies();
    }
  }, [userId]);

  // Salvar empresa selecionada
  const handleCompanyChange = (value: string) => {
    if (value === "none") {
      setSelectedCompanyId(null);
      localStorage.removeItem("selectedCompanyId");
    } else {
      setSelectedCompanyId(value);
      localStorage.setItem("selectedCompanyId", value);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card: Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 mt-1">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Empresa / Cliente</CardTitle>
              <CardDescription>
                Selecione a empresa relacionada a esta contagem para organizar
                seus relatórios
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company-select">Empresa</Label>
            <Select
              value={selectedCompanyId || "none"}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger id="company-select">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Nenhuma empresa</span>
                </SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {company.nomeFantasia}
                      </span>
                      {company.cnpj && (
                        <span className="text-xs text-muted-foreground">
                          CNPJ: {company.cnpj}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mensagem de ajuda */}
            {companies.length === 0 ? (
              <div className="mt-4 p-4 rounded-lg border border-dashed bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Você ainda não cadastrou nenhuma empresa.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/settings-user?tab=companies")}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Cadastrar Empresa
                </Button>
              </div>
            ) : selectedCompanyId ? (
              <p className="text-xs text-muted-foreground">
                Esta contagem será vinculada à empresa selecionada
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Você pode deixar sem empresa se preferir
              </p>
            )}
          </div>

          {/* Informações da empresa selecionada */}
          {selectedCompanyId && (
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              {(() => {
                const selected = companies.find(
                  (c) => c.id === parseInt(selectedCompanyId),
                );
                if (!selected) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">
                        {selected.nomeFantasia}
                      </span>
                    </div>
                    {selected.razaoSocial && (
                      <p className="text-xs text-muted-foreground">
                        Razão Social: {selected.razaoSocial}
                      </p>
                    )}
                    {selected.cnpj && (
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {selected.cnpj}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dica */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Dica:</strong> Vincular empresas facilita filtrar e comparar
          contagens por cliente no histórico de relatórios.
        </AlertDescription>
      </Alert>
    </div>
  );
}
