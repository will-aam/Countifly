"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export function DisplayNameSettings() {
  const { toast } = useToast();

  const [value, setValue] = useState("");
  const [initialValue, setInitialValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Carrega o displayName atual do usuário
  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.warn("Falha ao carregar /api/user/me para displayName");
          if (!isCancelled) {
            setValue("");
            setInitialValue("");
            setIsLoadingInitial(false);
          }
          return;
        }

        const data = await res.json();
        if (!isCancelled && data.success) {
          const name = (data.displayName as string | null | undefined) ?? "";
          setValue(name);
          setInitialValue(name);
        }
      } catch (err) {
        console.error("Erro ao carregar displayName:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingInitial(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  const hasChanges = value !== initialValue;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsLoading(true);
    try {
      const trimmed = value.trim();

      const res = await fetch("/api/user/display-name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmed.length > 0 ? trimmed : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível salvar o nome.");
      }

      const savedName = (data.displayName as string | null | undefined) ?? "";
      setInitialValue(savedName);
      setValue(savedName);

      toast({
        title: "Nome atualizado com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar nome.",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading && hasChanges) {
      handleSave();
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1.5 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
            Nome exibido
          </h2>
        </div>
        <p className="text-sm text-muted-foreground pl-9">
          Este nome aparecerá no menu lateral e em outras áreas da aplicação.
        </p>
      </div>

      {/* Campo de Nome */}
      <div className="space-y-1.5">
        <Label
          htmlFor="display-name"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Nome exibido
        </Label>
        <Input
          id="display-name"
          type="text"
          maxLength={100}
          placeholder="Ex: Loja Centro, Estoquista João..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isLoadingInitial}
          className="h-11 text-sm"
        />
      </div>

      {/* Rodapé */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          Você pode deixar em branco para usar o padrão "Menu do Usuário".
        </p>

        <Button
          size="default"
          onClick={handleSave}
          disabled={isLoading || isLoadingInitial || !hasChanges}
          className="w-full sm:w-auto h-10 px-8 shadow-sm"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            "Salvar nome"
          )}
        </Button>
      </div>
    </div>
  );
}
