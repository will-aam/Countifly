// app/(private)/settings-user/page.tsx
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import {
  ProfileInfoSection,
  SecurityPasswordSection,
} from "@/components/settings-user/profile-tab";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";
import { DashboardPreferencesSettings } from "@/components/settings-user/dashboard-preferences-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      display_name: true,
      email: true,
      preferred_mode: true,
      fixar_planejador: true,
      tipo: true,
      modulo_importacao: true,
      modulo_livre: true,
      modulo_sala: true,
      modulo_modular: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-300">
      <header className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil, segurança e preferências do aplicativo.
        </p>
      </header>

      <div className="divide-y divide-border/60">
        <ProfileInfoSection
          initialDisplayName={user.display_name ?? ""}
          initialEmail={user.email}
        />

        <SecurityPasswordSection />

        <PreferredModeSettings
          initialPreferredMode={user.preferred_mode}
          isAdmin={user.tipo === "ADMIN"}
          availableModules={{
            importacao: user.modulo_importacao,
            livre: user.modulo_livre,
            sala: user.modulo_sala,
            modular: user.modulo_modular,
          }}
        />

        <DashboardPreferencesSettings
          initialFixarPlanejador={user.fixar_planejador ?? true}
        />
      </div>
    </div>
  );
}
