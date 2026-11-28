"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

import {
  UserIcon,
  ArrowRightOnRectangleIcon as LogOutIcon,
  Cog6ToothIcon as SettingsOutline,
  Bars3CenterLeftIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { useUserModules } from "@/hooks/useUserModules";
import { clearLocalDatabase } from "@/lib/db";
import { CompanySelector } from "@/components/shared/navigation/CompanySelector";
import { UserSidebarMenu } from "@/components/shared/navigation/UserSidebarMenu";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { CommandSearch } from "@/components/shared/navigation/CommandSearch";
import { SidebarNavContent } from "@/components/shared/navigation/SidebarNavContent";
import { getPageTitleByPath } from "@/components/shared/navigation/sidebar-config";

// ─── AppShell ─────────────────────────────────────────────────────────────────
export function AppShell({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, systemTheme } = useTheme();
  const activeTheme = theme === "system" ? systemTheme : theme;

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string>("");

  const {
    isAdmin,
    hasModule,
    isModuleLocked,
    loading: modulesLoading,
  } = useUserModules();

  useEffect(() => {
    setMounted(true);
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) =>
        setUserName(d.success && d.displayName ? d.displayName : "Usuário"),
      )
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
  const isSettings = pathname?.startsWith("/settings-user");
  const currentTitle = getPageTitleByPath(pathname);

  const sidebarW = isSidebarExpanded ? "w-60" : "w-[60px]";
  const mainPl = isSidebarExpanded ? "lg:pl-60" : "lg:pl-[60px]";

  const isReportPage =
    Boolean(pathname?.includes("/report")) ||
    Boolean(pathname?.includes("/modular-report")) ||
    Boolean(pathname?.includes("/database-report"));

  // Páginas de montagem e impressão de relatório ocupam 100% da tela (sem sidebar ou topbar externa)
  if (isReportPage) {
    return (
      <div className="h-screen w-full overflow-hidden bg-background print:overflow-visible print:h-auto print:block">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eef1f6] dark:bg-[#0d0f14] print:bg-white print:text-black print:overflow-visible print:h-auto print:block">
      {/* ── MOBILE FLOATING TOP BAR ──────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 px-3 pt-2.5 pb-1 pointer-events-none print:hidden">
        <div className="pointer-events-auto flex h-14 items-center justify-between gap-2 px-2.5 rounded-2xl bg-background/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/50 shadow-sm">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {modulesLoading ? (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/20 animate-pulse shrink-0" />
                <span className="animate-pulse font-bold text-sm tracking-tight opacity-40">
                  Countifly
                </span>
              </div>
            ) : hasModule("empresa") ? (
              <CompanySelector userId={userId} compact />
            ) : (
              <button
                type="button"
                onClick={() => nav("/?forceDashboard=1")}
                className="flex items-center gap-2.5 min-w-0 text-left"
              >
                <img
                  src="/Icone_Arredondado_Azul_Branco.png"
                  alt="Countifly"
                  className="h-9 w-9 rounded-xl object-cover shrink-0 shadow-2xs"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-sm tracking-tight text-foreground truncate">
                    Countifly
                  </span>
                  {currentTitle && !isDashboard && (
                    <span className="text-xs text-muted-foreground truncate">
                      · {currentTitle}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => nav("/settings-user")}
              aria-label="Configurações"
              title="Configurações"
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                isSettings
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/60 hover:bg-muted text-foreground/80",
              )}
            >
              <SettingsOutline className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(true)}
              aria-label="Menu e Perfil"
              title="Menu e Perfil"
              className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 flex items-center justify-center transition-colors"
            >
              <UserIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      {/* Sidebar shares the same root background — they blend seamlessly */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 print:hidden",
          "transition-all duration-300 ease-in-out",
          sidebarW,
        )}
      >
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2 pt-4 pb-4">
          {!modulesLoading && (
            <SidebarNavContent
              variant="desktop"
              isExpanded={isSidebarExpanded}
              isAdmin={isAdmin}
              hasModule={hasModule}
              isModuleLocked={isModuleLocked}
            />
          )}
        </nav>

        {/* User footer */}
        <div
          className={cn(
            "shrink-0 py-3 px-2",
            !isSidebarExpanded && "flex flex-col items-center gap-2",
          )}
        >
          {isSidebarExpanded ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 truncate">
                <p className="text-[13px] font-semibold text-foreground truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
                </p>
              </div>
              {mounted && (
                <AnimatedThemeToggler
                  variant="circle"
                  theme={activeTheme as "light" | "dark"}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 flex items-center justify-center"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-accent shrink-0"
              >
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div
                className="p-1.5 rounded-full bg-primary/10 text-primary"
                title={userName}
              >
                <UserIcon className="h-4 w-4" />
              </div>
              {mounted && (
                <AnimatedThemeToggler
                  variant="circle"
                  theme={activeTheme as "light" | "dark"}
                  onThemeChange={(newTheme) => setTheme(newTheme)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center shrink-0"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-accent"
              >
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
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          /* Mobile: top padding for floating pill header */
          "pt-[74px] lg:pt-3 print:pt-0",
          /* Desktop: padding creates gap around floating card */
          "lg:pr-3 lg:pb-3 print:p-0",
          mainPl,
          "print:pl-0",
        )}
      >
        {/*
         * THE FLOATING CARD
         * bg-background = white in light, dark in dark mode
         * rounded corners, fills the padded area, clips overflow
         */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f4f6f9] dark:bg-[#0d0f14] lg:bg-background lg:dark:bg-background lg:rounded-2xl overflow-hidden lg:shadow-lg print:rounded-none print:shadow-none print:overflow-visible">
          {/* Card header — toggle + company selector + search bar */}
          <header className="hidden lg:flex h-14 items-center justify-between gap-4 px-5 border-b border-border/10 shrink-0 print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                className="h-10 w-10 text-muted-foreground hover:text-foreground shrink-0 [&_svg]:size-6"
              >
                <Bars3CenterLeftIcon className="h-6 w-6" />
              </Button>

              {!modulesLoading && hasModule("empresa") && (
                <CompanySelector userId={userId} />
              )}
              {!modulesLoading && !hasModule("empresa") && (
                <span className="font-bold text-sm text-foreground">
                  Countifly
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <CommandSearch />
            </div>
          </header>

          {/* Scrollable page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
            <div className="min-h-full px-5 lg:px-6 py-5 pb-20 lg:pb-8 max-w-[1600px] mx-auto w-full print:p-0 print:m-0 print:max-w-none">
              {children}
            </div>
          </main>

          <div className="print:hidden">
            <MobileBottomNav />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
        userName={userName}
        isAdmin={isAdmin}
        modulesLoading={modulesLoading}
        hasModule={hasModule}
        isModuleLocked={isModuleLocked}
        onLogout={handleLogout}
      />
    </div>
  );
}
