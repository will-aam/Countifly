// app/(main)/settings-user/components/companies-tab.tsx
"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
  createdAt: string;
}

export function CompaniesTab() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulário
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      const data = await res.json();

      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
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
        loadCompanies();
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

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: currentStatus ? "Empresa desativada" : "Empresa ativada",
        });
        loadCompanies();
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Cadastre empresas para organizar suas contagens por cliente
              </CardDescription>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? "Editar Empresa" : "Nova Empresa"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da empresa que você atende
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Nome Fantasia */}
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

                {/* Razão Social */}
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">Razão Social (Opcional)</Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Ex: Central Comércio de Alimentos Ltda"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    maxLength={200}
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    maxLength={18}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas números ou com formatação
                  </p>
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
        </div>
      </CardHeader>

      <CardContent>
        {companies.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma empresa cadastrada
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece cadastrando sua primeira empresa para organizar suas
              contagens
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Empresa
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <Card key={company.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">
                          {company.nomeFantasia}
                        </h4>
                        {company.ativo ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </div>

                      {company.razaoSocial && (
                        <p className="text-sm text-muted-foreground truncate">
                          {company.razaoSocial}
                        </p>
                      )}

                      {company.cnpj && (
                        <p className="text-xs text-muted-foreground mt-1">
                          CNPJ: {company.cnpj}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        Cadastrado em:{" "}
                        {new Date(company.createdAt).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(company)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleToggleStatus(company.id, company.ativo)
                        }
                      >
                        {company.ativo ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
