// app/(main)/layout.tsx
import { redirect } from "next/navigation";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/shared/navigation";
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

  // Não precisamos mais ler a URL pelo hook usePathname aqui porque a estilização
  // baseada em rota já pode ser feita via props, mas como é um layout global,
  // vamos usar a mesma estrutura simples de container.

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* ✅ ERRO CORRIGIDO: O Navigation não recebe mais props! 
        Ele é 100% autônomo agora.
      */}
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-24 sm:pb-8">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
