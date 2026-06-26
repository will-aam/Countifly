// app/(main)/layout.tsx
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/shared/navigation/Navigation";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

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

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <Navigation />

      {/* 👇 AJUSTE APLICADO AQUI */}
      {/* Trocamos max-w-7xl (1280px) por max-w-[1600px]. 
          Isso vai dar o respiro exato que os 5 cards precisam no Desktop sem perder o alinhamento. */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-24 sm:pb-8">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
