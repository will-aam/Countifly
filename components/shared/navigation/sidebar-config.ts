import type React from "react";
import {
  CircleStackIcon as DatabaseIcon,
  UsersIcon,
  HomeIcon as HomeOutline,
  DocumentTextIcon as FileTextOutline,
  BuildingOfficeIcon as BuildingOutline,
  Cog6ToothIcon as SettingsOutline,
  ShieldCheckIcon as ShieldOutline,
  TagIcon,
  CloudArrowUpIcon,
  PuzzlePieceIcon as ApiIcon,
  Squares2X2Icon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeSolid,
  DocumentTextIcon as FileTextSolid,
  BuildingOfficeIcon as BuildingSolid,
  Cog6ToothIcon as SettingsSolid,
  ShieldCheckIcon as ShieldSolid,
  CircleStackIcon as DatabaseSolid,
  UsersIcon as UsersSolid,
  TagIcon as TagSolid,
  CloudArrowUpIcon as CloudArrowUpSolid,
  Squares2X2Icon as Squares2X2Solid,
  ComputerDesktopIcon as ComputerDesktopSolid,
} from "@heroicons/react/24/solid";

export type SidebarModuleKey =
  | "importacao"
  | "livre"
  | "sala"
  | "empresa"
  | "modular"
  | "api";

export interface SidebarNavItem {
  id: string;
  title: string;
  href: string;
  exactPath?: string;
  matchPrefixes?: string[];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  solidIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  module?: SidebarModuleKey;
  alwaysShowLocked?: boolean;
  adminOnly?: boolean;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
  badge?: string;
}

export interface SidebarSection {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "principal",
    label: "Principal",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/?forceDashboard=1",
        exactPath: "/",
        icon: HomeOutline,
        solidIcon: HomeSolid,
      },
    ],
  },
  {
    id: "conferencia",
    label: "Conferência & Confronto",
    items: [
      {
        id: "importacao",
        title: "Planilha ERP (CSV)",
        href: "/count-import",
        matchPrefixes: ["/count-import"],
        icon: CloudArrowUpIcon,
        solidIcon: CloudArrowUpSolid,
        module: "importacao",
      },
      {
        id: "sala",
        title: "Sessão em Equipe",
        href: "/team",
        matchPrefixes: ["/team"],
        icon: UsersIcon,
        solidIcon: UsersSolid,
        module: "sala",
      },
      {
        id: "api",
        title: "Integração API (ERP)",
        href: "/api-erp",
        matchPrefixes: ["/api-erp"],
        icon: ApiIcon,
        module: "api",
        alwaysShowLocked: true,
      },
    ],
  },
  {
    id: "levantamento",
    label: "Levantamento & Auditoria",
    items: [
      {
        id: "modular",
        title: "Contagem Modular",
        href: "/mixed-inventory",
        matchPrefixes: ["/mixed-inventory"],
        icon: Squares2X2Icon,
        solidIcon: Squares2X2Solid,
        module: "modular",
      },
      {
        id: "livre",
        title: "Contagem Livre (Avulsa)",
        href: "/audit",
        matchPrefixes: ["/audit"],
        icon: DatabaseIcon,
        solidIcon: DatabaseSolid,
        module: "livre",
      },
    ],
  },
  {
    id: "ferramentas",
    label: "Ferramentas",
    items: [
      {
        id: "labels",
        title: "Gerador de Etiquetas",
        href: "/internal-tools/labels",
        matchPrefixes: ["/internal-tools/labels"],
        icon: TagIcon,
        solidIcon: TagSolid,
        desktopOnly: true,
      },
    ],
  },
  {
    id: "gerenciamento",
    label: "Gerenciamento",
    items: [
      {
        id: "history",
        title: "Relatórios e Históricos",
        href: "/history",
        matchPrefixes: ["/history"],
        icon: FileTextOutline,
        solidIcon: FileTextSolid,
      },
      {
        id: "companies",
        title: "Empresas",
        href: "/settings-companies",
        matchPrefixes: ["/settings-companies"],
        icon: BuildingOutline,
        solidIcon: BuildingSolid,
        module: "empresa",
        alwaysShowLocked: true,
      },
      {
        id: "admin",
        title: "Admin",
        href: "/admin/users",
        matchPrefixes: ["/admin"],
        icon: ShieldOutline,
        solidIcon: ShieldSolid,
        adminOnly: true,
      },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    items: [
      {
        id: "settings",
        title: "Configurações",
        href: "/settings-user",
        matchPrefixes: ["/settings-user"],
        icon: SettingsOutline,
        solidIcon: SettingsSolid,
      },
    ],
  },
  {
    id: "desktop-app",
    label: "Aplicativo Desktop",
    items: [
      {
        id: "downloads",
        title: "Baixar para Windows",
        href: "/downloads",
        matchPrefixes: ["/downloads", "/download"],
        icon: ComputerDesktopIcon,
        solidIcon: ComputerDesktopSolid,
        badge: ".exe",
        desktopOnly: true,
      },
    ],
  },
];

export function isSidebarItemActive(
  item: SidebarNavItem,
  pathname: string | null,
): boolean {
  if (!pathname) return false;
  if (item.exactPath) {
    return pathname === item.exactPath;
  }
  if (item.matchPrefixes?.length) {
    return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
  }
  return pathname.startsWith(item.href.split("?")[0]);
}

export function getPageTitleByPath(pathname: string | null): string {
  if (!pathname) return "";
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/history")) return "Histórico";
  if (pathname.startsWith("/settings-companies")) return "Empresas";
  if (pathname.startsWith("/settings-user")) return "Configurações";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/count-import")) return "Planilha ERP (CSV)";
  if (pathname.startsWith("/audit")) return "Contagem Livre (Avulsa)";
  if (pathname.startsWith("/mixed-inventory")) return "Contagem Modular";
  if (pathname.startsWith("/api-erp")) return "Integração API (ERP)";
  if (pathname.startsWith("/team")) return "Sessão em Equipe";
  if (pathname.startsWith("/internal-tools/labels")) return "Etiquetas";
  if (pathname.startsWith("/downloads") || pathname.startsWith("/download")) {
    return "Download do App";
  }
  return "";
}
