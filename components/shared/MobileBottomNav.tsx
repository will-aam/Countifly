"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Scan, Settings, Download, User, Home, Building2 } from "lucide-react";

type NavKey =
  | "scan"
  | "settings"
  | "export"
  | "import"
  | "config"
  | "profile"
  | "preferences"
  | "companies"; // ✅ Adicionado novas keys

type NavItem = {
  key: NavKey;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
};

function getMobileNavConfig(pathname: string): NavItem[] {
  const isAudit = pathname.startsWith("/audit");
  const isCountImport = pathname.startsWith("/count-import");
  const isSettingsUser = pathname.startsWith("/settings-user"); // ✅ Nova rota

  if (isAudit) {
    return [
      {
        key: "scan",
        label: "Conferir",
        icon: Scan as any,
        href: "/audit?tab=scan",
      },
      {
        key: "settings",
        label: "Configurar",
        icon: Settings as any,
        href: "/audit?tab=settings",
      },
      {
        key: "export",
        label: "Exportar",
        icon: Download as any,
        href: "/audit?tab=export",
      },
    ];
  }

  if (isCountImport) {
    return [
      {
        key: "scan",
        label: "Conferir",
        icon: Scan as any,
        href: "/count-import?tab=scan",
      },
      {
        key: "config",
        label: "Configurar",
        icon: Settings as any,
        href: "/count-import?tab=config",
      },
      {
        key: "export",
        label: "Exportar",
        icon: Download as any,
        href: "/count-import?tab=export",
      },
    ];
  }

  // ✅ NOVO: Menu para a página de configurações
  if (isSettingsUser) {
    return [
      {
        key: "profile",
        label: "Perfil",
        icon: User as any,
        href: "/settings-user?tab=profile",
      },
      {
        key: "preferences",
        label: "Preferências",
        icon: Home as any,
        href: "/settings-user?tab=preferences",
      },
      {
        key: "companies",
        label: "Empresas",
        icon: Building2 as any,
        href: "/settings-user?tab=companies",
      },
    ];
  }

  // Dashboard e outras rotas: sem nav inferior
  return [];
}

export function MobileBottomNav() {
  // ORDEM FIXA DE HOOKS – NUNCA MUDA:
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // NENHUM HOOK DEPOIS DISSO
  const items = getMobileNavConfig(pathname);

  if (!items.length) return null;

  // Calcula aba ativa SEM useMemo
  let activeKey: NavKey | "" = "";

  const tabParam = searchParams.get("tab");

  if (pathname.startsWith("/audit")) {
    if (
      tabParam === "scan" ||
      tabParam === "settings" ||
      tabParam === "export"
    ) {
      activeKey = tabParam as NavKey;
    } else {
      activeKey = "scan";
    }
  } else if (pathname.startsWith("/count-import")) {
    if (tabParam === "scan" || tabParam === "config" || tabParam === "export") {
      activeKey = tabParam as NavKey;
    } else {
      activeKey = "scan";
    }
  } else if (pathname.startsWith("/settings-user")) {
    // ✅ NOVO: Ativa a tab correta em configurações
    if (
      tabParam === "profile" ||
      tabParam === "preferences" ||
      tabParam === "companies"
    ) {
      activeKey = tabParam as NavKey;
    } else {
      activeKey = "profile";
    }
  }

  return (
    <div className="sm:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center justify-center gap-4 px-6 py-3 bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-full shadow-2xl border border-white/20 dark:border-white/10">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;

          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all",
                isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground hover:scale-105",
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
