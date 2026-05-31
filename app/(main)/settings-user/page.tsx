// app/(main)/settings-user/page.tsx
import { getAuthPayload } from "@/lib/auth";
import { redirect } from "next/navigation";

import { ProfileTab } from "@/components/settings-user/profile-tab";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // 1. Pega o ID do usuário logado direto no servidor para garantir proteção da rota
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login");
  }

  // Como os componentes filhos (ProfileTab e PreferredModeSettings) fazem
  // o próprio fetch de dados no lado do cliente, nós não precisamos
  // buscar os dados no Prisma aqui e nem passar como props!

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 pb-24 sm:pb-8 max-w-4xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Configurações da Conta
        </h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil, credenciais e preferências de contagem.
        </p>
      </div>

      <div className="space-y-10">
        {/* SEÇÃO: PERFIL E DADOS DA CONTA */}
        <section>
          <div className="mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Perfil da Conta
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Atualize suas informações pessoais e credenciais de acesso.
            </p>
          </div>
          {/* Removido o user={user} daqui */}
          <ProfileTab />
        </section>

        {/* SEÇÃO: PREFERÊNCIAS */}
        <section>
          <PreferredModeSettings />
        </section>
      </div>
    </div>
  );
}
