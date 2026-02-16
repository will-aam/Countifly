// app/(main)/settings-user/page.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Home } from "lucide-react";

// Importar componentes
import { ProfileTab } from "@/components/settings-user/profile-tab";
import { CompaniesTab } from "@/components/settings-user/companies-tab";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-6xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências, perfil e dados cadastrais
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Lista de Abas */}
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2 py-3">
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </TabsTrigger>

          <TabsTrigger
            value="preferences"
            className="flex items-center gap-2 py-3"
          >
            <Home className="h-4 w-4" />
            <span>Preferências</span>
          </TabsTrigger>

          <TabsTrigger
            value="companies"
            className="flex items-center gap-2 py-3"
          >
            <Building2 className="h-4 w-4" />
            <span>Empresas</span>
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo: Perfil */}
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        {/* Conteúdo: Preferências */}
        <TabsContent value="preferences">
          <PreferredModeSettings />
        </TabsContent>

        {/* Conteúdo: Empresas */}
        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
