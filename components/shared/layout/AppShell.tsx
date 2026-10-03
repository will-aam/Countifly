"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

import {
  UserIcon,
  ArrowRightOnRectangleIcon as LogOutIcon,
  CircleStackIcon as DatabaseIcon,
  UsersIcon,
  LockClosedIcon as LockIcon,
  Bars3Icon as MenuIcon,
  HomeIcon as HomeOutline,
  DocumentTextIcon as FileTextOutline,
  BuildingOfficeIcon as BuildingOutline,
  Cog6ToothIcon as SettingsOutline,
  ShieldCheckIcon as ShieldOutline,
  TagIcon,
  Bars3CenterLeftIcon,
} from "@heroicons/react/24/outline";

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

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
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
        "w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-150 text-left group",
        isExpanded ? "px-3" : "px-0 justify-center",
        locked
          ? "opacity-40 cursor-not-allowed"
          : isActive
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <IconToRender
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          locked
            ? "text-muted-foreground/30"
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

const SectionLabel = ({ label, visible }: { label: string; visible: boolean }) =>
  visible ? (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap select-none">
      {label}
    </p>
  ) : (
    <div className="pt-4" />
  );

// ─── AppShell ─────────────────────────────────────────────────────────────────
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

  const isDashboard = pathname === "/";
  const isHistory = pathname?.startsWith("/history");
  const isCompanies = pathname?.startsWith("/settings-companies");
  const isSettings = pathname?.startsWith("/settings-user");
  const isAdminPage = pathname?.startsWith("/admin");
  const isCountImport = pathname?.startsWith("/count-import");
  const isCountFree = pathname?.startsWith("/audit");
  const isTeam = pathname?.startsWith("/team");
  const isLabels = pathname?.startsWith("/internal-tools/labels");

  const pageTitle = () => {
    if (isDashboard) return "Dashboard";
    if (isHistory) return "Histórico";
    if (isCompanies) return "Empresas";
    if (isSettings) return "Configurações";
    if (isAdminPage) return "Admin";
    if (isCountImport) return "Contagem por Importação";
    if (isCountFree) return "Contagem Livre";
    if (isTeam) return "Gerenciar Sala";
    if (isLabels) return "Etiquetas";
    return "";
  };

  const sidebarW = isSidebarExpanded ? "w-60" : "w-[60px]";
  const mainPl = isSidebarExpanded ? "lg:pl-60" : "lg:pl-[60px]";

  return (
    /*
     * Root: the background that fills EVERYTHING —
     * sidebar + padding around the floating card.
     * Light: slate-blue-grey  |  Dark: very dark navy
     */
    <div className="flex h-screen w-full overflow-hidden bg-[#eef1f6] dark:bg-[#0d0f14]">

      {/* ── MOBILE TOP BAR ───────────────────────────────────── */}
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

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      {/* Sidebar shares the same root background — they blend seamlessly */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40",
          "transition-all duration-300 ease-in-out",
          sidebarW
        )}
      >
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2 pt-4 pb-4">
          {!modulesLoading && (
            <>
              <SectionLabel label="Principal" visible={isSidebarExpanded} />
              <SidebarItem icon={HomeOutline} solidIcon={HomeSolid} title="Dashboard"
                isActive={isDashboard} isExpanded={isSidebarExpanded}
                onClick={() => nav("/?forceDashboard=1")} />

              <SectionLabel label="Contagens" visible={isSidebarExpanded} />
              {hasModule("importacao") ? (
                <SidebarItem icon={Bars3CenterLeftIcon} title="Por Importação"
                  isActive={isCountImport} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/count-import")} />
              ) : isModuleLocked("importacao") ? (
                <SidebarItem locked icon={Bars3CenterLeftIcon} title="Por Importação" isExpanded={isSidebarExpanded} />
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

              <SectionLabel label="Ferramentas" visible={isSidebarExpanded} />
              <SidebarItem icon={TagIcon} title="Etiquetas"
                isActive={isLabels} isExpanded={isSidebarExpanded}
                onClick={() => nav("/internal-tools/labels")} />

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
                  isActive={isAdminPage} isExpanded={isSidebarExpanded}
                  onClick={() => nav("/admin/users")} />
              )}

              <SectionLabel label="Ajustes" visible={isSidebarExpanded} />
              <SidebarItem icon={SettingsOutline} solidIcon={SettingsSolid} title="Configurações"
                isActive={isSettings} isExpanded={isSidebarExpanded}
                onClick={() => nav("/settings-user")} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className={cn(
          "shrink-0 py-3 px-2",
          !isSidebarExpanded && "flex flex-col items-center gap-2"
        )}>
          {isSidebarExpanded ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 truncate">
                <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Online</p>
              </div>
              {mounted && (
                <AnimatedThemeToggler
                  variant="circle"
                  theme={theme as "light" | "dark"}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 flex items-center justify-center"
                />
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-accent shrink-0">
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-1.5 rounded-full bg-primary/10 text-primary" title={userName}>
                <UserIcon className="h-4 w-4" />
              </div>
              {mounted && (
                <AnimatedThemeToggler
                  variant="circle"
                  theme={theme as "light" | "dark"}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center shrink-0"
                />
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-accent">
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      {/*
       * This wrapper has padding on all sides (top, right, bottom).
       * The left padding = sidebar width (so the card starts after sidebar).
       * The top/bottom padding creates the "floating" gap.
       */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          /* Mobile: top padding for fixed header */
          "pt-14 lg:pt-3",
          /* Desktop: padding creates gap around floating card */
          "lg:pr-3 lg:pb-3",
          mainPl
        )}
      >
        {/*
         * THE FLOATING CARD
         * bg-background = white in light, dark in dark mode
         * rounded corners, fills the padded area, clips overflow
         */}
        <div className="flex-1 flex flex-col bg-background lg:rounded-2xl overflow-hidden lg:shadow-lg">

          {/* Card header — toggle + company selector + breadcrumb */}
          <header className="hidden lg:flex h-14 items-center gap-3 px-5 border-b border-border/10 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Bars3CenterLeftIcon className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              {!modulesLoading && hasModule("empresa") && <CompanySelector />}
              {!modulesLoading && !hasModule("empresa") && (
                <span className="font-bold text-sm text-foreground">Countifly</span>
              )}
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="min-h-full px-5 lg:px-6 py-5 pb-20 lg:pb-8 max-w-[1600px] mx-auto w-full">
              {children}
            </div>
          </main>

          <MobileBottomNav />
        </div>
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
