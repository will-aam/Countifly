// components/shared/FloatingMissingItemsButton.tsx
/**
 * Descrição: Botão flutuante e arrastável para itens faltantes.
 * Responsabilidade: Exibir um botão em uma posição fixa na tela, que pode ser arrastado pelo usuário.
 * Mostra a contagem de itens faltantes e, ao ser clicado, aciona uma função para exibir mais detalhes.
 * Sua posição e camada de exibição (z-index) são ajustadas para não ser oculto por outros elementos da UI.
 * Atualização: Ajustado para interface imersiva com Safe Area.
 */

"use client";

// --- Bibliotecas Externas ---
import * as React from "react";
import { motion } from "framer-motion";

// --- Componentes de UI ---
import { Button } from "@/components/ui/button";

// --- Ícones e Utilitários ---
import { PackageMinus } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces e Tipos ---
/**
 * Props para o componente FloatingMissingItemsButton.
 */
interface FloatingMissingItemsButtonProps {
  onClick: () => void; // Função de callback chamada quando o botão é clicado.
  itemCount: number; // O número de itens faltantes a ser exibido no selo do botão.
  dragConstraintsRef: React.RefObject<HTMLDivElement>; // Referência ao elemento que define os limites da área de arrastar.
}

/**
 * Componente FloatingMissingItemsButton.
 * Renderiza um botão flutuante com base na contagem de itens faltantes.
 * O botão é arrastável dentro dos limites definidos por `dragConstraintsRef`.
 */
export function FloatingMissingItemsButton({
  onClick,
  itemCount,
  dragConstraintsRef,
}: FloatingMissingItemsButtonProps) {
  if (itemCount === 0) {
    return null;
  }

  return (
    <motion.div
      // Habilita a funcionalidade de arrastar no elemento.
      drag
      // Define o elemento pai como limite para o arraste.
      dragConstraints={dragConstraintsRef}
      // Desabilita a inércia após o arraste, fazendo o botão parar assim que o usuário o solta.
      dragMomentum={false}
      // Posicionamento e estilo do botão flutuante.
      // ALTERADO: bottom-24 -> bottom-[calc(6rem+env(safe-area-inset-bottom))]
      // 6rem é equivalente ao bottom-24 original
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 z-[60] cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    >
      <Button
        onClick={onClick}
        variant="outline"
        className={cn(
          "relative h-14 w-14 rounded-full border-white/80 shadow-lg ",
          "bg-blue-700 text-white",
          "hover:bg-blue-900 focus:ring-2 focus:ring-blue-900",
          "dark:bg-blue-600 dark:text-white dark:hover:bg-blue-900",
          "flex items-center justify-center",
        )}
        aria-label={`Mostrar ${itemCount} itens faltantes`}
      >
        <PackageMinus className="!h-8 !w-8" />
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {itemCount}
        </span>
      </Button>
    </motion.div>
  );
}
