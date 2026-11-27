"use client";

// app/(private)/dashboard/components/inventory-planner-card.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Plus,
  ArrowRight,
  Check,
  Undo2,
  Printer,
  Highlighter,
  LayoutGrid,
  List,
  MessageSquare,
  Trash2,
  Pin,
  PinOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

// ─── Constants & Types ────────────────────────────────────────────────────────

export const MAX_OBS_LENGTH = 30;

type ItemType = "categoria" | "subcategoria";
type ItemStatus = "pending" | "today" | "done";
type Cycle = "week" | "month";
type ViewMode = "kanban" | "sheet";

interface PlannerItem {
  id: string;
  name: string;
  type: ItemType;
  status: ItemStatus;
  contagem?: boolean;       // 1ª Contagem realizada
  recontagem?: boolean;     // 2ª Contagem / Recontagem realizada
  conferencia?: boolean;    // Última conferência (auditoria final) realizada
  destaque?: boolean;       // Marcador de texto (destaque visual)
  obs?: string;             // Anotações rápidas (ex: "5*", "Divergência lote A")
  addedAt: string;          // ISO
  doneAt?: string;          // ISO
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

// Botão de Selo da Tríplice Conferência (C1, C2, CONF)
function StageCheckBadge({
  label,
  title,
  active,
  variant = "blue",
  onToggle,
}: {
  label: string;
  title: string;
  active: boolean;
  variant?: "blue" | "emerald";
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={`${title}: ${active ? "Concluído (Sim)" : "Pendente (-)"}`}
      onClick={onToggle}
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded transition-all select-none cursor-pointer border",
        active
          ? variant === "blue"
            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
            : "bg-emerald-600 border-emerald-600 text-white shadow-xs"
          : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/60 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300"
      )}
    >
      {active ? `✓ ${label}` : label}
    </button>
  );
}

interface ItemChipProps {
  item: PlannerItem;
  onToggleContagem: () => void;
  onToggleRecontagem: () => void;
  onToggleConferencia: () => void;
  onToggleDestaque: () => void;
  onEditObs: (obs: string) => void;
  onMoveToday?: () => void;
  onMoveDone?: () => void;
  onMovePending?: () => void;
  onRemove?: () => void;
}

function ItemChip({
  item,
  onToggleContagem,
  onToggleRecontagem,
  onToggleConferencia,
  onToggleDestaque,
  onEditObs,
  onMoveToday,
  onMoveDone,
  onMovePending,
  onRemove,
}: ItemChipProps) {
  const [editingObs, setEditingObs] = useState(false);
  const [obsText, setObsText] = useState(item.obs || "");

  function handleSaveObs(e: React.FormEvent) {
    e.preventDefault();
    onEditObs(obsText.trim().slice(0, MAX_OBS_LENGTH));
    setEditingObs(false);
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 p-2.5 rounded-xl border text-sm transition-all",
        item.destaque
          ? "bg-amber-50/70 border-amber-300/80 dark:bg-amber-950/20 dark:border-amber-700/60 shadow-xs"
          : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      )}
    >
      {/* Topo do Card: Tipo, Nome e Ações Rápidas */}
      <div className="flex items-center gap-1.5 min-w-0">
        <TypeBadge type={item.type} />
        <span
          className={cn(
            "flex-1 text-xs font-semibold truncate",
            item.destaque
              ? "text-amber-950 dark:text-amber-200"
              : "text-zinc-800 dark:text-zinc-200"
          )}
          title={item.name}
        >
          {item.name}
        </span>

        {/* Botão Marcador de Texto (Destaque) */}
        <button
          type="button"
          onClick={onToggleDestaque}
          title={item.destaque ? "Remover destaque" : "Destacar com marca-texto"}
          className={cn(
            "p-1 rounded-md transition-colors shrink-0",
            item.destaque
              ? "text-amber-600 bg-amber-200/50 dark:bg-amber-900/40"
              : "text-zinc-300 hover:text-amber-500 opacity-60 group-hover:opacity-100"
          )}
        >
          <Highlighter className="h-3 w-3" />
        </button>

        {/* Botão Nota rápida */}
        <button
          type="button"
          onClick={() => setEditingObs(!editingObs)}
          title="Adicionar anotação (ex: 5*)"
          className={cn(
            "p-1 rounded-md transition-colors shrink-0",
            item.obs
              ? "text-blue-600 bg-blue-100 dark:bg-blue-900/40"
              : "text-zinc-300 hover:text-blue-500 opacity-60 group-hover:opacity-100"
          )}
        >
          <MessageSquare className="h-3 w-3" />
        </button>

        {/* Mover / Remover (Hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onMoveToday && (
            <button
              onClick={onMoveToday}
              title="Mover para Hoje"
              className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-zinc-400 hover:text-blue-600"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
          {onMoveDone && (
            <button
              onClick={onMoveDone}
              title="Marcar como Concluído"
              className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-zinc-400 hover:text-emerald-600"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          {onMovePending && (
            <button
              onClick={onMovePending}
              title="Voltar para A Contar"
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700"
            >
              <Undo2 className="h-3 w-3" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              title="Remover"
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-300 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tripla Conferência (Contagem, Recontagem, Conferência) */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-1">
          <StageCheckBadge
            label="Contagem"
            title="1ª Contagem de estoque"
            active={!!item.contagem}
            onToggle={onToggleContagem}
          />
          <StageCheckBadge
            label="Recontagem"
            title="2ª Contagem (Recontagem de divergência)"
            active={!!item.recontagem}
            onToggle={onToggleRecontagem}
          />
        </div>

        <StageCheckBadge
          label="Conferência"
          title="Última Conferência (Auditoria final)"
          active={!!item.conferencia}
          variant="emerald"
          onToggle={onToggleConferencia}
        />
      </div>

      {/* Exibição da Observação ou Campo de Edição */}
      {editingObs ? (
        <form onSubmit={handleSaveObs} className="flex flex-col gap-1 mt-1">
          <div className="flex gap-1">
            <Input
              value={obsText}
              maxLength={MAX_OBS_LENGTH}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Ex: 5* ou lote..."
              className="h-6 text-[11px] px-2 flex-1"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-6 px-2 text-[10px]">
              Salvar
            </Button>
          </div>
          <div className="flex justify-between items-center text-[9px] text-zinc-400 px-0.5">
            <span>Máx. {MAX_OBS_LENGTH} caracteres</span>
            <span className={obsText.length >= MAX_OBS_LENGTH ? "text-amber-500 font-semibold" : ""}>
              {obsText.length}/{MAX_OBS_LENGTH}
            </span>
          </div>
        </form>
      ) : item.obs ? (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-100 dark:border-zinc-800">
          <span className="font-semibold text-blue-600 dark:text-blue-400">Obs:</span>
          <span className="truncate">{item.obs}</span>
        </div>
      ) : null}
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
      <div className="flex items-center gap-2 mb-3 px-1">
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
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-0.5">
        {count === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
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
  initialPinned?: boolean;
  className?: string;
}

export function InventoryPlannerCard({
  userId,
  categories = [],
  subcategories = [],
  initialPinned = true,
  className,
}: InventoryPlannerCardProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [cycle, setCycle] = useState<Cycle>("week");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [isPinned, setIsPinned] = useState<boolean>(initialPinned);
  const [isTogglingPin, setIsTogglingPin] = useState(false);

  useEffect(() => {
    setIsPinned(initialPinned);
  }, [initialPinned]);

  useEffect(() => {
    setMounted(true);
    setItems(loadItems(userId));
  }, [userId]);

  const handleTogglePin = async () => {
    const nextVal = !isPinned;
    setIsPinned(nextVal);
    setIsTogglingPin(true);

    try {
      const res = await fetch("/api/user/planner-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixarPlanejador: nextVal }),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar preferência");
      }

      toast({
        title: nextVal ? "Planejador fixado no Dashboard" : "Planejador desafixado",
        description: nextVal
          ? "O planejador rotativo agora está visível no seu Dashboard."
          : "O planejador foi desafixado e recolhido. Você pode fixá-lo novamente a qualquer momento.",
      });
    } catch {
      // Reverter em caso de falha de conexão
      setIsPinned(!nextVal);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar preferência",
        description: "Não foi possível sincronizar sua preferência com a conta.",
      });
    } finally {
      setIsTogglingPin(false);
    }
  };

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
      contagem: false,
      recontagem: false,
      conferencia: false,
      destaque: false,
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

  function toggleStage(id: string, stage: "contagem" | "recontagem" | "conferencia") {
    persist(
      items.map((it) => {
        if (it.id !== id) return it;
        const nextVal = !it[stage];
        const updated = { ...it, [stage]: nextVal };

        // Inteligência de fluxo:
        // 1. Se marcou a 1ª contagem e estava em "pending", move para "today"
        if (stage === "contagem" && nextVal && updated.status === "pending") {
          updated.status = "today";
        }
        // 2. Se marcou a última conferência e estava em "today", move para "done"
        if (stage === "conferencia" && nextVal && updated.status === "today") {
          updated.status = "done";
          updated.doneAt = new Date().toISOString();
        }
        // 3. Se desmarcou a última conferência e estava em "done", volta para "today"
        if (stage === "conferencia" && !nextVal && updated.status === "done") {
          updated.status = "today";
        }

        return updated;
      })
    );
  }

  function toggleDestaque(id: string) {
    persist(
      items.map((it) => (it.id === id ? { ...it, destaque: !it.destaque } : it))
    );
  }

  function updateObs(id: string, obs: string) {
    persist(
      items.map((it) => (it.id === id ? { ...it, obs: obs.trim().slice(0, MAX_OBS_LENGTH) } : it))
    );
  }

  // Filtragem dos itens pelo ciclo selecionado
  const pending = items.filter((it) => it.status === "pending");
  const today = items.filter((it) => it.status === "today");
  const done = items.filter(
    (it) => it.status === "done" && inCurrentCycle(it.doneAt, cycle)
  );

  const cycleLabel = cycle === "week" ? "Esta Semana" : "Este Mês";

  const printRef = useRef<HTMLDivElement>(null);

  // Impressão isolada e precisa via react-to-print
  const handlePrintSheet = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Inventario_Rotativo_${cycle === "week" ? "Semanal" : "Mensal"}_${new Date().toISOString().split("T")[0]}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 12mm 14mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        }
      }
    `,
  });

  if (!mounted) {
    return (
      <div className="h-[360px] rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-sm animate-pulse" />
    );
  }

  if (!isPinned) {
    return (
      <div className="flex justify-end -mb-3">
        <button
          type="button"
          onClick={handleTogglePin}
          disabled={isTogglingPin}
          title="Fixar Planejador de Inventário no Dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer"
        >
          {isTogglingPin ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
          <span>Fixar Planejador</span>
        </button>
      </div>
    );
  }

  const allItemsToPrint = [...today, ...pending, ...done];
  // Adiciona linhas extras em branco se a lista for pequena para anotações manuais na parede
  const blankRowsNeeded = Math.max(0, 10 - allItemsToPrint.length);

  return (
    <>
      {/* ─── Folha de Impressão Isolada (Renderizada apenas pelo react-to-print no iframe) ─── */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm" }}>
        <div ref={printRef} className="p-8 bg-white text-black font-sans leading-normal">
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
            <div>
              <div className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-0.5">
                COUNTIFLY · SISTEMA DE GESTÃO DE ESTOQUE
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight text-black">
                Controle de Inventário Rotativo — Tripla Conferência
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Ciclo: <strong>{cycleLabel}</strong> · Emissão: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="text-right text-xs border border-black/40 rounded p-2 bg-gray-50">
              <div className="font-bold text-[11px]">RESUMO DO CICLO</div>
              <div className="text-[10px] text-gray-600 mt-0.5">
                Planejados: <strong>{allItemsToPrint.length}</strong> · Concluídos: <strong>{done.length}</strong>
              </div>
            </div>
          </div>

          {/* Tabela de Tripla Conferência */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="border border-black p-2 text-center w-8">#</th>
                <th className="border border-black p-2 text-center w-12">Tipo</th>
                <th className="border border-black p-2 text-left">Subcategoria / Categoria</th>
                <th className="border border-black p-2 text-center w-24">1ª Contagem</th>
                <th className="border border-black p-2 text-center w-24">Recontagem</th>
                <th className="border border-black p-2 text-center w-28">Última Conferência</th>
                <th className="border border-black p-2 text-left w-28">Obs / Lote</th>
                <th className="border border-black p-2 text-center w-16">Visto</th>
              </tr>
            </thead>
            <tbody>
              {allItemsToPrint.map((it, idx) => (
                <tr
                  key={it.id}
                  style={it.destaque ? { backgroundColor: "#fef9c3" } : idx % 2 === 0 ? { backgroundColor: "#ffffff" } : { backgroundColor: "#f9fafb" }}
                >
                  <td className="border border-black p-2 text-center font-mono text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="border border-black p-2 text-center font-bold uppercase text-[9px]">
                    {it.type === "categoria" ? "Cat" : "Sub"}
                  </td>
                  <td className="border border-black p-2 font-semibold">
                    {it.name}
                    {it.destaque && (
                      <span className="ml-1.5 text-[9px] font-bold text-amber-800 bg-amber-200 px-1 py-0.5 rounded border border-amber-300">
                        ★ PRIORITÁRIO
                      </span>
                    )}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-[11px]">
                    {it.contagem ? "[ ✓ SIM ]" : "[   ]"}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-[11px]">
                    {it.recontagem ? "[ ✓ SIM ]" : "[   ]"}
                  </td>
                  <td className="border border-black p-2 text-center font-bold text-[11px]">
                    {it.conferencia ? "[ ✓ SIM ]" : "[   ]"}
                  </td>
                  <td className="border border-black p-2 text-[10px] text-gray-700">
                    {it.obs || "—"}
                  </td>
                  <td className="border border-black p-2 text-center text-gray-400">
                    ______
                  </td>
                </tr>
              ))}

              {/* Linhas vazias para anotações manuais pelo operador */}
              {Array.from({ length: blankRowsNeeded }).map((_, bIdx) => (
                <tr key={`blank-${bIdx}`} className="bg-white">
                  <td className="border border-black p-2 text-center font-mono text-[10px] text-gray-400">
                    {allItemsToPrint.length + bIdx + 1}
                  </td>
                  <td className="border border-black p-2 text-center text-gray-300 text-[9px]">
                    ____
                  </td>
                  <td className="border border-black p-2 text-gray-400 italic text-[11px]">
                    &nbsp;
                  </td>
                  <td className="border border-black p-2 text-center text-[11px]">
                    [   ]
                  </td>
                  <td className="border border-black p-2 text-center text-[11px]">
                    [   ]
                  </td>
                  <td className="border border-black p-2 text-center text-[11px]">
                    [   ]
                  </td>
                  <td className="border border-black p-2 text-[10px] text-gray-300">
                    &nbsp;
                  </td>
                  <td className="border border-black p-2 text-center text-gray-400">
                    ______
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Instruções de Campo */}
          <div className="mt-3 text-[10px] text-gray-600 flex justify-between">
            <span>Legenda: [ ✓ SIM ] = Conferido e batido · [   ] = Pendente de contagem</span>
            <span>Documento emitido para controle operacional e fixação em prancheta/parede</span>
          </div>

          {/* Bloco de Assinaturas */}
          <div className="mt-10 pt-4 border-t border-gray-400 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-b border-black mb-1 h-8" />
              <div className="font-bold">Responsável pela Contagem</div>
              <div className="text-[10px] text-gray-500">Nome legível e rubrica</div>
            </div>
            <div>
              <div className="border-b border-black mb-1 h-8" />
              <div className="font-bold">Supervisor / Auditor Responsável</div>
              <div className="text-[10px] text-gray-500">Homologação da última conferência</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card Principal na Tela ─── */}
      <div
        className={cn(
          "print:hidden flex flex-col p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/60 shadow-sm",
          className
        )}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                Planejador de Inventário Rotativo
              </h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                Tripla Conferência
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              1ª Contagem · Recontagem · Última Conferência
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternador de Visualização: Quadro (Kanban) / Folha (Planilha) */}
            <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                title="Visão Quadro Kanban"
                className={cn(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode === "kanban"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("sheet")}
                title="Visão Folha / Planilha de Parede"
                className={cn(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode === "sheet"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Botão Imprimir Folha de Parede */}
            <Button
              variant="outline"
              size="sm"
              disabled={allItemsToPrint.length === 0}
              onClick={() => handlePrintSheet()}
              title={
                allItemsToPrint.length > 0
                  ? "Imprimir folha para colar na parede"
                  : "Adicione ao menos uma categoria para imprimir"
              }
              className="h-7 text-xs gap-1 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir Folha</span>
            </Button>

            {/* Seletor de Ciclo */}
            <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
              <SelectTrigger className="h-7 text-xs w-[115px] border-zinc-200 dark:border-zinc-700">
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

            {/* Botão sutil de desafixar */}
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={isTogglingPin}
              title="Desafixar planejador do Dashboard"
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            >
              {isTogglingPin ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PinOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ─── VISÃO 1: QUADRO KANBAN ─── */}
        {viewMode === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  onToggleContagem={() => toggleStage(it.id, "contagem")}
                  onToggleRecontagem={() => toggleStage(it.id, "recontagem")}
                  onToggleConferencia={() => toggleStage(it.id, "conferencia")}
                  onToggleDestaque={() => toggleDestaque(it.id)}
                  onEditObs={(obs) => updateObs(it.id, obs)}
                  onMoveToday={() => move(it.id, "today")}
                  onMoveDone={() => move(it.id, "done")}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </Column>

            {/* Hoje / Em Andamento */}
            <Column
              title="Hoje (Em Auditoria)"
              accent="text-blue-600 dark:text-blue-400"
              count={today.length}
              emptyMessage="Nenhuma em auditoria hoje"
            >
              {today.map((it) => (
                <ItemChip
                  key={it.id}
                  item={it}
                  onToggleContagem={() => toggleStage(it.id, "contagem")}
                  onToggleRecontagem={() => toggleStage(it.id, "recontagem")}
                  onToggleConferencia={() => toggleStage(it.id, "conferencia")}
                  onToggleDestaque={() => toggleDestaque(it.id)}
                  onEditObs={(obs) => updateObs(it.id, obs)}
                  onMoveDone={() => move(it.id, "done")}
                  onMovePending={() => move(it.id, "pending")}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </Column>

            {/* Concluído */}
            <Column
              title={`Concluído · ${cycleLabel}`}
              accent="text-emerald-600 dark:text-emerald-400"
              count={done.length}
              emptyMessage="Nenhuma concluída no período"
            >
              {done.map((it) => (
                <ItemChip
                  key={it.id}
                  item={it}
                  onToggleContagem={() => toggleStage(it.id, "contagem")}
                  onToggleRecontagem={() => toggleStage(it.id, "recontagem")}
                  onToggleConferencia={() => toggleStage(it.id, "conferencia")}
                  onToggleDestaque={() => toggleDestaque(it.id)}
                  onEditObs={(obs) => updateObs(it.id, obs)}
                  onMovePending={() => move(it.id, "pending")}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </Column>
          </div>
        ) : (
          /* ─── VISÃO 2: FOLHA DE AUDITORIA (TABELA) ─── */
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold w-16">Tipo</th>
                  <th className="py-2.5 px-3 font-semibold">Subcategoria / Categoria</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">1ª Contagem</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">Recontagem</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-36">Última Conferência</th>
                  <th className="py-2.5 px-3 font-semibold w-32">Anotação</th>
                  <th className="py-2.5 px-3 font-semibold text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      Nenhuma categoria no planejador. Clique em "Adicionar" acima.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr
                      key={it.id}
                      className={cn(
                        "transition-colors",
                        it.destaque
                          ? "bg-amber-50/50 dark:bg-amber-950/20"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <TypeBadge type={it.type} />
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleDestaque(it.id)}
                            title={it.destaque ? "Remover destaque" : "Destacar"}
                            className={cn(
                              "p-0.5 rounded cursor-pointer",
                              it.destaque ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"
                            )}
                          >
                            <Highlighter className="h-3 w-3" />
                          </button>
                          <span className={it.destaque ? "font-bold text-amber-950 dark:text-amber-200" : ""}>
                            {it.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheckBadge
                          label="Sim"
                          title="1ª Contagem"
                          active={!!it.contagem}
                          onToggle={() => toggleStage(it.id, "contagem")}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheckBadge
                          label="Sim"
                          title="Recontagem"
                          active={!!it.recontagem}
                          onToggle={() => toggleStage(it.id, "recontagem")}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheckBadge
                          label="Sim"
                          title="Última Conferência"
                          active={!!it.conferencia}
                          variant="emerald"
                          onToggle={() => toggleStage(it.id, "conferencia")}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          maxLength={MAX_OBS_LENGTH}
                          defaultValue={it.obs || ""}
                          onBlur={(e) => updateObs(it.id, e.target.value)}
                          placeholder="—"
                          title={`Máximo ${MAX_OBS_LENGTH} caracteres`}
                          className="w-full text-xs bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => remove(it.id)}
                          title="Remover"
                          className="p-1 text-zinc-300 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensagem quando vazio */}
        {items.length === 0 && viewMode === "kanban" && (
          <div className="mt-5 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 py-6">
            <span className="text-xs text-zinc-400 dark:text-zinc-600 text-center max-w-xs leading-relaxed">
              Nenhuma categoria planejada. Adicione categorias ou subcategorias
              para organizar sua conferência de estoque.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
