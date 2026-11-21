import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MixedInventoryClient } from "@/components/inventory/Mixed/MixedInventoryClient";

export const dynamic = "force-dynamic";

export default async function MixedInventoryPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;

  // 1. Autenticação do Usuário
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login?from=/mixed-inventory");
  }

  // 2. Busca o usuário ativo no banco
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      tipo: true,
      modulo_modular: true,
      ativo: true,
    },
  });

  if (!user || !user.ativo) {
    redirect("/login");
  }

  // 3. Trava de Segurança Mestra
  const hasAccess = user.tipo === "ADMIN" || user.modulo_modular;
  if (!hasAccess) {
    redirect("/");
  }

  const initialTab =
    (searchParams.tab as "scan" | "import" | "export" | "config") || "scan";

  return <MixedInventoryClient userId={userId} initialTab={initialTab} />;
}
