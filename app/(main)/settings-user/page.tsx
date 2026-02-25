// app/(main)/settings-user/page.tsx
import { SettingsTabs } from "@/components/settings-user/settings-tabs";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const initialTab = searchParams.tab || "profile";

  // 1. Pega o ID do usuário logado direto no servidor
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login");
  }

  // 2. Busca os dados do usuário no Prisma
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      display_name: true,
      preferred_mode: true,
      modulo_empresa: true,
      tipo: true,
    },
  });

  if (!user) return null;

  // 3. Verifica o acesso e busca as empresas SE ele tiver permissão
  const hasEmpresaAccess = user.tipo === "ADMIN" || user.modulo_empresa;

  // Usamos um ternário para que o TypeScript infira o tipo exato vindo do Prisma!
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

  // 4. Mapeia as empresas para o formato que o Frontend espera (camelCase)
  const formattedCompanies = companies.map((c) => ({
    id: c.id,
    nomeFantasia: c.nome_fantasia,
    razaoSocial: c.razao_social,
    cnpj: c.cnpj,
    ativo: c.ativo,
    createdAt: c.created_at.toISOString(),
  }));

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 pb-24 sm:pb-8 max-w-6xl animate-in fade-in duration-300">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências, perfil e dados cadastrais
        </p>
      </div>

      {/* Passamos todos os dados PRONTOS para o componente interativo */}
      <SettingsTabs
        initialTab={initialTab}
        user={user}
        initialCompanies={formattedCompanies}
        hasEmpresaAccess={hasEmpresaAccess}
      />
    </div>
  );
}
