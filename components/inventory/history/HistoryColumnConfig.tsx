// components/inventory/history/HistoryColumnConfig.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  ColumnConfig,
  ColumnKey,
} from "@/hooks/inventory/useHistoryColumns"; // ✅ Importar ColumnKey

interface HistoryColumnConfigProps {
  columns: ColumnConfig[];
  toggleColumn: (key: ColumnKey) => void; // ✅ Usar ColumnKey em vez de string
  resetColumns: () => void;
}

export function HistoryColumnConfig({
  columns,
  toggleColumn,
  resetColumns,
}: HistoryColumnConfigProps) {
  const hiddenCount = columns.filter(
    (col) => !col.visible && !col.required,
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Colunas</span>
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {hiddenCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Colunas Visíveis</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={column.visible}
            onCheckedChange={() => toggleColumn(column.key)}
            disabled={column.required}
            className={column.required ? "opacity-50 cursor-not-allowed" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <span>{column.label}</span>
              {column.required && (
                <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                  Obrigatória
                </Badge>
              )}
            </div>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <Button
          variant="ghost"
          size="sm"
          onClick={resetColumns}
          className="w-full justify-start gap-2 text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar padrão
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
