"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUserModules } from "@/hooks/useUserModules";
import { clearLocalDatabase } from "@/lib/db";
import { cn } from "@/lib/utils";

interface CommandSearchProps {
  className?: string;
}

export function CommandSearch({ className }: CommandSearchProps) {
  const router = useRouter();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { hasModule, isAdmin, loading: modulesLoading } = useUserModules();

  const [open, setOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
    }

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const handleLogout = async () => {
    try {
      await clearLocalDatabase();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const toggleTheme = () => {
    const current = resolvedTheme || theme;
    setTheme(current === "dark" ? "light" : "dark");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden lg:flex relative items-center gap-2 w-full max-w-[280px] sm:max-w-xs md:max-w-sm h-9 px-3 rounded-xl border border-input/80 bg-muted/30 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-all shadow-2xs cursor-pointer select-none",
          className
        )}
        title="Buscar páginas e recursos (Ctrl + K)"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate font-normal">
          Buscar página ou ação...
        </span>
        <KbdGroup className="inline-flex shrink-0">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite para buscar página ou ação..." />
        <CommandList>
          <CommandEmpty>Nenhuma página ou ação encontrada.</CommandEmpty>

          <CommandGroup heading="Navegação Principal">
            <CommandItem
              onSelect={() => handleSelect(() => router.push("/?forceDashboard=1"))}
            >
              <span>Dashboard</span>
            </CommandItem>

            {(!modulesLoading && hasModule("importacao")) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/count-import"))}
              >
                <span>Planilha ERP (CSV)</span>
              </CommandItem>
            )}

            {(!modulesLoading && hasModule("modular")) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/mixed-inventory"))}
              >
                <span>Contagem Modular</span>
              </CommandItem>
            )}

            {(!modulesLoading && hasModule("sala")) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/team"))}
              >
                <span>Sessão em Equipe</span>
              </CommandItem>
            )}

            {(!modulesLoading && hasModule("livre")) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/audit"))}
              >
                <span>Contagem Livre (Avulsa)</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Ferramentas & Relatórios">
            <CommandItem
              onSelect={() => handleSelect(() => router.push("/internal-tools/labels"))}
            >
              <span>Gerador de Etiquetas</span>
            </CommandItem>

            <CommandItem
              onSelect={() => handleSelect(() => router.push("/history"))}
            >
              <span>Relatórios e Históricos</span>
            </CommandItem>

            {(!modulesLoading && hasModule("empresa")) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/settings-companies"))}
              >
                <span>Gestão de Empresas</span>
              </CommandItem>
            )}

            <CommandItem
              onSelect={() => handleSelect(() => router.push("/downloads"))}
            >
              <span>Baixar App Desktop (.exe)</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Ajustes & Ações Rápidas">
            <CommandItem
              onSelect={() => handleSelect(() => router.push("/settings-user"))}
            >
              <span>Configurações da Conta</span>
            </CommandItem>

            {(!modulesLoading && isAdmin) && (
              <CommandItem
                onSelect={() => handleSelect(() => router.push("/admin/users"))}
              >
                <span>Painel de Administração</span>
              </CommandItem>
            )}

            <CommandItem onSelect={() => handleSelect(toggleTheme)}>
              <span>Alternar Tema Claro / Escuro</span>
            </CommandItem>

            <CommandItem onSelect={() => handleSelect(handleLogout)}>
              <span>Sair da Conta</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
