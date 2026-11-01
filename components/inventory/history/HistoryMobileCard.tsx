// components/inventory/history/HistoryMobileCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getHistoryDisplayName } from "@/lib/history-display";

interface Company {
  id: number;
  nomeFantasia: string;
}

interface HistoryMobileCardProps {
  item: {
    id: number;
    nome_arquivo: string;
    tipo_contagem?: string | null;
    created_at: string;
    empresa_id?: number | null;
  };
  isSelected: boolean;
  onToggleSelection: () => void;
  onDownload: () => void;
  onViewReport: () => void;
  onDelete: () => void;
  isDownloading: boolean;
  isRouting: boolean;
  company?: Company | null;
}

export function HistoryMobileCard({
  item,
  isSelected,
  onToggleSelection,
  onDownload,
  onViewReport,
  onDelete,
  isDownloading,
  isRouting,
  company,
}: HistoryMobileCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  return (
    <Card
      onClick={(e) => {
        // Não alternar seleção se clicar nos botões
        if (e.target instanceof HTMLElement && e.target.closest("button")) {
          return;
        }
        onToggleSelection();
      }}
      className={`border-border/70 shadow-sm transition-colors cursor-pointer ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start gap-2">
          {isSelected && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-semibold leading-snug">
              {getHistoryDisplayName(item.nome_arquivo, item.tipo_contagem)}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(item.created_at)} <span className="px-1">·</span>
              {formatTime(item.created_at)}
            </p>
          </div>
        </div>

        {company && (
          <div className="mb-3">
            <span className="inline-flex max-w-full truncate rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {company.nomeFantasia}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading}
            className="h-9 min-w-0 px-2 text-xs"
          >
            {isDownloading && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin" />
            )}
            Baixar CSV
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onViewReport}
            disabled={isRouting}
            className="h-9 min-w-0 px-2 text-xs"
          >
            {isRouting && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin" />
            )}
            Relatório
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-9 min-w-0 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Excluir contagem"
          >
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
