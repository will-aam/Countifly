// app/(main)/layout.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { AuthModal } from "@/components/shared/AuthModal";
import { ParticipantView } from "@/components/inventory/ParticipantView";
import { TeamManagerView } from "@/components/inventory/TeamManagerView";
import { Navigation } from "@/components/shared/navigation";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";
import { useInventory } from "@/hooks/useInventory";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- Estados de Sessão ---
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"manager" | "participant" | null>(
    null
  );

  // Estado Anfitrião
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [managerMode, setManagerMode] = useState<"single" | "team">("single");
  const handleEnterTeamMode = () => {
    setManagerMode("team");
    sessionStorage.setItem("managerMode", "team");
  };
  // Estado Colaborador
  const [sessionData, setSessionData] = useState<any>(null);

  // --- Estados de UI do Anfitrião (Modo Individual) ---
  const [activeTab, setActiveTab] = useState("scan");
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Hook do Inventário (Funciona plenamente apenas para o Anfitrião)
  const inventory = useInventory({ userId: currentUserId });

  // --- Efeito de Inicialização (Restaura Sessão) ---
  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");
    const savedSession = sessionStorage.getItem("currentSession");
    const savedMode = sessionStorage.getItem("managerMode");

    if (savedUserId) {
      setCurrentUserId(parseInt(savedUserId, 10));
      setUserType("manager");
      if (savedMode === "team") setManagerMode("team");
    } else if (savedSession) {
      setSessionData(JSON.parse(savedSession));
      setUserType("participant");
    }

    setIsLoading(false);
  }, []);
  // --- Efeito: aplica o preferredMode após restaurar sessão ---
  useEffect(() => {
    if (isLoading) return;
    if (userType !== "manager") return;

    const forceDashboard = searchParams.get("forceDashboard");
    if (forceDashboard === "1") return;

    const preferredMode = sessionStorage.getItem("preferredMode");
    if (!preferredMode) return;

    // Só aplicamos o redirecionamento automático se o usuário está na home (/)
    // para não atrapalhar navegação manual.
    if (pathname !== "/") return;

    // Define o destino com base no preferredMode
    if (preferredMode === "count_import") {
      // Página preferida é a tela de contagem, mas começando em Conferência
      router.replace("/count-import"); // sem tab => cai em "scan"
    } else if (preferredMode === "count_scan") {
      // Se um dia você quiser diferenciar, pode manter aqui, mas hoje dá no mesmo
      router.replace("/count-import?tab=scan");
    } else if (preferredMode === "audit") {
      router.replace("/audit");
    } else if (preferredMode === "team") {
      // Por enquanto, só leva para a página de contagem; depois podemos sinalizar o modo equipe
      router.replace("/count-import");
    } else {
      // "dashboard" ou qualquer outro valor → fica na home
    }
  }, [isLoading, userType, pathname, router]);
  // --- Handlers de Login e Modos ---

  const handleManagerLogin = (userId: number, token: string) => {
    sessionStorage.setItem("currentUserId", userId.toString());
    sessionStorage.removeItem("currentSession");

    setCurrentUserId(userId);
    setUserType("manager");
  };

  const handleCollaboratorJoin = (data: any) => {
    sessionStorage.setItem("currentSession", JSON.stringify(data));
    sessionStorage.removeItem("currentUserId");

    setSessionData(data);
    setUserType("participant");
  };

  const handleSwitchMode = () => {
    const newMode = managerMode === "single" ? "team" : "single";
    setManagerMode(newMode);
    sessionStorage.setItem("managerMode", newMode);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}

    sessionStorage.clear();
    window.location.reload();
  };

  // --- Renderização Global (antes dos children) ---

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 1. Login
  if (!userType) {
    return (
      <AuthModal
        onUnlock={handleManagerLogin}
        onJoinSession={handleCollaboratorJoin}
      />
    );
  }

  // 2. Visão do Colaborador
  if (userType === "participant") {
    return (
      <ParticipantView sessionData={sessionData} onLogout={handleLogout} />
    );
  }

  // 3. Visão do Anfitrião (Manager)
  return (
    <>
      <div className="relative min-h-screen flex flex-col">
        {/* Navegação Global */}
        <Navigation
          setShowClearDataModal={inventory.setShowClearDataModal}
          onNavigate={setActiveTab}
          currentMode={managerMode}
          onSwitchToTeamMode={handleEnterTeamMode}
        />

        {managerMode === "team" && currentUserId ? (
          <TeamManagerView
            userId={currentUserId}
            onBack={() => {
              setManagerMode("single");
              sessionStorage.setItem("managerMode", "single");
            }}
          />
        ) : (
          <main
            ref={mainContainerRef}
            className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-24 sm:pb-8"
          >
            <div className="pt-0 sm:pt-0">{children}</div>
          </main>
        )}

        {managerMode === "single" && (
          <>
            {inventory.showClearDataModal && (
              <ClearDataModal
                isOpen={inventory.showClearDataModal}
                onClose={() => inventory.setShowClearDataModal(false)}
                onConfirm={inventory.handleClearAllData}
              />
            )}

            {inventory.showMissingItemsModal && (
              <MissingItemsModal
                isOpen={inventory.showMissingItemsModal}
                onClose={() => inventory.setShowMissingItemsModal(false)}
                items={inventory.missingItems}
              />
            )}

            {inventory.showSaveModal && (
              <SaveCountModal
                isOpen={inventory.showSaveModal}
                onClose={() => inventory.setShowSaveModal(false)}
                onConfirm={inventory.executeSaveCount}
                isLoading={inventory.isSaving}
              />
            )}

            {/* Botão flutuante só faz sentido na home (onde tem scan/dashboard) */}
            {pathname === "/" && activeTab === "scan" && (
              <FloatingMissingItemsButton
                itemCount={inventory.missingItems.length}
                onClick={() => inventory.setShowMissingItemsModal(true)}
                dragConstraintsRef={mainContainerRef}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
