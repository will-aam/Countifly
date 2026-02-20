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
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

        const activeCompanies = data.companies.filter((c: Company) => c.ativo);
        setCompanies(activeCompanies);

        const savedCompanyId = localStorage.getItem("selectedCompanyId");
        if (savedCompanyId) {
          const exists = activeCompanies.find(
            (c: Company) => c.id === parseInt(savedCompanyId),
          );
          if (exists) {
            setSelectedCompanyId(savedCompanyId);
          } else {
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

  // Lógica de seleção em bloco
  const handleSelectCompany = (id: string | null, companyName?: string) => {
    if (id === selectedCompanyId) return;

    if (id) {
      setSelectedCompanyId(id);
      localStorage.setItem("selectedCompanyId", id);
      toast({
        title: "Empresa vinculada",
        description: `Contagem associada à ${companyName}.`,
      });
    } else {
      setSelectedCompanyId(null);
      localStorage.removeItem("selectedCompanyId");
      toast({
        title: "Vínculo removido",
        description: "A contagem não está mais vinculada a nenhuma empresa.",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-none shadow-none bg-transparent">
        {" "}
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl mt-0.5">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Vínculo de Empresa</CardTitle>

                {/* Ícone de Dica com Popover (Perfeito para Mobile via Clique) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full p-0.5">
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 text-sm shadow-xl border-primary/20"
                    side="top"
                    align="start"
                  >
                    <strong>Dica:</strong> Vincular empresas facilita filtrar e
                    comparar contagens do histórico de relatórios.
                  </PopoverContent>
                </Popover>
              </div>

              <CardDescription className="text-sm mt-1">
                Selecione abaixo a qual empresa esta contagem pertence para
                organizar seus relatórios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="p-6 rounded-xl border-2 border-dashed bg-muted/20 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Você ainda não possui empresas cadastradas no sistema.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/settings-user?tab=companies")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Cadastrar Nova Empresa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Bloco: Nenhuma Empresa */}
              <div
                onClick={() => handleSelectCompany(null)}
                className={cn(
                  "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer group",
                  // Animação CSS do Uiverse (Card scale)
                  "transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-90",
                  !selectedCompanyId
                    ? "border-muted-foreground/40 bg-muted/10 shadow-sm"
                    : "border-border border-dashed hover:border-muted-foreground/40 hover:bg-muted/5",
                )}
              >
                {/* <div
                  className={cn(
                    "p-2 rounded-lg bg-background border border-border shadow-sm",
                    // Animação CSS do Uiverse (Icon scale)
                    "transition-transform duration-300 ease-out group-hover:scale-110",
                  )}
                >
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </div> */}

                {/* Animação CSS do Uiverse (Content scale) */}
                <div className="flex-1 pt-0.5 transition-transform duration-300 ease-out group-hover:scale-[0.98]">
                  <h4 className="font-semibold text-sm text-foreground">
                    Sem vínculo
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contagem avulsa, sem registro corporativo.
                  </p>
                </div>

                {!selectedCompanyId && (
                  <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-muted-foreground animate-in zoom-in duration-200" />
                )}
              </div>

              {/* Blocos: Empresas Cadastradas */}
              {companies.map((company) => {
                const isSelected = selectedCompanyId === company.id.toString();

                return (
                  <div
                    key={company.id}
                    onClick={() =>
                      handleSelectCompany(
                        company.id.toString(),
                        company.nomeFantasia,
                      )
                    }
                    className={cn(
                      "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer group overflow-hidden",
                      // Animação CSS do Uiverse (Card scale)
                      "transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-90",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-primary/[0.02]",
                    )}
                  >
                    {/* <div
                      className={cn(
                        "p-2 rounded-lg border shadow-sm",
                        // Animação CSS do Uiverse (Icon scale)
                        "transition-transform duration-300 ease-out group-hover:scale-110",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border",
                      )}
                    >
                      <Building2 className="h-5 w-5" />
                    </div> */}

                    {/* Animação CSS do Uiverse (Content scale) */}
                    <div className="flex-1 pr-6 pt-0.5 transition-transform duration-300 ease-out group-hover:scale-[0.98]">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                        {company.nomeFantasia}
                      </h4>
                      {company.cnpj ? (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {company.cnpj}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Sem CNPJ
                        </p>
                      )}
                      {company.razaoSocial && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">
                          {company.razaoSocial}
                        </p>
                      )}
                    </div>

                    {/* Checkmark de seleção */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}

                    {/* Borda extra de feedback ao selecionar */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-primary/20 rounded-xl pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* O alerta antigo do rodapé foi deletado! */}
    </div>
  );
}
