// components/shared/missing-items-modal.tsx
/**
 * Descrição: Modal para exibir a lista de itens faltantes na conferência.
 * Correção: Ajuste de layout Flexbox e ScrollArea para garantir a rolagem vertical.
 */

"use client";

import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay";
// --- Componentes de UI ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Ícones ---
import { PackageMinus } from "lucide-react";

// --- Interfaces e Tipos ---
interface MissingItem {
  codigo_de_barras: string;
  descricao: string;
  faltante: number;
}

interface MissingItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MissingItem[];
}

export function MissingItemsModal({
  isOpen,
  onClose,
  items,
}: MissingItemsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="p-6 pb-4 flex-row items-center space-y-0 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <PackageMinus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg">
              Itens Faltantes ({items.length})
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Conteúdo flexível com ScrollArea */}
        {/* min-h-0 é CRUCIAL para o scroll funcionar dentro de um flex-col */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          {items.length > 0 ? (
            <ScrollArea className="h-full w-full">
              <div className="p-6 space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-transparent hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-tight text-gray-900 dark:text-gray-100">
                        {item.descricao}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <BarcodeDisplay value={item.codigo_de_barras} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                        Faltam
                      </p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {item.faltante.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center space-y-3 p-6">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <PackageMinus className="h-6 w-6 text-green-600 dark:text-green-400 opacity-50" />
              </div>
              <p className="text-gray-500 text-sm font-medium">
                Tudo certo! Todos os itens foram contados.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
