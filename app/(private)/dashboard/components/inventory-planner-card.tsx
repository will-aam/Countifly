"use client";

// app/(private)/dashboard/components/inventory-planner-card.tsx
import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowRight, Check, Undo2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CountedItemData } from "@/lib/dashboard-counted-categories";

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemType = "categoria" | "subcategoria";
type ItemStatus = "pending" | "today" | "done";
type Cycle = "week" | "month";

interface PlannerItem {
  id: string;
  name: string;
  type: ItemType;
  status: ItemStatus;
  addedAt: string; // ISO
  doneAt?: string; // ISO
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `countifly:planner:${userId}`;
}

function loadItems(userId: string): PlannerItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as PlannerItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(userId: string, items: PlannerItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
}

function cycleStart(cycle: Cycle): Date {
  const now = new Date();
  if (cycle === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

function inCurrentCycle(isoDate: string | undefined, cycle: Cycle): boolean {
  if (!isoDate) return false;
  return new Date(isoDate) >= cycleStart(cycle);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ItemType }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
        type === "categoria"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      )}
    >
      {type === "categoria" ? "Cat" : "Sub"}
    </span>
  );
}

interface ItemChipProps {
  item: PlannerItem;
  onMoveToday?: () => void;
  onMoveDone?: () => void;
  onMovePending?: () => void;
  onRemove?: () => void;
}

function ItemChip({
  item,
  onMoveToday,
  onMoveDone,
  onMovePending,
  onRemove,
}: ItemChipProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
        "bg-white dark:bg-zinc-900",
        "border-zinc-200/80 dark:border-zinc-800",
        "hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      )}
    >
      <TypeBadge type={item.type} />
      <span className="flex-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
        {item.name}
      </span>

      {/* Actions — appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onMoveToday && (
          <button
            onClick={onMoveToday}
            title="Mover para Hoje"
            className="p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {onMoveDone && (
          <button
            onClick={onMoveDone}
            title="Marcar como Contado"
            className="p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {onMovePending && (
          <button
            onClick={onMovePending}
            title="Voltar para A Contar"
            className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            title="Remover"
            className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-300 hover:text-red-500 transition-colors ml-0.5"
          >
            <span className="text-[10px] leading-none">✕</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  accent?: string;
  count: number;
  children: React.ReactNode;
  emptyMessage?: string;
}

function Column({ title, accent, count, children, emptyMessage }: ColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 mb-3 px-1")}>
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            accent ?? "text-zinc-500 dark:text-zinc-400"
          )}
        >
          {title}
        </span>
        {count > 0 && (
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-1.5 py-0.5 tabular-nums">
            {count}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] pr-0.5">
        {count === 0 ? (
          <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
            <span className="text-xs text-zinc-400 dark:text-zinc-600 text-center px-3">
              {emptyMessage ?? "Vazio"}
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── Add Item Dialog ─────────────────────────────────────────────────────────

interface AddItemDialogProps {
  categories: string[];
  subcategories: string[];
  onAdd: (name: string, type: ItemType) => void;
}

function AddItemDialog({ categories, subcategories, onAdd }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemType>("categoria");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const options = type === "categoria" ? categories : subcategories;
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  function handleAdd() {
    if (!selected) return;
    onAdd(selected, type);
    setOpen(false);
    setSearch("");
    setSelected("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs font-semibold border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Adicionar ao planejador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Type selector */}
          <div className="flex gap-2">
            {(["categoria", "subcategoria"] as ItemType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setSelected("");
                  setSearch("");
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                  type === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                )}
              >
                {t === "categoria" ? "Categoria" : "Subcategoria"}
              </button>
            ))}
          </div>

          {/* Search */}
          <Input
            placeholder={`Buscar ${type}...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected("");
            }}
            className="h-8 text-xs"
          />

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                Nenhuma opção encontrada.
              </div>
            ) : (
              filtered.slice(0, 60).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSelected(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    selected === opt
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  {opt}
                </button>
              ))
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              size="sm"
              className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selected}
              onClick={handleAdd}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InventoryPlannerCardProps {
  userId: string;
  countedCategoriesData: CountedItemData[];
  categories?: string[];
  subcategories?: string[];
}

export function InventoryPlannerCard({
  userId,
  categories = [],
  subcategories = [],
}: InventoryPlannerCardProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [cycle, setCycle] = useState<Cycle>("week");

  useEffect(() => {
    setMounted(true);
    setItems(loadItems(userId));
  }, [userId]);

  const persist = useCallback(
    (next: PlannerItem[]) => {
      setItems(next);
      saveItems(userId, next);
    },
    [userId]
  );

  function addItem(name: string, type: ItemType) {
    const newItem: PlannerItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      type,
      status: "pending",
      addedAt: new Date().toISOString(),
    };
    persist([...items, newItem]);
  }

  function move(id: string, status: ItemStatus) {
    persist(
      items.map((it) =>
        it.id === id
          ? {
              ...it,
              status,
              doneAt: status === "done" ? new Date().toISOString() : undefined,
            }
          : it
      )
    );
  }

  function remove(id: string) {
    persist(items.filter((it) => it.id !== id));
  }

  // Filter "done" items by current cycle so old ones don't pollute the view
  const pending = items.filter((it) => it.status === "pending");
  const today = items.filter((it) => it.status === "today");
  const done = items.filter(
    (it) => it.status === "done" && inCurrentCycle(it.doneAt, cycle)
  );

  const cycleLabel = cycle === "week" ? "Esta Semana" : "Este Mês";

  if (!mounted) {
    return (
      <div className="h-[340px] rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-sm animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            Planejador de Inventário Rotativo
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize quais categorias ou subcategorias contar
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Cycle selector */}
          <Select
            value={cycle}
            onValueChange={(v) => setCycle(v as Cycle)}
          >
            <SelectTrigger className="h-7 text-xs w-[120px] border-zinc-200 dark:border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week" className="text-xs">Esta Semana</SelectItem>
              <SelectItem value="month" className="text-xs">Este Mês</SelectItem>
            </SelectContent>
          </Select>

          <AddItemDialog
            categories={categories}
            subcategories={subcategories}
            onAdd={addItem}
          />
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-4">
        {/* A Contar */}
        <Column
          title="A Contar"
          accent="text-zinc-500 dark:text-zinc-400"
          count={pending.length}
          emptyMessage="Nenhuma categoria planejada"
        >
          {pending.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              onMoveToday={() => move(it.id, "today")}
              onMoveDone={() => move(it.id, "done")}
              onRemove={() => remove(it.id)}
            />
          ))}
        </Column>

        {/* Hoje */}
        <Column
          title="Hoje"
          accent="text-blue-600 dark:text-blue-400"
          count={today.length}
          emptyMessage="Nenhuma para hoje"
        >
          {today.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              onMoveDone={() => move(it.id, "done")}
              onMovePending={() => move(it.id, "pending")}
              onRemove={() => remove(it.id)}
            />
          ))}
        </Column>

        {/* Contado */}
        <Column
          title={`Contado · ${cycleLabel}`}
          accent="text-emerald-600 dark:text-emerald-400"
          count={done.length}
          emptyMessage="Nada contado ainda"
        >
          {done.map((it) => (
            <ItemChip
              key={it.id}
              item={it}
              onMovePending={() => move(it.id, "pending")}
              onRemove={() => remove(it.id)}
            />
          ))}
        </Column>
      </div>

      {/* Footer hint */}
      {items.length === 0 && (
        <div className="mt-5 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 py-6">
          <span className="text-xs text-zinc-400 dark:text-zinc-600 text-center max-w-xs leading-relaxed">
            Nenhuma categoria planejada. Adicione categorias ou subcategorias
            para organizar seu inventário rotativo.
          </span>
        </div>
      )}
    </div>
  );
}
