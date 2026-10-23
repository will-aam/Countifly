// components/inventory/Audit/AuditPageClient.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/useInventory";
import { ExportTab } from "@/components/inventory/Audit/AuditExportTab";
import { AuditSettingsTab } from "@/components/inventory/Audit/AuditSettingsTab";
import {
  AUDIT_PROFILES,
  configForAuditProfile,
  DEFAULT_AUDIT_CONFIG,
  normalizeAuditConfig,
  getAuditProfileLabel,
  type AuditConfig,
  type AuditProfileId,
  type AuditSession,
} from "@/lib/audit";
import { AuditConferenceTab } from "@/components/inventory/Audit/AuditConferenceTab";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { Settings, Scan, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// A interface das props que o servidor vai nos enviar
interface AuditPageClientProps {
  userId: number;
  initialTab: "scan" | "settings" | "export";
}

export function AuditPageClient({ userId, initialTab }: AuditPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionProfile, setNewSessionProfile] =
    useState<AuditProfileId>("products-quantity-price");

  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    initialTab,
  );

  const [fileName, setFileName] = useState("");

  const [auditConfig, setAuditConfig] = useState<AuditConfig>(DEFAULT_AUDIT_CONFIG);

  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Migra a auditoria anterior para uma sessão legada e recupera sessões salvas.
  useEffect(() => {
    const sessionsKey = `countifly-audit-sessions-v1:${userId}`;
    const activeSessionKey = `countifly-audit-active-session-v1:${userId}`;
    const oldClient = localStorage.getItem("audit_client_name") || "";
    let oldConfig = DEFAULT_AUDIT_CONFIG;
    try {
      const rawConfig = localStorage.getItem("audit-settings-v1");
      if (rawConfig) oldConfig = normalizeAuditConfig(JSON.parse(rawConfig));
    } catch (error) {
      console.error("Erro ao migrar configurações da auditoria", error);
    }

    let storedSessions: AuditSession[] = [];
    try {
      const parsed = JSON.parse(
        localStorage.getItem(sessionsKey) || "[]",
      );
      if (Array.isArray(parsed)) {
        storedSessions = parsed
          .filter((session) => session && typeof session.id === "string")
          .map((session) => ({
            ...session,
            clientName: String(session.clientName || ""),
            config: normalizeAuditConfig(session.config || oldConfig),
            countingMode: session.countingMode === "estoque" ? "estoque" : "loja",
          }));
      }
    } catch (error) {
      console.error("Erro ao carregar levantamentos", error);
    }

    if (storedSessions.length === 0) {
      const now = new Date().toISOString();
      storedSessions = [{
        id: "legacy",
        clientName: oldClient,
        config: oldConfig,
        countingMode: "loja",
        createdAt: now,
        updatedAt: now,
      }];
    }

    const requestedId = localStorage.getItem(activeSessionKey);
    const active = storedSessions.find((session) => session.id === requestedId) || storedSessions[0];
    setSessions(storedSessions);
    setActiveSessionId(active.id);
    setAuditConfig(active.config);
    setFileName(active.clientName ? `Auditoria - ${active.clientName}` : "");
    setSessionsLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!sessionsLoaded || !activeSessionId) return;
    localStorage.setItem(`countifly-audit-sessions-v1:${userId}`, JSON.stringify(sessions));
    localStorage.setItem(`countifly-audit-active-session-v1:${userId}`, activeSessionId);
  }, [sessions, activeSessionId, sessionsLoaded, userId]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );
  const clientName = activeSession?.clientName || "";

  const persistSessionConfig = (nextConfig: AuditConfig) => {
    setAuditConfig(nextConfig);
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, config: nextConfig, updatedAt: new Date().toISOString() }
          : session,
      ),
    );
  };

  const createAuditSession = () => {
    const name = newSessionName.trim();
    if (!name) return;
    const id = globalThis.crypto?.randomUUID?.() || `audit-${Date.now()}`;
    const now = new Date().toISOString();
    const config = configForAuditProfile(newSessionProfile, {
      ...DEFAULT_AUDIT_CONFIG,
      quantityLayout: "split",
    });
    const session: AuditSession = {
      id,
      clientName: name,
      config,
      countingMode: "loja",
      createdAt: now,
      updatedAt: now,
    };
    setSessions((previous) => [...previous, session]);
    setActiveSessionId(id);
    setAuditConfig(config);
    setFileName(`Auditoria - ${name}`);
    setNewSessionName("");
    setNewSessionProfile("products-quantity-price");
    setNewSessionOpen(false);
    setActiveTab("scan");
    router.push("/audit?tab=scan");
  };

  const updateSessionName = (name: string) => {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, clientName: name, updatedAt: new Date().toISOString() }
          : session,
      ),
    );
  };

  const markSessionSaved = () => {
    const now = new Date().toISOString();
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, lastSavedAt: now, updatedAt: now }
          : session,
      ),
    );
  };

  // Sincroniza abas via URL (BottomNav)
  useEffect(() => {
    const tab = searchParams.get("tab") as
      | "scan"
      | "settings"
      | "export"
      | null;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // Atualiza a URL ao clicar nas abas pelo desktop
  const handleTabChange = (val: string) => {
    setActiveTab(val as "scan" | "settings" | "export");
    router.push(`/audit?tab=${val}`);
  };

  // HOOK DO INVENTÁRIO (Usando o userId que veio direto do servidor!)
  const inventory = useInventory({
    userId,
    mode: "audit",
    auditSessionId: activeSessionId || "legacy",
    auditSessionName: clientName,
    auditConfig,
    onCountSaved: markSessionSaved,
  });

  const handleAuditConfigChange = (nextConfig: AuditConfig) => {
    const structuralChange =
      nextConfig.profile !== auditConfig.profile ||
      nextConfig.collectQuantity !== auditConfig.collectQuantity ||
      nextConfig.collectPrice !== auditConfig.collectPrice ||
      nextConfig.quantityLayout !== auditConfig.quantityLayout;
    if (structuralChange && inventory.productCounts.length > 0) {
      toast({
        title: "Perfil já em uso",
        description:
          "Para manter o relatório consistente, crie um novo levantamento antes de mudar os dados coletados.",
        variant: "destructive",
      });
      return;
    }
    if (nextConfig.quantityLayout === "total") {
      inventory.setCountingMode("loja");
      setSessions((previous) =>
        previous.map((session) =>
          session.id === activeSessionId
            ? { ...session, countingMode: "loja" }
            : session,
        ),
      );
    }
    persistSessionConfig(nextConfig);
  };

  const selectAuditSession = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    setActiveSessionId(session.id);
    setAuditConfig(session.config);
    inventory.setCountingMode(
      session.config.quantityLayout === "total" ? "loja" : session.countingMode,
    );
    setFileName(session.clientName ? `Auditoria - ${session.clientName}` : "");
    setActiveTab("scan");
    router.push("/audit?tab=scan");
  };

  const updateCountingMode = (countingMode: "loja" | "estoque") => {
    inventory.setCountingMode(countingMode);
    setSessions((previous) =>
      previous.map((session) =>
        session.id === activeSessionId
          ? { ...session, countingMode }
          : session,
      ),
    );
  };
  // --- ADAPTERS (CORREÇÃO DOS ERROS DE ARGUMENTO) ---
  const handleAddCountAdapter = (quantity: number, price?: number) => {
    inventory.handleAddCount(quantity, { price });
  };

  const handleAddManualItemAdapter = (
    desc: string,
    qty: number,
    price?: number,
  ) => {
    inventory.handleAddManualItem("MANUAL-ENTRY", qty, desc, price);
  };

  const handleUpdateItemPrice = (id: number, price: number) => {
    inventory.setProductCounts((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, price, priceCaptured: true } : item,
      ),
    );
    toast({ title: "Preço atualizado" });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 border-b bg-muted/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="audit-client-name" className="text-xs text-muted-foreground">
            Cliente ou local deste levantamento
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="audit-client-name"
              value={clientName}
              onChange={(event) => {
                updateSessionName(event.target.value);
                setFileName(event.target.value ? `Auditoria - ${event.target.value}` : "");
              }}
              placeholder="Ex.: Loja Centro"
              className="pl-9"
              disabled={!sessionsLoaded}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:w-64">
          <Label htmlFor="audit-session-select" className="text-xs text-muted-foreground">
            Levantamento salvo neste aparelho
          </Label>
          <select
            id="audit-session-select"
            value={activeSessionId}
            onChange={(event) => selectAuditSession(event.target.value)}
            disabled={!sessionsLoaded}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.clientName || "Levantamento sem nome"}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setNewSessionOpen(true)}
        >
          Nova contagem
        </Button>
        <div className="w-full text-xs text-muted-foreground sm:w-auto sm:self-center">
          {inventory.isSaving ? (
            "Salvando relatório…"
          ) : (
            <>
              Rascunho salvo automaticamente neste aparelho
              {activeSession?.lastSavedAt && (
                <span className="block">
                  Último relatório no histórico: {new Date(activeSession.lastSavedAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="w-[95vw] max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>Iniciar nova contagem</DialogTitle>
            <DialogDescription>
              Cada levantamento mantém seus próprios itens e configurações neste aparelho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-audit-name">Cliente ou local</Label>
              <Input
                id="new-audit-name"
                value={newSessionName}
                onChange={(event) => setNewSessionName(event.target.value)}
                placeholder="Ex.: Loja Centro"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-audit-profile">O que será coletado?</Label>
              <select
                id="new-audit-profile"
                value={newSessionProfile}
                onChange={(event) => setNewSessionProfile(event.target.value as AuditProfileId)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {AUDIT_PROFILES.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                {AUDIT_PROFILES.find((profile) => profile.id === newSessionProfile)?.description}
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setNewSessionOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={createAuditSession}
              disabled={!newSessionName.trim()}
            >
              Iniciar levantamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main
        ref={mainContainerRef}
        // CORREÇÃO 1: Tiramos o px-4 e pt-4 do mobile. O mobile agora é 0 (colado nas bordas e no topo)
        className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-32 sm:pb-8"
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          // CORREÇÃO 2: Passamos o gap para sm:space-y-6
          className="sm:space-y-6"
        >
          {/* Menu Desktop */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Conferência
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Config.
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </TabsTrigger>
            </TabsList>
          </div>

          {/* CORREÇÃO 3: mt-0 para matar a margem padrão do componente Tabs */}
          <TabsContent value="scan" className="mt-0 sm:space-y-6">
            <AuditConferenceTab
              countingMode={inventory.countingMode}
              setCountingMode={updateCountingMode}
              scanInput={inventory.scanInput}
              setScanInput={inventory.setScanInput}
              handleScan={inventory.handleScan}
              isCameraViewActive={inventory.isCameraViewActive}
              setIsCameraViewActive={inventory.setIsCameraViewActive}
              handleBarcodeScanned={inventory.handleBarcodeScanned}
              currentProduct={inventory.currentProduct}
              quantityInput={inventory.quantityInput}
              setQuantityInput={inventory.setQuantityInput}
              handleAddCount={handleAddCountAdapter}
              handleAddManualItem={handleAddManualItemAdapter}
              productCounts={inventory.productCounts}
              handleRemoveCount={inventory.handleRemoveCount}
              onUpdateItemPrice={handleUpdateItemPrice}
              handleSaveCount={inventory.handleSaveCount}
              handleClearCountsOnly={inventory.handleClearCountsOnly}
              auditConfig={auditConfig}
              auditSessionName={clientName}
            />
          </TabsContent>

          {/* Aplicamos a mesma regra nas outras abas para manter a consistência */}
          <TabsContent value="settings" className="mt-0 sm:space-y-6">
            <AuditSettingsTab
              config={auditConfig}
              setConfig={handleAuditConfigChange}
              userId={userId}
              profileLocked={inventory.productCounts.length > 0}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-0 sm:space-y-6">
            <ExportTab
              productCounts={inventory.productCounts}
              handleSaveCount={inventory.handleSaveCount}
              auditConfig={auditConfig}
              fileName={fileName}
              clientName={clientName}
            />
          </TabsContent>
        </Tabs>
      </main>

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
            userId={userId}
            companyId={inventory.selectedCompanyId}
            contextLabel={`${clientName || "Levantamento sem nome"} · ${getAuditProfileLabel(auditConfig.profile)}`}
          />
        )}
      </>
    </>
  );
}
