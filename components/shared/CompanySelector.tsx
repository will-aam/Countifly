"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, Building2, Globe, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

    window.dispatchEvent(new Event("companyChanged"));
    setOpen(false);
  };

  const handleAddCompany = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    router.push("/settings-user?tab=companies");
  };

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
          <CommandInput
            placeholder="Buscar empresa..."
            className="border-none focus:ring-0"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>

            <div className="p-1">
              <CommandGroup heading="Contexto de Contagem">
                <CommandItem
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
                <button
                  onClick={handleAddCompany}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors p-1 -mr-1 rounded-md hover:bg-primary/10"
                  title="Nova Empresa"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Nova
                  </span>
                </button>
              </div>

              <CommandGroup>
                {companies.map((company) => {
                  const isSelected = selectedCompany?.id === company.id;
                  return (
                    <CommandItem
                      key={company.id}
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
