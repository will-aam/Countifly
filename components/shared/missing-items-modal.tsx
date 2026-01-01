"use client";

import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay";
// --- Componentes de UI ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden outline-none shadow-2xl p-0">
        {" "}
        {/* Cabeçalho com fundo sutil, sem gradiente */}
        <DialogHeader className="p-6 pb-4 flex flex-row items-center space-y-0 border-b shrink-0">
          <div className="flex items-center gap-3">
            {/* Ícone com fundo sólido e sombra sutil */}
            {/* <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20 shadow-sm">
              <PackageMinus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div> */}
            <DialogTitle className="text-xl font-semibold text-foreground">
              Itens Faltantes ({items.length})
            </DialogTitle>
          </div>
        </DialogHeader>
        {/* Área de Conteúdo com fundo sólido e mais espaçamento interno */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {items.length > 0 ? (
            // Lista de itens com espaçamento apenas entre eles
            <div className="space-y-3">
              {items.map((item, index) => (
                // Cartão de item mantendo o efeito hover e a sombra para profundidade
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="space-y-1.5 flex-1">
                    {/* A ÚNICA MUDANÇA ESTÁ ABAIXO: Adicionada a classe "line-clamp-2" */}
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                      {item.descricao}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <BarcodeDisplay value={item.codigo_de_barras} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">
                      Faltam
                    </p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {item.faltante.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Estado vazio mais limpo e espaçoso
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-4 p-8 m-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <PackageMinus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-base font-medium">
                  Tudo certo!
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Todos os itens foram contados.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
