// components/inventory/Audit/AuditPageClient.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/useInventory";
import { useExternalScannerMode } from "@/hooks/useExternalScannerMode";
import { ExportTab } from "@/components/inventory/Audit/AuditExportTab";
import { AuditSettingsTab } from "@/components/inventory/Audit/AuditSettingsTab";
import {
  DEFAULT_AUDIT_CONFIG,
  normalizeAuditConfig,
  getAuditProfileLabel,
  type AuditConfig,
  type AuditSession,
} from "@/lib/audit";
import { AuditConferenceTab } from "@/components/inventory/Audit/AuditConferenceTab";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { Settings, Scan, Download, Archive, Plus, Trash2, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getLocalCounts, deleteLocalAuditDraft } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// A interface das props que o servidor vai nos enviar
interface AuditPageClientProps {
  userId: number;
  initialTab: "scan" | "settings" | "export";
}

export function AuditPageClient({ userId, initialTab }: AuditPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const {
    externalScannerMode,
    setExternalScannerMode,
    externalScannerModeReady,
  } = useExternalScannerMode();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [draftManagerOpen, setDraftManagerOpen] = useState(false);
  const [draftControlsExpanded, setDraftControlsExpanded] = useState(false);
  const [draftItemCounts, setDraftItemCounts] = useState<Record<string, number>>({});
  const [draftPendingDelete, setDraftPendingDelete] = useState<AuditSession | null>(null);

  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    initialTab,
  );

  const fileName = "";

  const [auditConfig, setAuditConfig] = useState<AuditConfig>(DEFAULT_AUDIT_CONFIG);

  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Migra a auditoria anterior para uma sessão legada e recupera sessões salvas.
  useEffect(() => {
    const sessionsKey = `countifly-audit-sessions-v1:${userId}`;
    const activeSessionKey = `countifly-audit-active-session-v1:${userId}`;
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
            id: session.id,
            config: normalizeAuditConfig(session.config || oldConfig),
            countingMode: session.countingMode === "estoque" ? "estoque" : "loja",
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: session.updatedAt || new Date().toISOString(),
            lastSavedAt: session.lastSavedAt,
          }));
      }
    } catch (error) {
      console.error("Erro ao carregar levantamentos", error);
    }

    if (storedSessions.length === 0) {
      const now = new Date().toISOString();
      storedSessions = [{
        id: "legacy",
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
    if (!sessionsLoaded) return;
    const id = globalThis.crypto?.randomUUID?.() || `audit-${Date.now()}`;
    const now = new Date().toISOString();
    const config = activeSession?.config || auditConfig;
    const session: AuditSession = {
      id,
      config,
      countingMode: activeSession?.countingMode || "loja",
      createdAt: now,
      updatedAt: now,
    };
    setSessions((previous) => [...previous, session]);
    setActiveSessionId(id);
    setAuditConfig(config);
    setActiveTab("scan");
    setDraftControlsExpanded(false);
    router.push("/audit?tab=scan");
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
    auditConfig,
    onCountSaved: markSessionSaved,
  });

  useEffect(() => {
    if (!draftManagerOpen || !userId) return;
    let cancelled = false;
    getLocalCounts(userId)
      .then((counts) => {
        if (cancelled) return;
        const nextCounts: Record<string, number> = {};
        for (const session of sessions) {
          nextCounts[session.id] = counts.filter(
            (item) =>
              (item.mode || "audit") === "audit" &&
              (item.auditSessionId || "legacy") === session.id,
          ).length;
        }
        setDraftItemCounts(nextCounts);
      })
      .catch((error) => console.error("Erro ao carregar rascunhos locais:", error));
    return () => {
      cancelled = true;
    };
  }, [draftManagerOpen, userId, sessions, inventory.productCounts.length]);

  const handleAuditConfigChange = (nextConfig: AuditConfig) => {
    const offlineScopeChanged =
      nextConfig.offlineMode !== auditConfig.offlineMode ||
      JSON.stringify(nextConfig.offlineActiveFilters) !==
        JSON.stringify(auditConfig.offlineActiveFilters);
    const structuralChange =
      nextConfig.profile !== auditConfig.profile ||
      nextConfig.collectQuantity !== auditConfig.collectQuantity ||
      nextConfig.collectPrice !== auditConfig.collectPrice ||
      nextConfig.quantityLayout !== auditConfig.quantityLayout ||
      offlineScopeChanged;
    if (structuralChange && inventory.productCounts.length > 0) {
      toast({
        title: offlineScopeChanged ? "Base de contagem já em uso" : "Perfil já em uso",
        description:
          "Para manter o relatório consistente, limpe os itens ou inicie uma nova contagem antes de mudar esta configuração.",
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
    setActiveTab("scan");
    setDraftControlsExpanded(false);
    router.push("/audit?tab=scan");
  };

  const handleDeleteAuditDraft = async (session: AuditSession) => {
    if (session.id === activeSessionId) {
      toast({
        title: "Este rascunho está em uso",
        description: "Abra outro rascunho antes de excluir este.",
        variant: "destructive",
      });
      return;
    }

    try {
      // A sessão legada também tem um snapshot remoto; apague-o junto com o rascunho local.
      if (session.id === "legacy") {
        if (!navigator.onLine) {
          toast({
            title: "Conecte-se para excluir este rascunho",
            description: "Este rascunho antigo também tem dados sincronizados no servidor.",
            variant: "destructive",
          });
          return;
        }
        const response = await fetch("/api/inventory?scope=counts", { method: "DELETE" });
        if (!response.ok) throw new Error("Não foi possível excluir os dados sincronizados.");
      }

      await deleteLocalAuditDraft(userId, session.id);
      setSessions((previous) => previous.filter((item) => item.id !== session.id));
      setDraftItemCounts((previous) => {
        const { [session.id]: _deleted, ...rest } = previous;
        return rest;
      });

      setDraftPendingDelete(null);
      toast({
        title: "Rascunho excluído",
        description: "Relatórios já salvos no histórico foram mantidos.",
      });
    } catch (error) {
      console.error("Erro ao excluir rascunho:", error);
      toast({
        title: "Não foi possível excluir o rascunho",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
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
      <div className="mx-auto mb-3 w-full max-w-7xl px-3 py-2 sm:mb-0 sm:px-6 lg:px-8">
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraftManagerOpen(true)}
            disabled={!sessionsLoaded}
          >
            <Archive className="h-4 w-4" />
            Rascunhos
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {sessions.length}
            </span>
          </Button>
          <Button type="button" onClick={createAuditSession} disabled={!sessionsLoaded}>
            <Plus className="h-4 w-4" />
            Nova contagem
          </Button>
          <p className="ml-auto text-xs text-muted-foreground">
            {inventory.isSaving ? "Salvando no histórico…" : "Salvo automaticamente neste aparelho"}
            {activeSession?.lastSavedAt && (
              <span className="ml-1">
                · Histórico atualizado em {new Date(activeSession.lastSavedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </p>
        </div>

        <div className="sm:hidden">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full justify-between px-2 hover:bg-transparent active:bg-transparent"
            aria-expanded={draftControlsExpanded}
            aria-controls="audit-draft-controls"
            onClick={() => setDraftControlsExpanded((expanded) => !expanded)}
          >
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Contagens salvas
              <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                {sessions.length}
              </Badge>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${draftControlsExpanded ? "rotate-180" : ""}`} />
          </Button>
          {draftControlsExpanded && (
            <div id="audit-draft-controls" className="flex flex-col gap-2 px-1 pb-1 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDraftManagerOpen(true)}
                disabled={!sessionsLoaded}
              >
                Gerenciar rascunhos
              </Button>
              <Button type="button" className="w-full" onClick={createAuditSession} disabled={!sessionsLoaded}>
                <Plus className="h-4 w-4" />
                Nova contagem
              </Button>
              <p className="px-1 text-xs text-muted-foreground">
                {inventory.isSaving ? "Salvando no histórico…" : "Salvo automaticamente neste aparelho"}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={draftManagerOpen}
        onOpenChange={(open) => {
          setDraftManagerOpen(open);
          if (!open) setDraftControlsExpanded(false);
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-5 py-4 pr-12 text-left sm:px-6">
            <DialogTitle>Rascunhos neste aparelho</DialogTitle>
            <DialogDescription>
              Contagens locais salvas automaticamente. Para excluir o rascunho em uso, abra outro primeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto p-3 sm:p-4">
            {sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum rascunho salvo.
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((session, index) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <li
                      key={session.id}
                      className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">Rascunho {index + 1}</p>
                          {isActive && (
                            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                              Em uso
                            </Badge>
                          )}
                        </div>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(session.createdAt).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                          <span>{draftItemCounts[session.id] ?? 0} itens</span>
                          <span>{getAuditProfileLabel(session.config.profile)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!isActive && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => {
                              selectAuditSession(session.id);
                              setDraftManagerOpen(false);
                            }}
                          >
                            Abrir
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          aria-label={`Excluir rascunho ${index + 1}`}
                          onClick={() => setDraftPendingDelete(session)}
                          disabled={isActive}
                          title={isActive ? "Abra outro rascunho antes de excluir este" : "Excluir rascunho"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={draftPendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setDraftPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens deste rascunho serão apagados do aparelho. Relatórios já salvos no histórico serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const pending = draftPendingDelete;
                setDraftPendingDelete(null);
                if (pending) void handleDeleteAuditDraft(pending);
              }}
            >
              Excluir rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              externalScannerMode={externalScannerMode}
              externalScannerModeReady={externalScannerModeReady}
            />
          </TabsContent>

          {/* Aplicamos a mesma regra nas outras abas para manter a consistência */}
          <TabsContent value="settings" className="mt-0 sm:space-y-6">
            <AuditSettingsTab
              config={auditConfig}
              setConfig={handleAuditConfigChange}
              userId={userId}
              profileLocked={inventory.productCounts.length > 0}
              externalScannerMode={externalScannerMode}
              externalScannerModeReady={externalScannerModeReady}
              onExternalScannerModeChange={setExternalScannerMode}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-0 sm:space-y-6">
            <ExportTab
              productCounts={inventory.productCounts}
              reportProductCounts={inventory.auditReportCounts}
              offlineCatalogItemCount={inventory.offlineCatalogItems.length}
              handleSaveCount={inventory.handleSaveCount}
              auditConfig={auditConfig}
              fileName={fileName}
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
            contextLabel={getAuditProfileLabel(auditConfig.profile)}
          />
        )}
      </>
    </>
  );
}
