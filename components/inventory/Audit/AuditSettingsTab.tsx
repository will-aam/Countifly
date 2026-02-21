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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  WifiOff,
  DollarSign,
  Building2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
}

export interface AuditConfig {
  offlineMode: boolean;
  collectPrice: boolean;
  companyId?: string | null;
}

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
  userId: number | null;
}

export function AuditSettingsTab({
  config,
  setConfig,
  userId,
}: AuditSettingsTabProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [errorCompanies, setErrorCompanies] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true);
        setErrorCompanies(null);
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (!data.success)
          throw new Error(data.error || "Erro ao carregar empresas");
        setCompanies(data.companies.filter((c: Company) => c.ativo));
      } catch (err: any) {
        setErrorCompanies(err.message || "Erro ao carregar empresas");
      } finally {
        setLoadingCompanies(false);
      }
    };
    if (userId) {
      loadCompanies();
    }
  }, [userId]);

  const handleSelectCompany = (id: string | null) => {
    setConfig({ ...config, companyId: id });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Base de Dados Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="offline-mode"
              checked={config.offlineMode}
              onCheckedChange={() =>
                setConfig({ ...config, offlineMode: !config.offlineMode })
              }
            />
            <Label htmlFor="offline-mode">Ativar Base Offline</Label>
          </div>
          <CardDescription>
            Baixa produtos para o navegador. Permite reconhecer itens sem
            importar CSV.
          </CardDescription>
          {config.offlineMode && (
            <div className="mt-2">
              <Badge variant="secondary" className="gap-1">
                <WifiOff className="h-3 w-3" /> Pronto para uso sem internet
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Auditoria de Valor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="collect-price"
              checked={config.collectPrice}
              onCheckedChange={() =>
                setConfig({ ...config, collectPrice: !config.collectPrice })
              }
            />
            <Label htmlFor="collect-price">Solicitar Preço</Label>
          </div>
          <CardDescription>
            Ao bipar um item, o sistema pedirá o preço unitário (R$) além da
            quantidade.
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Vínculo de Empresa</CardTitle>
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
                Selecione abaixo a qual empresa esta auditoria pertence para
                organizar seus relatórios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCompanies ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : errorCompanies ? (
            <div className="p-6 rounded-xl border-2 border-dashed bg-muted/20 text-center space-y-3">
              <p className="text-sm text-muted-foreground">{errorCompanies}</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-6 rounded-xl border-2 border-dashed bg-muted/20 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Você ainda não possui empresas cadastradas no sistema.
              </p>
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Cadastrar Nova Empresa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div
                onClick={() => handleSelectCompany(null)}
                className={cn(
                  "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer group transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-90",
                  !config.companyId
                    ? "border-muted-foreground/40 bg-muted/10 shadow-sm"
                    : "border-border border-dashed hover:border-muted-foreground/40 hover:bg-muted/5",
                )}
              >
                <div className="flex-1 pt-0.5 transition-transform duration-300 ease-out group-hover:scale-[0.98]">
                  <h4 className="font-semibold text-sm text-foreground">
                    Sem vínculo
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auditoria avulsa, sem registro corporativo.
                  </p>
                </div>
                {!config.companyId && (
                  <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-muted-foreground animate-in zoom-in duration-200" />
                )}
              </div>
              {companies.map((company) => {
                const isSelected = config.companyId === company.id.toString();
                return (
                  <div
                    key={company.id}
                    onClick={() => handleSelectCompany(company.id.toString())}
                    className={cn(
                      "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer group overflow-hidden transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-90",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-primary/[0.02]",
                    )}
                  >
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
                    {isSelected && (
                      <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
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
    </div>
  );
}
