// components/shared/save-count-modal.tsx
/**
 * Descrição: Modal para Salvar a Contagem de Inventário.
 * Melhorias:
 * 1. Sanitização do nome do arquivo (remove caracteres inválidos).
 * 2. Auto-foco no input ao abrir.
 * 3. Uso de onKeyDown (padrão moderno) em vez de onKeyPress.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";

interface SaveCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
  isLoading: boolean;
  userId?: number | null;
  companyId?: number | null;
}

export function SaveCountModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  userId,
  companyId,
}: SaveCountModalProps) {
  const [fileName, setFileName] = useState("contagem");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !userId || companyId == null) {
      setCompanyName(null);
      return;
    }
    let cancelled = false;
    fetch("/api/companies")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const company = data.success
          ? data.companies.find((item: any) => item.id === companyId)
          : null;
        setCompanyName(company?.nomeFantasia || `Empresa #${companyId}`);
      })
      .catch(() => {
        if (!cancelled) setCompanyName(`Empresa #${companyId}`);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, companyId]);

  // Resetar estado e focar no input quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setFileName("contagem");
      // Pequeno timeout para garantir que o Dialog terminou de renderizar a animação
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); // Seleciona o texto para substituição rápida
      }, 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (fileName.trim()) {
      onConfirm(fileName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  // Sanitização: Permite apenas letras, números, sublinhado, traço e espaço
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9-_\s]/g, "");
    setFileName(sanitized);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="w-[95vw] max-w-[425px] rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center">
            <Save className="mr-2 h-5 w-5" />
            Salvar Contagem
          </DialogTitle>
          <DialogDescription>
            Digite um nome para identificar este inventário.
            <br />
            <span className="text-xs text-muted-foreground">
              (A data atual será adicionada automaticamente ao final)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Contexto fixado nesta contagem</p>
            <p className="font-medium">
              {companyId == null ? "Sem vínculo" : companyName || `Empresa #${companyId}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirme a empresa antes de salvar. Para corrigir o contexto, limpe os dados desta contagem e inicie outra.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="filename">Nome do Arquivo</Label>
            <Input
              id="filename"
              ref={inputRef}
              value={fileName}
              onChange={handleChange}
              placeholder="Ex: loja_centro"
              disabled={isLoading}
              onKeyDown={handleKeyDown}
              maxLength={50} // Limite razoável para nome de arquivo
            />
            <p className="text-[10px] text-muted-foreground">
              Apenas letras, números e traços.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={!fileName.trim() || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Salvando..." : "Salvar Arquivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
