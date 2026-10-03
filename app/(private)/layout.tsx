// app/(main)/layout.tsx
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shared/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Pega o crachá (Token)
  const payload = await getAuthPayload();
  if (!payload?.userId) {
    redirect("/login");
  }

  // 2. VERIFICAÇÃO DE SEGURANÇA MÁXIMA: Vai no banco em tempo real e checa se está ativo
  const user = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { ativo: true },
  });

  // Se o usuário não existir mais ou tiver sido DESATIVADO pelo Admin:
  if (!user || !user.ativo) {
    // Expulsa ele pra tela de login e manda um aviso na URL
    redirect("/login?error=deactivated");
  }

  return <AppShell>{children}</AppShell>;
}
