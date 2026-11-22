// app/(private)/dashboard/components/global-catalog-info-card.tsx
import { Database } from "lucide-react";

interface GlobalCatalogInfoCardProps {
  count: number;
  categoryCount: number;
  subcategoryCount: number;
  className?: string;
}

export function GlobalCatalogInfoCard({
  count,
  categoryCount,
  subcategoryCount,
  className,
}: GlobalCatalogInfoCardProps) {
  const rows = [
    { label: "Itens cadastrados", value: count.toLocaleString("pt-BR") },
    { label: "Categorias", value: categoryCount.toLocaleString("pt-BR") },
    { label: "Subcategorias", value: subcategoryCount.toLocaleString("pt-BR") },
  ];

  return (
    <div
      className={[
        "flex flex-col h-[340px]",
        "p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900/60",
        "border border-zinc-200/80 dark:border-zinc-800/60",
        "shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          Base Global Countifly
        </h3>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
        Catálogo de referência utilizado para enriquecimento automático de
        bipagens offline e classificação de produtos por categoria.
      </p>

      {/* Stats */}
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
          >
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {row.label}
            </span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-4 leading-relaxed">
        Base atualizada periodicamente pela equipe Countifly.
      </p>
    </div>
  );
}
