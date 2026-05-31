// components/inventory/ImportErrorList.tsx
/**
 * Componente reutilizável para exibir erros de importação CSV.
 * Usado em:
 * - ImportTab.tsx (Importação Individual)
 * - ManagerSessionDashboard.tsx (Importação de Sessão)
 */

import React from "react";
import { AlertCircle, Download, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// ✅ TIPOS
export interface ImportError {
  row: number;
  reasons: string[];
  data?: {
    codigo_de_barras?: string;
    codigo_produto?: string;
    descricao?: string;
    saldo_estoque?: string;
  };
}

export interface ImportConflict {
  row: number;
  message: string;
  codigo_produto?: string;
  barcode?: string;
}

interface ImportErrorListProps {
  errors: ImportError[];
  conflicts: ImportConflict[];
  onClose?: () => void;
  onDownloadReport?: () => void;
}

export function ImportErrorList({
  errors,
  conflicts,
  onClose,
  onDownloadReport,
}: ImportErrorListProps) {
  const totalIssues = errors.length + conflicts.length;

  if (totalIssues === 0) return null;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Problemas na Importação
            </CardTitle>
            <CardDescription>
              {errors.length > 0 && (
                <span className="text-destructive font-medium">
                  {errors.length} erro{errors.length !== 1 ? "s" : ""}
                </span>
              )}
              {errors.length > 0 && conflicts.length > 0 && " · "}
              {conflicts.length > 0 && (
                <span className="text-amber-600 font-medium">
                  {conflicts.length} conflito{conflicts.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão de Download (se fornecido) */}
        {onDownloadReport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar Relatório de Erros (CSV)
          </Button>
        )}

        {/* Lista de Erros */}
        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-3">
            {/* Erros de Validação */}
            {errors.map((error, idx) => (
              <div
                key={`error-${idx}`}
                className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="destructive" className="mt-0.5">
                    Linha {error.row}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-destructive">
                      Erro de Validação
                    </div>
                    <ul className="text-sm space-y-1">
                      {error.reasons.map((reason, rIdx) => (
                        <li key={rIdx} className="text-muted-foreground">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                    {error.data && (
                      <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                        {error.data.codigo_produto && (
                          <div>Código: {error.data.codigo_produto}</div>
                        )}
                        {error.data.codigo_de_barras && (
                          <div>Barras: {error.data.codigo_de_barras}</div>
                        )}
                        {error.data.descricao && (
                          <div>
                            Desc:{" "}
                            {error.data.descricao.length > 50
                              ? error.data.descricao.substring(0, 50) + "..."
                              : error.data.descricao}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Conflitos (Duplicados) */}
            {conflicts.map((conflict, idx) => (
              <div
                key={`conflict-${idx}`}
                className="rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className="mt-0.5 border-amber-500 text-amber-700 dark:text-amber-400"
                  >
                    Linha {conflict.row}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Conflito (Ignorado)
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {conflict.message}
                    </p>
                    {(conflict.codigo_produto || conflict.barcode) && (
                      <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                        {conflict.codigo_produto && (
                          <div>Código: {conflict.codigo_produto}</div>
                        )}
                        {conflict.barcode && (
                          <div>Barras: {conflict.barcode}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Resumo */}
        <div className="text-sm text-muted-foreground">
          <strong>Dica:</strong> Corrija os erros no arquivo CSV e reimporte
          apenas as linhas com problema.
        </div>
      </CardContent>
    </Card>
  );
}
