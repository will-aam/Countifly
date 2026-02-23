// app/(main)/settings-user/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Home } from "lucide-react";

import { ProfileTab } from "@/components/settings-user/profile-tab";
import { CompaniesTab } from "@/components/settings-user/companies-tab";
import { PreferredModeSettings } from "@/components/settings-user/preferred-mode-settings";

// Componente isolado para poder usar o useSearchParams com segurança no Next.js
function SettingsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");

  // O pulo do gato: Lê a URL ao carregar e muda a aba se o parâmetro existir
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-6xl animate-in fade-in duration-300">
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

        <div className="hidden sm:block">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Perfil</span>
            </TabsTrigger>

            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Preferências</span>
            </TabsTrigger>

            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Empresas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conteúdo */}
        <TabsContent value="profile" className="mt-0">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <PreferredModeSettings />
        </TabsContent>

        <TabsContent value="companies" className="mt-0">
          <CompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// O Suspense é exigido pelo Next.js App Router ao usar useSearchParams no Client
export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Carregando configurações...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
