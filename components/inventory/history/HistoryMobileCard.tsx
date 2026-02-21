// components/inventory/history/HistoryMobileCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  ClipboardList,
  Trash2,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Company {
  id: number;
  nomeFantasia: string;
}

interface HistoryMobileCardProps {
  item: {
    id: number;
    nome_arquivo: string;
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
      className={`border shadow-sm transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
    >
      <CardContent className="p-4">
        {/* Header: Ícone + Nome + Checkbox */}
        <div className="flex items-start gap-3 mb-3">
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          )}
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight mb-1 break-words">
              {item.nome_arquivo}
            </h3>
            <p className="text-xs text-muted-foreground">ID: {item.id}</p>
          </div>
        </div>

        {/* Empresa (se existir) */}
        {company && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-muted/50 rounded-md">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium truncate">
              {company.nomeFantasia}
            </span>
          </div>
        )}

        {/* Data e Hora */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(item.created_at)}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* Botão Download CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isDownloading}
              className="h-8 px-3 text-xs w-full sm:w-auto"
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1.5" />
              )}
              CSV
            </Button>

            {/* Botão Relatório */}
            <Button
              variant="default"
              size="sm"
              onClick={onViewReport}
              disabled={isRouting}
              className="h-8 px-3 text-xs w-full sm:w-auto"
            >
              {isRouting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <ClipboardList className="h-3 w-3 mr-1.5" />
              )}
              Relatório
            </Button>
            {/* Botão Excluir */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="h-8 px-3 text-xs w-full sm:w-auto"
            >
              {isRouting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1.5" />
              )}
              Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
