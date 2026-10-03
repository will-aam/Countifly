"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { PanelLeft, ChevronRight } from "lucide-react";

// --- HEROICONS (Outline) ---
import {
  UserIcon,
  MoonIcon,
  SunIcon,
  ArrowRightOnRectangleIcon as LogOutIcon,
  CircleStackIcon as DatabaseIcon,
  UsersIcon,
  LockClosedIcon as LockIcon,
  Bars3Icon as MenuIcon,
  Cog6ToothIcon as SettingsIcon,
  HomeIcon as HomeOutline,
  DocumentTextIcon as FileTextOutline,
  BuildingOfficeIcon as BuildingOutline,
  Cog6ToothIcon as SettingsOutline,
  ShieldCheckIcon as ShieldOutline,
  TagIcon,
} from "@heroicons/react/24/outline";

// --- HEROICONS (Solid) ---
import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as FileTextSolid,
  BuildingOfficeIcon as BuildingSolid,
  Cog6ToothIcon as SettingsSolid,
  ShieldCheckIcon as ShieldSolid,
} from "@heroicons/react/24/solid";

import { Button } from "@/components/ui/button";
import { useUserModules } from "@/hooks/useUserModules";
import { clearLocalDatabase } from "@/lib/db";
import { CompanySelector } from "@/components/shared/navigation/CompanySelector";
import { UserSidebarMenu } from "@/components/shared/navigation/UserSidebarMenu";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

// ─── Sidebar nav item ───────────────────────────────────────────────────────
const SidebarItem = ({
  icon: Icon,
  solidIcon: SolidIcon,
  title,
  isActive,
  onClick,
  locked,
  isExpanded,
}: any) => {
  const IconToRender = isActive && SolidIcon ? SolidIcon : Icon;
  return (
    <button
      onClick={!locked ? onClick : undefined}
      title={!isExpanded ? title : undefined}
      className={cn(
        "w-full flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 text-left border border-transparent group",
        isExpanded ? "px-3" : "px-0 justify-center",
        locked
          ? "opacity-50 cursor-not-allowed"
          : isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
      )}
    >
      <IconToRender
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          locked
            ? "text-muted-foreground/40"
            : isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {isExpanded && (
        <div className="flex flex-1 items-center justify-between truncate">
          <span className={cn("text-[13px]", isActive ? "font-semibold" : "font-medium")}>
            {title}
          </span>
          {locked && <LockIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
        </div>
      )}
    </button>
  );
};

// ─── Section label ───────────────────────────────────────────────────────────
const SectionLabel = ({ label, visible }: { label: string; visible: boolean }) =>
  visible ? (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">
      {label}
    </p>
  ) : (
    <div className="pt-4" />
  );

// ─── AppShell ────────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string>("");

  const { isAdmin, hasModule, isModuleLocked, loading: modulesLoading } = useUserModules();

  useEffect(() => {
    setMounted(true);
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setUserName(d.success && d.displayName ? d.displayName : "Usuário"))
      .catch(() => setUserName("Usuário"));
  }, []);

  const handleLogout = async () => {
    try {
      await clearLocalDatabase();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const nav = (path: string) => router.push(path);

  // Active flags
  const isDashboard     = pathname === "/";
  const isHistory       = pathname?.startsWith("/history");
  const isCompanies     = pathname?.startsWith("/settings-companies");
  const isSettings      = pathname?.startsWith("/settings-user");
  const isAdmin_        = pathname?.startsWith("/admin");
  const isCountImport   = pathname?.startsWith("/count-import");
  const isCountFree     = pathname?.startsWith("/audit");
  const isTeam          = pathname?.startsWith("/team");
  const isLabels        = pathname?.startsWith("/internal-tools/labels");

  const pageTitle = () => {
    if (isDashboard)   return "Dashboard";
    if (isHistory)     return "Histórico";
    if (isCompanies)   return "Empresas";
    if (isSettings)    return "Configurações";
    if (isAdmin_)      return "Admin";
    if (isCountImport) return "Contagem por Importação";
    if (isCountFree)   return "Contagem Livre";
    if (isTeam)        return "Gerenciar Sala";
    if (isLabels)      return "Etiquetas";
    return "";
  };

  // sidebar widths
  const sidebarW = isSidebarExpanded ? "w-60" : "w-[60px]";
  const mainPl   = isSidebarExpanded ? "lg:pl-60" : "lg:pl-[60px]";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30 dark:bg-[#0f1117]">
      {/* ── MOBILE TOP BAR ────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 flex h-14 items-center justify-between bg-background/95 backdrop-blur-md px-4 border-b border-border/30">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
          {modulesLoading ? (
            <span className="animate-pulse font-extrabold text-lg tracking-tight opacity-40">Countifly</span>
          ) : hasModule("empresa") ? (
            <div className="flex-1 min-w-0"><CompanySelector /></div>
          ) : (
            <span className="font-extrabold text-lg tracking-tight">Countifly</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsProfileMenuOpen(true)}>
          <MenuIcon className="h-6 w-6" />
        </Button>
      </header>

      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40",
          "bg-background/80 dark:bg-[#13151c]/90 backdrop-blur-xl",
          "border-r border-border/20",
          "transition-all duration-300 ease-in-out",
          sidebarW
        )}
      >
        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2 pb-4">
          {!modulesLoading && (
            <>
              {/* Principal */}
              <SectionLabel label="Principal" visible={isSidebarExpanded} />
              <SidebarItem icon={HomeOutline} solidIcon={HomeSolid} title="Dashboard"
                isActive={isDashboard} isExpanded={isSidebarExpanded}
                onClick={() => nav("/?forceDashboard=1")} />

              {/* Contagens */}
              <SectionLabel label="Contagens" visible={isSidebarExpanded} />
              {hasModule("importacao") ? (
                <SidebarItem icon={SettingsIcon} title="Por Importação"
                  isActive={isCountImport} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/count-import")} />
              ) : isModuleLocked("importacao") ? (
                <SidebarItem locked icon={SettingsIcon} title="Por Importação" isExpanded={isSidebarExpanded} />
              ) : null}

              {hasModule("livre") ? (
                <SidebarItem icon={DatabaseIcon} title="Contagem Livre"
                  isActive={isCountFree} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/audit")} />
              ) : isModuleLocked("livre") ? (
                <SidebarItem locked icon={DatabaseIcon} title="Contagem Livre" isExpanded={isSidebarExpanded} />
              ) : null}

              {hasModule("sala") ? (
                <SidebarItem icon={UsersIcon} title="Gerenciar Sala"
                  isActive={isTeam} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/team")} />
              ) : isModuleLocked("sala") ? (
                <SidebarItem locked icon={UsersIcon} title="Gerenciar Sala" isExpanded={isSidebarExpanded} />
              ) : null}

              {/* Ferramentas */}
              <SectionLabel label="Ferramentas" visible={isSidebarExpanded} />
              <SidebarItem icon={TagIcon} title="Etiquetas"
                isActive={isLabels} isExpanded={isSidebarExpanded}
                onClick={() => nav("/internal-tools/labels")} />

              {/* Gerenciamento */}
              <SectionLabel label="Gerenciamento" visible={isSidebarExpanded} />
              <SidebarItem icon={FileTextOutline} solidIcon={FileTextSolid} title="Histórico"
                isActive={isHistory} isExpanded={isSidebarExpanded}
                onClick={() => nav("/history")} />

              {hasModule("empresa") ? (
                <SidebarItem icon={BuildingOutline} solidIcon={BuildingSolid} title="Empresas"
                  isActive={isCompanies} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/settings-companies")} />
              ) : (
                <SidebarItem locked icon={BuildingOutline} title="Empresas" isExpanded={isSidebarExpanded} />
              )}

              {isAdmin && (
                <SidebarItem icon={ShieldOutline} solidIcon={ShieldSolid} title="Admin"
                  isActive={isAdmin_} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/admin/users")} />
              )}

              {/* Ajustes */}
              <SectionLabel label="Ajustes" visible={isSidebarExpanded} />
              <SidebarItem icon={SettingsOutline} solidIcon={SettingsSolid} title="Configurações"
                isActive={isSettings} isExpanded={isSidebarExpanded}
                onClick={() => nav("/settings-user")} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className={cn(
          "shrink-0 py-3 px-2 border-t border-border/10",
          !isSidebarExpanded && "flex flex-col items-center gap-2"
        )}>
          {isSidebarExpanded ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 truncate">
                <p className="text-[13px] font-semibold truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Online</p>
              </div>
              {mounted && (
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0">
                  {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive shrink-0">
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-1.5 rounded-full bg-primary/10 text-primary" title={userName}>
                <UserIcon className="h-4 w-4" />
              </div>
              {mounted && (
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                  {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive">
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────────── */}
      <div className={cn("flex flex-col flex-1 h-screen transition-all duration-300 ease-in-out pt-14 lg:pt-0", mainPl)}>

        {/* Desktop top bar — company selector stays here, unaffected by collapse */}
        <header className="hidden lg:flex h-14 shrink-0 items-center gap-3 px-5">
          {/* Toggle button is the FIRST element, just below the company selector visually */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          {/* Company selector — always visible, independent of sidebar state */}
          <div className="flex items-center gap-2 flex-1">
            {!modulesLoading && hasModule("empresa") && (
              <CompanySelector />
            )}
            {!modulesLoading && !hasModule("empresa") && (
              <span className="font-bold text-sm text-foreground">Countifly</span>
            )}
          </div>

          {/* Breadcrumb */}
          {pageTitle() && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium shrink-0">
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              <span className="text-foreground/80">{pageTitle()}</span>
            </div>
          )}
        </header>

        {/* Page content — fills remaining space, scrollable, no outer border box */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full px-5 lg:px-6 py-5 pb-20 lg:pb-8 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>

        <MobileBottomNav />
      </div>

      {/* Mobile drawer */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
      />
    </div>
  );
}
