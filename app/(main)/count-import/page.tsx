// app/(main)/count-import/page.tsx
// SEM "use client" - Renderização Segura no Servidor

import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CountImportPageClient } from "@/components/inventory/Import/CountImportPageClient";

export const dynamic = "force-dynamic";

export default async function CountImportPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  // 1. Verifica se está autenticado
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login?from=/count-import");
  }

  // 2. Busca o usuário no banco para verificar as permissões
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      tipo: true,
      modulo_importacao: true, // Certifique-se de que é esse o nome da coluna no seu Prisma
      ativo: true,
    },
  });

  // Se o usuário não existir ou estiver desativado, manda pro login
  if (!user || !user.ativo) {
    redirect("/login");
  }

  // 3. A Trava de Segurança Mestra
  const hasAccess = user.tipo === "ADMIN" || user.modulo_importacao;

  if (!hasAccess) {
    // TENTOU BURLAR A URL? Redireciona pro dashboard!
    redirect("/");
  }

  // 4. Se passou, entrega a página limpa e rápida
  const initialTab =
    (searchParams.tab as "scan" | "import" | "export" | "config") || "scan";

  return <CountImportPageClient userId={userId} initialTab={initialTab} />;
}
