// app/(main)/settings-user/page.tsx
"use client";

import { Lock } from "lucide-react";
import { PasswordUserSettings } from "@/components/settings-user/passaword-user";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

export default function SettingsUserPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex justify-center px-4 py-4 sm:py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Cabeçalho da página */}
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Configurações
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ajustes da sua conta. No momento, você pode alterar sua senha de
            acesso.
          </p>
        </div>
        {/* Seção: Página inicial preferida */}
        <PreferredModeSettings />
        {/* Seção: Alterar senha */}
        <PasswordUserSettings />
      </div>
    </div>
  );
}
