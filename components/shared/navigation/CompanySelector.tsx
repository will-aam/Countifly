"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Building2, Globe, PlusCircle, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  companyContextStorageKey,
  getCountContextSnapshot,
  setStoredCompanyContext,
  teamSessionContextLockKey,
} from "@/lib/company-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface Company {
  id: number;
  nomeFantasia: string;
}

export function CompanySelector({ userId }: { userId?: number } = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(userId ?? null);
  const [lockContexts, setLockContexts] = useState<Record<string, number | null>>({});
  const isContextLocked = Object.keys(lockContexts).length > 0;

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        let accountId = userId;
        if (!accountId) {
          const userResponse = await fetch("/api/user/me");
          const userData = await userResponse.json();
          accountId = userData.success ? Number(userData.id) : undefined;
        }
        if (!accountId) return;
        setResolvedUserId(accountId);
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (data.success) {
          setAllCompanies(data.companies);
          setCompanies(data.companies.filter((c: any) => c.ativo));
          const initialLocks: Record<string, number | null> = {};
          const auditSnapshot = getCountContextSnapshot(accountId, "audit");
          const importSnapshot = getCountContextSnapshot(accountId, "import");
          if (auditSnapshot !== undefined) initialLocks["count-audit"] = auditSnapshot;
          if (importSnapshot !== undefined) initialLocks["count-import"] = importSnapshot;
          const storedTeamLock = localStorage.getItem(teamSessionContextLockKey(accountId));
          if (storedTeamLock !== null) {
            initialLocks["team-session"] = storedTeamLock === "none" ? null : Number(storedTeamLock) || null;
          }

          // Remove the legacy browser-wide value and migrate it only when it
          // belongs to this account's active company list.
          const legacyId = localStorage.getItem("countifly_selected_company_id");
          const storageKey = companyContextStorageKey(accountId);
          let savedId = localStorage.getItem(storageKey);
          if (!savedId && legacyId) {
            const legacyCompany = data.companies.find(
              (c: any) => c.ativo && c.id === Number(legacyId),
            );
            if (legacyCompany) {
              savedId = String(legacyCompany.id);
              localStorage.setItem(storageKey, savedId);
            }
          }
          localStorage.removeItem("countifly_selected_company_id");
          if (savedId) {
            const company = data.companies.find(
              (c: any) => c.ativo && c.id === Number(savedId),
            );
            if (company) setSelectedCompany(company);
            else localStorage.removeItem(storageKey);
          }

          const sessionsResponse = await fetch("/api/sessions");
          if (sessionsResponse.ok) {
            const sessions = await sessionsResponse.json();
            const activeSession = sessions.find((session: any) => session.status === "ABERTA");
            if (activeSession) {
              const sessionCompanyId = activeSession.empresa_id ?? null;
              initialLocks["team-session"] = sessionCompanyId;
              localStorage.setItem(
                teamSessionContextLockKey(accountId),
                sessionCompanyId == null ? "none" : String(sessionCompanyId),
              );
            } else {
              localStorage.removeItem(teamSessionContextLockKey(accountId));
            }
          }
          setLockContexts(initialLocks);
        }
      } catch (error) {
        console.error("Erro ao carrerar empresas no seletor:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [userId]);

  useEffect(() => {
    const onLockChange = (event: Event) => {
      const detail = (event as CustomEvent<{ locked: boolean; companyId: number | null; source?: string }>).detail;
      const source = detail.source || "team-session";
      setLockContexts((current) => {
        const next = { ...current };
        if (detail.locked) next[source] = detail.companyId;
        else delete next[source];
        return next;
      });
    };
    window.addEventListener("companyContextLockChanged", onLockChange);
    return () => window.removeEventListener("companyContextLockChanged", onLockChange);
  }, []);

  useEffect(() => {
    if (!resolvedUserId || !allCompanies.length) return;
    const preferredSource = ["team-session", "count-import", "count-audit"].find(
      (source) => Object.prototype.hasOwnProperty.call(lockContexts, source),
    );
    if (!preferredSource) return;
    const companyId = lockContexts[preferredSource];
    const company = allCompanies.find((item) => item.id === companyId) || null;
    setSelectedCompany(company);
    setStoredCompanyContext(resolvedUserId, companyId);
    window.dispatchEvent(new Event("companyChanged"));
  }, [allCompanies, lockContexts, resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const syncStoredLocks = () => {
      const auditSnapshot = getCountContextSnapshot(resolvedUserId, "audit");
      const importSnapshot = getCountContextSnapshot(resolvedUserId, "import");
      const storedTeamLock = localStorage.getItem(teamSessionContextLockKey(resolvedUserId));
      setLockContexts((current) => {
        const next = { ...current };
        if (auditSnapshot === undefined) delete next["count-audit"];
        else next["count-audit"] = auditSnapshot;
        if (importSnapshot === undefined) delete next["count-import"];
        else next["count-import"] = importSnapshot;
        if (storedTeamLock === null) delete next["team-session"];
        else next["team-session"] = storedTeamLock === "none" ? null : Number(storedTeamLock) || null;
        return next;
      });
    };
    window.addEventListener("storage", syncStoredLocks);
    return () => window.removeEventListener("storage", syncStoredLocks);
  }, [resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    const syncSelection = () => {
      if (isContextLocked) return;
      const id = localStorage.getItem(companyContextStorageKey(resolvedUserId));
      const company = companies.find((item) => item.id === Number(id)) || null;
      setSelectedCompany(company);
    };
    window.addEventListener("companyChanged", syncSelection);
    window.addEventListener("storage", syncSelection);
    return () => {
      window.removeEventListener("companyChanged", syncSelection);
      window.removeEventListener("storage", syncSelection);
    };
  }, [companies, isContextLocked, resolvedUserId]);

  const handleSelect = (company: Company | null) => {
    const hasPersistedCountLock = resolvedUserId != null && (
      getCountContextSnapshot(resolvedUserId, "audit") !== undefined ||
      getCountContextSnapshot(resolvedUserId, "import") !== undefined
    );
    if (isContextLocked || hasPersistedCountLock) return;
    setSelectedCompany(company);
    if (resolvedUserId) setStoredCompanyContext(resolvedUserId, company?.id ?? null);

    window.dispatchEvent(new Event("companyChanged"));
    setOpen(false);
  };

  const handleAddCompany = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    router.push("/settings-user?tab=companies");
  };

  const lockTitle = lockContexts["team-session"] !== undefined
    ? "Sessão de equipe em andamento"
    : lockContexts["count-import"] !== undefined
      ? "Contagem por importação ativa"
      : "Contagem livre ativa";
  const lockDescription = lockContexts["team-session"] !== undefined
    ? "O contexto fica fixo até a sessão ser encerrada."
    : lockContexts["count-import"] !== undefined
      ? "Limpe a importação e as contagens para escolher outra empresa."
      : "Limpe as contagens para escolher outra empresa.";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-1.5 hover:opacity-80 transition-all group bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none ring-0 select-none shadow-none">
        <div className="flex flex-col items-start text-left">
          <span className="text-xl font-extrabold tracking-tight text-foreground leading-none">
            Countifly
          </span>
          {selectedCompany && (
            <span className="text-[10px] font-medium text-blue-500 animate-in fade-in slide-in-from-left-1 flex items-center gap-1 mt-0.5">
              <Building2 className="h-2.5 w-2.5" />
              <span className="truncate max-w-[120px]">
                {selectedCompany.nomeFantasia}
              </span>
            </span>
          )}
          {isContextLocked && !selectedCompany && (
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
              <Globe className="h-2.5 w-2.5" /> Sem vínculo
            </span>
          )}
          {isContextLocked && (
            <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 mt-0.5">
              <LockKeyhole className="h-2.5 w-2.5" /> Contexto bloqueado
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:text-foreground",
            open && "rotate-180 text-foreground",
          )}
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-[260px] p-0 shadow-2xl border-border/40 overflow-hidden rounded-xl"
        align="start"
      >
        <Command>
          {isContextLocked && (
            <div className="m-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <LockKeyhole className="h-3.5 w-3.5" /> {lockTitle}
              </div>
              <p className="mt-1">{lockDescription}</p>
            </div>
          )}
          <CommandInput
            placeholder="Buscar empresa..."
            className="border-none focus:ring-0"
            disabled={isContextLocked}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>

            <div className="p-1">
              <CommandGroup heading="Contexto de Contagem">
                <CommandItem
                  disabled={isContextLocked}
                  onSelect={() => handleSelect(null)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer rounded-lg",
                    !selectedCompany && "bg-primary/10 text-primary",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="font-medium">Sem vínculo</span>
                  </div>
                  {!selectedCompany && <Check className="h-4 w-4" />}
                </CommandItem>
              </CommandGroup>
            </div>

            <CommandSeparator />

            <div className="p-1">
              {/* Heading Personalizado com Botão de '+' */}
              <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <span>Suas Empresas</span>
                {!isContextLocked && <button
                  onClick={handleAddCompany}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors p-1 -mr-1 rounded-md hover:bg-primary/10"
                  title="Nova Empresa"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Nova
                  </span>
                </button>}
              </div>

              <CommandGroup>
                {companies.map((company) => {
                  const isSelected = selectedCompany?.id === company.id;
                  return (
                    <CommandItem
                      key={company.id}
                      disabled={isContextLocked}
                      onSelect={() => handleSelect(company)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer rounded-lg mb-1 last:mb-0",
                        isSelected && "bg-primary/10 text-primary font-medium",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Building2
                          className={cn(
                            "h-4 w-4",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate max-w-[160px]">
                          {company.nomeFantasia}
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
