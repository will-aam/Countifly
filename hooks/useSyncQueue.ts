// hooks/useSyncQueue.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from "@/lib/db";
import { toast } from "@/hooks/use-toast";

export interface QueueItem {
  id: string;
  codigo_barras: string;
  quantidade: number;
  timestamp: number;
  sessao_id?: number;
  participante_id?: number;
  tipo_local?: "LOJA" | "ESTOQUE";
}

// Função auxiliar segura para gerar ID
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Corrigido: .substring em vez de .set
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export function useSyncQueue(userId: number | undefined) {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const isSyncingRef = useRef(false);

  const updateQueueSize = useCallback(async () => {
    if (!userId) return;
    try {
      const queue = await getSyncQueue(userId);
      setQueueSize(queue.length);
    } catch (error) {
      console.error("Erro ao ler fila:", error);
    }
  }, [userId]);

  const processQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine || !userId) return;

    try {
      const queue = await getSyncQueue(userId);
      if (queue.length === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);

      const groups = new Map<string, QueueItem[]>();

      for (const item of queue) {
        if (!item.sessao_id || !item.participante_id) continue;
        const key = `${item.sessao_id}-${item.participante_id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)?.push(item);
      }

      for (const [key, items] of groups.entries()) {
        const [sessaoId, participanteId] = key.split("-");
        try {
          const payload = {
            participantId: parseInt(participanteId, 10),
            movements: items.map((i) => ({
              id: i.id,
              codigo_barras: i.codigo_barras,
              quantidade: i.quantidade,
              timestamp: i.timestamp,
              tipo_local: i.tipo_local || "LOJA",
            })),
          };

          const response = await fetch(`/api/session/${sessaoId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const idsToRemove = items.map((i) => i.id);
            // Corrigido: removeFromSyncQueue no seu db.ts recebe apenas 1 argumento (ids)
            await removeFromSyncQueue(idsToRemove);
          }
        } catch (err) {
          console.error(`Erro de rede na sessão ${sessaoId}:`, err);
        }
      }

      await updateQueueSize();
    } catch (error) {
      console.error("Erro crítico no processQueue:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [userId, updateQueueSize]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    updateQueueSize();

    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const intervalId = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        processQueue();
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [userId, updateQueueSize, processQueue]);

  const addToQueue = useCallback(
    async (item: Omit<QueueItem, "id">) => {
      if (!userId) {
        toast({
          title: "Erro",
          description: "Usuário não identificado",
          variant: "destructive",
        });
        return;
      }

      const newItem = {
        ...item,
        id: generateId(),
      };

      // Corrigido: No seu db.ts, o userId vem PRIMEIRO: (userId, movement)
      await addToSyncQueue(userId, newItem);
      await updateQueueSize();

      if (navigator.onLine) {
        processQueue();
      }
    },
    [userId, updateQueueSize, processQueue]
  );

  return {
    queueSize,
    isSyncing,
    isOnline,
    addToQueue,
    syncNow: processQueue,
  };
}
