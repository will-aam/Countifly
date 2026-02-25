// components/settings-user/settings-tabs.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Home } from "lucide-react";

import { ProfileTab } from "@/components/settings-user/profile-tab";
import { CompaniesTab } from "@/components/settings-user/companies-tab";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

// Tipagem das props que vêm do Servidor
interface SettingsTabsProps {
  initialTab: string;
  user: any;
  initialCompanies: any[];
  hasEmpresaAccess: boolean;
}

export function SettingsTabs({
  initialTab,
  user,
  initialCompanies,
  hasEmpresaAccess,
}: SettingsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/settings-user?tab=${value}`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="space-y-6"
    >
      <div className="hidden sm:block">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </TabsTrigger>

          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Preferências</span>
          </TabsTrigger>

          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Empresas</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="mt-0">
        {/* Futuramente você pode passar initialUser={user} aqui */}
        <ProfileTab />
      </TabsContent>

      <TabsContent value="preferences" className="mt-0">
        {/* Futuramente você pode passar initialUser={user} aqui */}
        <PreferredModeSettings />
      </TabsContent>

      <TabsContent value="companies" className="mt-0">
        {/* Passando os dados prontos para a aba de Empresas! */}
        <CompaniesTab
          initialCompanies={initialCompanies}
          hasEmpresaAccess={hasEmpresaAccess}
        />
      </TabsContent>
    </Tabs>
  );
}
