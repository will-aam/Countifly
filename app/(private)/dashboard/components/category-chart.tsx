// components/dashboard/category-chart.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryData {
  name: string;
  count: number;
}

interface CategoryChartProps {
  data: CategoryData[];
  className?: string;
}

export function CategoryChart({ data, className }: CategoryChartProps) {
  // Soma o total para podermos calcular a porcentagem de cada categoria
  const totalItems = data.reduce((acc, curr) => acc + curr.count, 0);

  // Ordena para que as categorias mais cheias fiquem no topo
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Corta apenas o Top 5 para exibir no painel principal
  const top5 = sortedData.slice(0, 5);
  const hasMore = sortedData.length > 5;

  // Função isolada para desenhar a linha de cada categoria, reutilizada tanto no Top 5 quanto na Modal.
  const renderBar = (item: CategoryData) => {
    const percent =
      totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;

    return (
      <div key={item.name} className="flex flex-col gap-2">
        <div className="flex justify-between items-end text-sm">
          <span className="font-semibold text-zinc-700 dark:text-zinc-200 truncate pr-4">
            {item.name}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400 font-bold text-xs bg-blue-500/10 dark:bg-blue-500/20 py-0.5 px-2 rounded-full">
            {percent}%
          </span>
        </div>
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "py-6 px-0 bg-transparent border-none shadow-none",
        "md:p-6 md:rounded-2xl md:shadow-sm md:backdrop-blur-md",
        "md:bg-blue-950/5 dark:md:bg-blue-950/40",
        "md:border md:border-blue-900/10 dark:md:border-blue-800/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-8 px-4 md:px-0">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Categorias
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Divisão da base local.
            </p>
          </div>
        </div>

        {/* Modal */}
        {hasMore && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
              >
                Ver todas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                  Todas as Categorias
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] max-h-[400px] pr-4 mt-4">
                <div className="flex flex-col gap-6 py-2">
                  {sortedData.map(renderBar)}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista Principal (Top 5) */}
      <div className="flex flex-col justify-center gap-6 flex-1 px-4 md:px-0">
        {top5.length > 0 ? (
          top5.map(renderBar)
        ) : (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 min-h-[150px]">
            <span className="text-sm text-zinc-400 text-center">
              Nenhuma categoria mapeada.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
