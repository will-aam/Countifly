"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Zap } from "lucide-react";
import {
  AUDIT_PROFILES,
  configForAuditProfile,
  type AuditConfig,
  type AuditProfileId,
} from "@/lib/audit";

export type { AuditConfig } from "@/lib/audit";

interface AuditSettingsTabProps {
  config: AuditConfig;
  setConfig: (config: AuditConfig) => void;
  userId: number | null;
  profileLocked?: boolean;
}

export function AuditSettingsTab({
  config,
  setConfig,
  profileLocked = false,
}: AuditSettingsTabProps) {
  const updateProfile = (profile: AuditProfileId) => {
    setConfig(configForAuditProfile(profile, config));
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Objetivo do levantamento</CardTitle>
          <CardDescription>
            Escolha quais informações a equipe deve coletar nesta contagem.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AUDIT_PROFILES.map((profile) => {
            const selected = config.profile === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={selected}
                disabled={profileLocked}
                onClick={() => updateProfile(profile.id)}
                className={`min-h-24 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/60"
                }`}
              >
                <span className="block font-medium">{profile.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {profile.description}
                </span>
              </button>
            );
          })}
          {profileLocked && (
            <p className="text-sm text-amber-700 sm:col-span-2 dark:text-amber-300">
              O perfil fica fixo depois do primeiro item. Inicie uma nova contagem para escolher outro.
            </p>
          )}
        </CardContent>
      </Card>

      {config.collectQuantity && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Formato da quantidade</CardTitle>
            <CardDescription>
              Escolha como a equipe vai separar os números.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              ["total", "Quantidade total"],
              ["split", "Loja e estoque"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={config.quantityLayout === value}
                disabled={profileLocked}
                onClick={() => setConfig({ ...config, quantityLayout: value })}
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                  config.quantityLayout === value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/60"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <Switch
                id="direct-scan"
                checked={config.directScan}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, directScan: checked })
                }
              />
              <Label htmlFor="direct-scan">Somar 1 automaticamente ao bipar</Label>
              {config.directScan && (
                <Badge variant="secondary" className="ml-auto gap-1">
                  <Zap className="h-3 w-3" /> Ativada
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Base global</CardTitle>
          <CardDescription>
            As bipagens consultam o catálogo global e registram como temporário
            o código que não for encontrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="offline-mode"
              checked={config.offlineMode}
              onCheckedChange={(checked) =>
                setConfig({ ...config, offlineMode: checked })
              }
            />
            <Label htmlFor="offline-mode">Ativar Base Offline</Label>
          </div>
          {config.offlineMode && (
            <Badge variant="secondary" className="mt-3 gap-1">
              <WifiOff className="h-3 w-3" /> Pronto para uso sem internet
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
