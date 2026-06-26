// app/(main)/settings-companies/page.tsx
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsCompaniesClient } from "./companies-client";

export const dynamic = "force-dynamic";

export default async function SettingsCompaniesPage() {
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login");
  }

  // Busca os dados do usuário para verificar permissão
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { modulo_empresa: true, tipo: true },
  });

  if (!user) return null;

  const hasEmpresaAccess = user.tipo === "ADMIN" || user.modulo_empresa;

  // Busca as empresas
  const companies = hasEmpresaAccess
    ? await prisma.empresa.findMany({
        where: { usuario_id: userId },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          nome_fantasia: true,
          razao_social: true,
          cnpj: true,
          ativo: true,
          created_at: true,
        },
      })
    : [];

  const formattedCompanies = companies.map((c) => ({
    id: c.id,
    nomeFantasia: c.nome_fantasia,
    razaoSocial: c.razao_social,
    cnpj: c.cnpj,
    ativo: c.ativo,
    createdAt: c.created_at.toISOString(),
  }));

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 pb-24 sm:pb-8 max-w-5xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Gestão de Empresas
        </h1>
        <p className="text-muted-foreground">
          Cadastre e gerencie as empresas, clientes ou filiais para organizar
          suas contagens.
        </p>
      </div>

      <SettingsCompaniesClient
        initialCompanies={formattedCompanies}
        hasEmpresaAccess={hasEmpresaAccess}
      />
    </div>
  );
}
