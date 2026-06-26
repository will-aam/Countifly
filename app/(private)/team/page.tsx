// app/(main)/team/page.tsx
/**
 * Página Principal do Time (Gestor).
 * Renderizada no Servidor (RSC) para segurança e performance.
 */
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamManagerView } from "@/components/inventory/team/TeamManagerView";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  // 1. Verifica se está autenticado
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login?from=/team");
  }

  // 2. Busca o usuário no banco para verificar as permissões
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      tipo: true,
      modulo_sala: true, // Aqui olhamos especificamente para o módulo de equipe (sala)
      ativo: true,
    },
  });

  // Se o usuário não existir ou estiver desativado, manda pro login
  if (!user || !user.ativo) {
    redirect("/login");
  }

  // 3. A Trava de Segurança Mestra
  const hasAccess = user.tipo === "ADMIN" || user.modulo_sala;

  if (!hasAccess) {
    // TENTOU BURLAR A URL? Redireciona pro dashboard imediatamente!
    redirect("/");
  }

  // 4. Se passou na segurança, entrega a página limpa e rápida
  return <TeamManagerView userId={userId} />;
}
