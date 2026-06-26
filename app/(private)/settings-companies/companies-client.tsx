// app/(main)/settings-companies/companies-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Company {
  id: number;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ativo: boolean;
  createdAt: string;
}

interface Props {
  initialCompanies: Company[];
  hasEmpresaAccess: boolean;
}

// Máscara simples para CNPJ
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
  hasEmpresaAccess,
}: Props) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  // Campos do Formulário
  const [cnpj, setCnpj] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");

  // Campos extras que a API Brasil traz (Adicione no seu Schema do Prisma depois se quiser salvar)
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

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

    // Se o CNPJ tiver 14 dígitos, dispara a busca automaticamente
    if (rawCnpj.length === 14 && !editingCompany) {
      setSearchingCnpj(true);
      try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`,
        );
        if (!response.ok) throw new Error("CNPJ não encontrado");

        const data = await response.json();

        // Preenche os dados
        setRazaoSocial(data.razao_social || "");
        // Algumas empresas não tem nome fantasia, usamos a razão social como fallback
        setNomeFantasia(data.nome_fantasia || data.razao_social || "");
        setCep(data.cep || "");
        setCidade(data.municipio || "");
        setEstado(data.uf || "");

        toast({
          title: "Dados encontrados!",
          description: "Formulário preenchido automaticamente.",
        });
      } catch (error) {
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
          // Nota: Se você for salvar cep, cidade e estado no banco, inclua eles aqui
          // e atualize seu backend (api/companies) e o arquivo schema.prisma
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
      if (res.ok) refreshCompanies();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  return (
    <div
      className={cn("space-y-6 transition-opacity", loading && "opacity-60")}
    >
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="p-8 rounded-xl border-2 border-dashed bg-muted/20 text-center space-y-3">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">
            Nenhuma empresa cadastrada
          </p>
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP (TABELA) */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className={!company.ativo ? "opacity-60 bg-muted/30" : ""}
                  >
                    <TableCell>
                      {company.ativo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {company.cnpj || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.nomeFantasia}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {company.razaoSocial || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          className={
                            company.ativo
                              ? "text-destructive"
                              : "text-emerald-600"
                          }
                          onClick={() =>
                            handleToggleStatus(company.id, company.ativo)
                          }
                        >
                          {company.ativo ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* VISÃO MOBILE (CARDS) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleOpenDialog(company)}
                className={cn(
                  "relative flex flex-col p-4 rounded-xl border-2 cursor-pointer group",
                  company.ativo
                    ? "border-border bg-card"
                    : "border-border bg-muted/50 opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-semibold text-sm line-clamp-1">
                    {company.nomeFantasia}
                  </h4>
                  {company.ativo ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-700">
                      Inativa
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono">
                    {company.cnpj || "Sem CNPJ"}
                  </p>
                  {company.razaoSocial && (
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                      {company.razaoSocial}
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(company);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant={company.ativo ? "destructive" : "default"}
                    size="sm"
                    className={
                      !company.ativo
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(company.id, company.ativo);
                    }}
                  >
                    {company.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* DIALOG DE CADASTRO/EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editar Empresa" : "Cadastrar Empresa"}
            </DialogTitle>
            <DialogDescription>
              {!editingCompany &&
                "Digite o CNPJ para preencher os dados automaticamente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2 relative">
              <Label htmlFor="cnpj">CNPJ</Label>
              <div className="relative">
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  maxLength={18}
                  className="pr-10"
                />
                {searchingCnpj ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razaoSocial">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="razaoSocial"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">
                  Nome Fantasia <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nomeFantasia"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                />
              </div>
            </div>

            {/* Informações Extras Buscadas da API Brasil */}
            <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={cep} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={estado}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0">
              * Localidade puxada automaticamente da Receita Federal.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
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
