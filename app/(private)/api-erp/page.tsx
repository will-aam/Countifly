import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErpPageClient } from "@/components/inventory/api-erp/ApiErpPageClient";

export const dynamic = "force-dynamic";

export default async function ApiErpPage() {
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login?from=/api-erp");
  }

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      tipo: true,
      modulo_api: true,
      ativo: true,
    },
  });

  if (!user || !user.ativo) {
    redirect("/login");
  }

  const hasAccess = user.tipo === "ADMIN" || user.modulo_api;
  if (!hasAccess) {
    redirect("/");
  }

  return <ApiErpPageClient />;
}
