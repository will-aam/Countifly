// app/(main)/admin/users/page.tsx
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "./admin-users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // 1. Verifica a Autenticação
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login");
  }

  // 2. Busca o usuário que está tentando acessar para verificar se ele é ADMIN
  const currentUser = await prisma.usuario.findUnique({
    where: { id: Number(userId) },
    select: { tipo: true, ativo: true },
  });

  // Se for bloqueado ou não for admin, volta pro dashboard
  if (!currentUser || !currentUser.ativo || currentUser.tipo !== "ADMIN") {
    redirect("/");
  }

  // 3. O usuário É ADMIN! Vamos buscar a lista inteira.
  // ✅ A MÁGICA ESTÁ AQUI NO "where: { id: { not: Number(userId) } }"
  const allUsersDb = await prisma.usuario.findMany({
    where: {
      id: { not: Number(userId) }, // Exclui da lista o ID de quem está acessando (seu ID 1)
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      ativo: true,
      modulo_importacao: true,
      modulo_livre: true,
      modulo_sala: true,
      modulo_empresa: true,
    },
  });

  // 4. Formata os dados para o formato camelCase esperado pela tabela
  const formattedUsers = allUsersDb.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    createdAt: u.created_at.toISOString(),
    ativo: u.ativo,
    moduloImportacao: u.modulo_importacao,
    moduloLivre: u.modulo_livre,
    moduloSala: u.modulo_sala,
    moduloEmpresa: u.modulo_empresa,
  }));

  // 5. Manda tudo pronto e formatado pro Client Component!
  return <AdminUsersClient initialUsers={formattedUsers} />;
}
