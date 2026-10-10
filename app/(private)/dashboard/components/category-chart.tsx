// components/dashboard/category-chart.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronRight } from "lucide-react";

interface CategoryData {
  name: string;
  count: number;
}

interface CategoryChartProps {
  data: CategoryData[];
  className?: string;
}

const COLORS = [
  "from-blue-500 to-blue-600",
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-purple-500 to-purple-600",
  "from-sky-500 to-sky-600",
];

export function CategoryChart({ data, className }: CategoryChartProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const totalItems = data.reduce((acc, curr) => acc + curr.count, 0);
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const top5 = sortedData.slice(0, 5);
  const hasMore = sortedData.length > 5;

  const renderBar = (item: CategoryData, index: number) => {
    const percent =
      totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;
    const colorClass = COLORS[index % COLORS.length];

    return (
      <div key={item.name} className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-200 truncate pr-4 text-[13px]">
            {item.name}
          </span>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 py-0.5 px-2 rounded-full shrink-0">
            {percent}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r",
              colorClass
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const allBarsContent = (
    <ScrollArea className="h-[55vh] pr-3 mt-2">
      <div className="flex flex-col gap-5 py-1 pr-1">
        {sortedData.map((item, i) => renderBar(item, i))}
      </div>
    </ScrollArea>
  );

  const triggerButton = hasMore ? (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 rounded-full text-[11px] font-semibold text-blue-600 dark:text-blue-400 gap-1 px-2.5 hover:bg-blue-500/10"
    >
      Ver todas
      <ChevronRight className="h-3 w-3" />
    </Button>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col h-[340px]",
        "p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900/60",
        "border border-zinc-200/80 dark:border-zinc-800/60",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <img
            src="https://img.icons8.com/pulsar-color/48/database.png"
            alt="Categorias"
            width={28}
            height={28}
            loading="eager"
            decoding="async"
          />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              Categorias
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Divisão da base local
            </p>
          </div>
        </div>

        {/* Mobile: Drawer — Desktop: Dialog */}
        {hasMore &&
          (isDesktop ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>{triggerButton}</DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-900 dark:text-zinc-100 text-base font-bold">
                    Todas as Categorias
                  </DialogTitle>
                </DialogHeader>
                {allBarsContent}
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
              <DrawerContent className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 pb-8">
                <DrawerHeader className="px-0 pt-4 pb-3">
                  <DrawerTitle className="text-zinc-900 dark:text-zinc-100 text-base font-bold">
                    Todas as Categorias
                  </DrawerTitle>
                </DrawerHeader>
                {allBarsContent}
              </DrawerContent>
            </Drawer>
          ))}
      </div>

      {/* Lista Top 5 */}
      <div className="flex flex-col justify-center gap-4 flex-1">
        {top5.length > 0 ? (
          top5.map((item, i) => renderBar(item, i))
        ) : (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <span className="text-sm text-zinc-400 text-center">
              Nenhuma categoria mapeada.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
