"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";

// --- HEROICONS (Outline) ---
import {
  UserIcon,
  ChevronDownIcon,
  MoonIcon,
  SunIcon,
  ArrowRightOnRectangleIcon as LogOutIcon,
  CircleStackIcon as DatabaseIcon,
  UsersIcon,
  PuzzlePieceIcon as PlugIcon,
  LockClosedIcon as LockIcon,
  Bars3Icon as MenuIcon,
  Cog6ToothIcon as SettingsIcon,
  HomeIcon as HomeOutline,
  DocumentTextIcon as FileTextOutline,
  BuildingOfficeIcon as BuildingOutline,
  Cog6ToothIcon as SettingsOutline,
  ShieldCheckIcon as ShieldOutline,
  WrenchScrewdriverIcon as ToolsIcon,
  TagIcon,
  QrCodeIcon,
  CalculatorIcon,
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
import { cn } from "@/lib/utils";

import { CompanySelector } from "@/components/shared/navigation/CompanySelector";
import { UserSidebarMenu } from "@/components/shared/navigation/UserSidebarMenu";

// Sub-component for sidebar items
const SidebarItem = ({
  icon: Icon,
  solidIcon: SolidIcon,
  title,
  isActive,
  onClick,
  locked,
  lockedText,
}: any) => {
  const IconToRender = isActive && SolidIcon ? SolidIcon : Icon;
  return (
    <button
      onClick={!locked ? onClick : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left border border-transparent",
        locked
          ? "opacity-60 cursor-not-allowed bg-muted/10 border-dashed border-border/50"
          : isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground hover:border-border/50"
      )}
    >
      <IconToRender
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          locked ? "text-muted-foreground/50" : isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <div className="flex-1 truncate">
        <span className={cn("text-sm", isActive ? "font-semibold" : "font-medium")}>
          {title}
        </span>
      </div>
      {locked && <LockIcon className="h-4 w-4 text-amber-500 shrink-0" />}
    </button>
  );
};

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string>("Carregando...");

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
    const fetchUserName = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();
        if (data.success && data.displayName) {
          setUserName(data.displayName);
        } else {
          setUserName("Usuário");
        }
      } catch (error) {
        setUserName("Usuário");
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await clearLocalDatabase();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  // Flags for active pages
  const isDashboardPage = pathname === "/";
  const isHistoryPage = pathname?.startsWith("/history");
  const isCompaniesPage = pathname?.startsWith("/settings-companies");
  const isSettingsPage = pathname?.startsWith("/settings-user");
  const isAdminPage = pathname?.startsWith("/admin");
  const isCountImportPage = pathname?.startsWith("/count-import");
  const isCountFreePage = pathname?.startsWith("/audit");
  const isTeamPage = pathname?.startsWith("/team");
  const isLabelsPage = pathname?.startsWith("/internal-tools/labels");

  return (
    <>
      {/* MOBILE HEADER (Oculto no Desktop) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-between bg-background/95 backdrop-blur-md px-4 border-b border-border/40 transition-all sm:px-6">
        <div className="flex items-center gap-3 relative z-10 w-full max-w-[70vw]">
          {modulesLoading ? (
            <span className="animate-pulse text-xl font-extrabold leading-none tracking-tight text-foreground opacity-50">
              Countifly
            </span>
          ) : hasModule("empresa") ? (
            <div className="flex items-center h-6 w-full">
              <CompanySelector />
            </div>
          ) : (
            <span className="text-xl font-extrabold leading-none tracking-tight text-foreground">
              Countifly
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileMenuOpen(true)}
            aria-label="Abrir menu do usuário"
          >
            <MenuIcon className="h-7 w-7" />
          </Button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR (Oculto no Mobile) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border/40 transition-all shadow-sm">
        {/* Header / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border/40 shrink-0">
          {modulesLoading ? (
             <span className="animate-pulse text-xl font-extrabold tracking-tight text-foreground opacity-50">
               Countifly
             </span>
           ) : hasModule("empresa") ? (
             <div className="w-full">
               <CompanySelector />
             </div>
           ) : (
             <span className="text-xl font-extrabold tracking-tight text-foreground">
               Countifly
             </span>
           )}
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
          {!modulesLoading && (
            <>
              {/* Principal */}
              <div className="space-y-1">
                <p className="px-3 pb-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Principal
                </p>
                <SidebarItem
                  icon={HomeOutline}
                  solidIcon={HomeSolid}
                  title="Dashboard"
                  isActive={isDashboardPage}
                  onClick={() => navigateTo("/?forceDashboard=1")}
                />
              </div>

              {/* Contagens */}
              <div className="space-y-1">
                <p className="px-3 pb-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Contagens
                </p>
                {hasModule("importacao") ? (
                  <SidebarItem
                    icon={SettingsIcon}
                    title="Por Importação"
                    isActive={isCountImportPage}
                    onClick={() => navigateTo("/count-import")}
                  />
                ) : isModuleLocked("importacao") ? (
                  <SidebarItem
                    locked
                    icon={SettingsIcon}
                    title="Por Importação"
                    lockedText="Contato p/ desbloquear"
                  />
                ) : null}

                {hasModule("livre") ? (
                  <SidebarItem
                    icon={DatabaseIcon}
                    title="Contagem Livre"
                    isActive={isCountFreePage}
                    onClick={() => navigateTo("/audit")}
                  />
                ) : isModuleLocked("livre") ? (
                  <SidebarItem
                    locked
                    icon={DatabaseIcon}
                    title="Contagem Livre"
                    lockedText="Contato p/ desbloquear"
                  />
                ) : null}

                {hasModule("sala") ? (
                  <SidebarItem
                    icon={UsersIcon}
                    title="Gerenciar Sala"
                    isActive={isTeamPage}
                    onClick={() => navigateTo("/team")}
                  />
                ) : isModuleLocked("sala") ? (
                  <SidebarItem
                    locked
                    icon={UsersIcon}
                    title="Gerenciar Sala"
                    lockedText="Contato p/ desbloquear"
                  />
                ) : null}

                <SidebarItem
                  locked
                  icon={PlugIcon}
                  title="API (Integração)"
                  lockedText="Em desenvolvimento"
                />
              </div>

              {/* Ferramentas */}
              <div className="space-y-1">
                <p className="px-3 pb-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Ferramentas
                </p>
                <SidebarItem
                  icon={TagIcon}
                  title="Etiquetas"
                  isActive={isLabelsPage}
                  onClick={() => navigateTo("/internal-tools/labels")}
                />
                <SidebarItem
                  locked
                  icon={QrCodeIcon}
                  title="Leitor de Código"
                  lockedText="Em desenvolvimento"
                />
                <SidebarItem
                  locked
                  icon={CalculatorIcon}
                  title="Calc. de Margem"
                  lockedText="Em desenvolvimento"
                />
              </div>

              {/* Gerenciamento */}
              <div className="space-y-1">
                <p className="px-3 pb-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Gerenciamento
                </p>
                <SidebarItem
                  icon={FileTextOutline}
                  solidIcon={FileTextSolid}
                  title="Histórico"
                  isActive={isHistoryPage}
                  onClick={() => navigateTo("/history")}
                />
                
                {hasModule("empresa") ? (
                  <SidebarItem
                    icon={BuildingOutline}
                    solidIcon={BuildingSolid}
                    title="Empresas"
                    isActive={isCompaniesPage}
                    onClick={() => navigateTo("/settings-companies")}
                  />
                ) : (
                  <SidebarItem
                    locked
                    icon={BuildingOutline}
                    title="Empresas"
                    lockedText="Módulo indisponível"
                  />
                )}
                
                {isAdmin && (
                  <SidebarItem
                    icon={ShieldOutline}
                    solidIcon={ShieldSolid}
                    title="Admin"
                    isActive={isAdminPage}
                    onClick={() => navigateTo("/admin/users")}
                  />
                )}
              </div>

              {/* Ajustes */}
              <div className="space-y-1">
                <p className="px-3 pb-2 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Ajustes
                </p>
                <SidebarItem
                  icon={SettingsOutline}
                  solidIcon={SettingsSolid}
                  title="Configurações"
                  isActive={isSettingsPage}
                  onClick={() => navigateTo("/settings-user")}
                />
              </div>
            </>
          )}
        </nav>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-border/40 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="p-2 rounded-full bg-primary/10 text-primary ring-2 ring-background shadow-sm">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 truncate">
              <p className="font-medium text-sm text-foreground truncate">
                {userName}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Online
              </p>
            </div>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              >
                {theme === "dark" ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOutIcon className="mr-2 h-5 w-5" />
            <span className="font-medium">Sair da Conta</span>
          </Button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR (Drawer) */}
      <UserSidebarMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        installPrompt={installPrompt}
      />
    </>
  );
}

