// components/settings-user/companies-tab.tsx
"use client";

import { useState } from "react"; // Removido o useEffect
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Building2,
  Plus,
  Loader2,
  Pencil,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Info,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
  createdAt: string;
}

interface CompaniesTabProps {
  initialCompanies: Company[];
  hasEmpresaAccess: boolean;
}

export function CompaniesTab({
  initialCompanies,
  hasEmpresaAccess,
}: CompaniesTabProps) {
  const router = useRouter();
  const { toast } = useToast();

  // 1. Inicializamos o estado JÁ COM AS EMPRESAS DO SERVIDOR!
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);

  // 2. Loading começa FALSE, pois os dados já chegaram
  const [loading, setLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulário
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");

  // Mantemos essa função para re-buscar APÓS o usuário criar/editar uma empresa
  const refreshCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Erro ao recarregar empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setNomeFantasia(company.nomeFantasia);
      setRazaoSocial(company.razaoSocial || "");
      setCnpj(company.cnpj || "");
    } else {
      setEditingCompany(null);
      setNomeFantasia("");
      setRazaoSocial("");
      setCnpj("");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
    setNomeFantasia("");
    setRazaoSocial("");
    setCnpj("");
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
            ? "Empresa atualizada com sucesso"
            : "Empresa cadastrada com sucesso",
        });
        handleCloseDialog();
        refreshCompanies(); // Busca novamente após salvar
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
    e: React.MouseEvent,
    companyId: number,
    currentStatus: boolean,
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !currentStatus }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: currentStatus ? "Empresa desativada" : "Empresa ativada",
        });
        refreshCompanies(); // Busca novamente após alterar status
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!hasEmpresaAccess) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
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
              Organize suas contagens de inventário vinculando-as a diferentes
              empresas, clientes ou filiais. Este recurso premium não está ativo
              no seu plano.
            </p>
            <Button
              variant="default"
              onClick={() => {
                toast({
                  title: "Interesse Registrado",
                  description:
                    "Nossa equipe entrará em contato para liberar este módulo.",
                });
              }}
            >
              <Lock className="mr-2 h-4 w-4" />
              Solicitar Desbloqueio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Opacidade caso esteja recarregando a lista pós-mutação */}
      <Card
        className={cn(
          "border-none shadow-none bg-transparent transition-opacity",
          loading && "opacity-50",
        )}
      >
        <CardHeader className="px-0 pt-0 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Gestão de Empresas</CardTitle>
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
                      <strong>Dica:</strong> As empresas que você cadastrar aqui
                      ficarão disponíveis para vínculo em todas as suas
                      contagens.
                    </PopoverContent>
                  </Popover>
                </div>
                <CardDescription className="text-sm mt-1">
                  Cadastre e edite as empresas para organizar suas contagens.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? "Editar Empresa" : "Nova Empresa"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados corporativos abaixo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">
                    Nome Fantasia <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nomeFantasia"
                    placeholder="Ex: Supermercado Central"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">Razão Social (Opcional)</Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Ex: Central Comércio Ltda"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    maxLength={18}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="px-0">
          {companies.length === 0 ? (
            <div className="p-8 rounded-xl border-2 border-dashed bg-muted/20 text-center space-y-3">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma empresa cadastrada
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Comece cadastrando sua primeira empresa para poder organizar
                suas contagens por cliente ou filial.
              </p>
              <div className="pt-2">
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeira Empresa
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => handleOpenDialog(company)}
                  className={cn(
                    "relative flex flex-col p-5 rounded-xl border-2 cursor-pointer group overflow-hidden",
                    "transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-90",
                    company.ativo
                      ? "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                      : "border-border bg-muted/50 opacity-75",
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 transition-transform duration-300 ease-out group-hover:scale-[0.98]">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                        {company.nomeFantasia}
                      </h4>
                    </div>

                    <div>
                      {company.ativo ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-red-500/10 text-red-700 hover:bg-red-500/20"
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Inativa
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1 transition-transform duration-300 ease-out group-hover:scale-[0.98]">
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

                  <div className="absolute bottom-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(company);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm transition-colors",
                        company.ativo
                          ? "hover:text-destructive hover:bg-destructive/10"
                          : "hover:text-emerald-600 hover:bg-emerald-500/10",
                      )}
                      onClick={(e) =>
                        handleToggleStatus(e, company.id, company.ativo)
                      }
                    >
                      {company.ativo ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
