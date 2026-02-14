// components/shared/BarcodeDisplay.tsx
"use client";

import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeDisplayProps {
  value: string | null | undefined;
  className?: string;
}

export function BarcodeDisplay({ value, className }: BarcodeDisplayProps) {
  // Se não tiver código, mostra um traço
  if (!value || value === "N/A")
    return <span className="text-muted-foreground">-</span>;

  const handleSearch = (e: React.MouseEvent) => {
    // Evita que o clique propague para o card pai (ex: selecionar a linha)
    e.stopPropagation();

    // Abre a pesquisa de imagens do Google em nova aba
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
      value,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 group", className)}
      // Permite clicar na área toda se for touch, ou usa o botão específico
      onClick={handleSearch}
    >
      {/* Texto do Código */}
      <span
        className="font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-b border-dotted border-muted-foreground/50"
        title="Toque para ver a imagem"
      >
        {value}
      </span>

      {/* Ícone de Imagem (Visual Indicator) */}
      {/* <button
        type="button"
        className="p-0.5 rounded-sm text-muted-foreground/70 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
        aria-label="Ver imagem do produto"
      >
        <ImageIcon className="h-3 w-3" />
      </button> */}
    </div>
  );
}
