// components/shared/CompanySelector.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Building2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function CompanySelector() {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (data.success) {
          setCompanies(data.companies.filter((c: any) => c.ativo));

          // Recupera a empresa salva no localStorage
          const savedId = localStorage.getItem("countifly_selected_company_id");
          if (savedId) {
            const company = data.companies.find(
              (c: any) => c.id === Number(savedId),
            );
            if (company) setSelectedCompany(company);
          }
        }
      } catch (error) {
        console.error("Erro ao carrerar empresas no seletor:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const handleSelect = (company: Company | null) => {
    setSelectedCompany(company);
    if (company) {
      localStorage.setItem(
        "countifly_selected_company_id",
        company.id.toString(),
      );
    } else {
      localStorage.removeItem("countifly_selected_company_id");
    }

    // Dispara evento global para outros componentes/hooks saberem da mudança
    window.dispatchEvent(new Event("companyChanged"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-all outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 group bg-transparent border-none select-none">
          {" "}
          <div className="flex flex-col items-start">
            <span className="text-xl font-extrabold tracking-tight text-foreground leading-none">
              Countifly
            </span>
            {selectedCompany && (
              <span className="text-[10px] font-medium text-blue-500 animate-in fade-in slide-in-from-left-1">
                ▪︎ {selectedCompany.nomeFantasia}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:text-foreground",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[250px] p-0 shadow-2xl border-border/40"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup heading="Contexto de Contagem">
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>Sem vínculo</span>
                </div>
                {!selectedCompany && <Check className="h-4 w-4 text-primary" />}
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Suas Empresas">
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  onSelect={() => handleSelect(company)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[160px]">
                      {company.nomeFantasia}
                    </span>
                  </div>
                  {selectedCompany?.id === company.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
