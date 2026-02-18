// hooks/useSyncQueue.ts
/**
 * Hook para Sincronização Automática de Movimentos com o Servidor.
 * Responsabilidade:
 * 1. Buscar movimentos pendentes na fila local (IndexedDB).
 * 2. Enviar para API em lotes (batch).
 * 3. Detectar quando sessão foi encerrada (status 409).
 * 4. Notificar usuário e parar sincronização.
 * Performance: Roda a cada 5 segundos em background.
 */

import { useEffect, useRef, useState } from "react";
import { getSyncQueue, removeFromSyncQueue, markAsNotSynced } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

// Interface para item da fila
interface QueueItem {
  id: string;
  codigo_barras: string;
  quantidade: number;
  timestamp: number;
  sessao_id?: number;
  participante_id?: number;
  tipo_local?: "LOJA" | "ESTOQUE";
  usuario_id?: number;
}

interface UseSyncQueueOptions {
  sessaoId?: number | null;
  participanteId?: number | null;
  userId?: number | null;
  enabled?: boolean;
  intervalMs?: number;
}

interface SyncStats {
  pending: number;
  syncing: boolean;
  lastSync: Date | null;
  sessionClosed: boolean;
}

export function useSyncQueue({
  sessaoId = null,
  participanteId = null,
  userId = null,
  enabled = true,
  intervalMs = 5000,
}: UseSyncQueueOptions = {}) {
  // ✅ = {} torna todo o objeto opcional
  // ✅ Se qualquer parâmetro faltar, retorna funções vazias
  if (!sessaoId || !participanteId || !userId) {
    return {
      stats: {
        pending: 0,
        syncing: false,
        lastSync: null,
        sessionClosed: false,
      },
      syncNow: async () => {},
      isSessionClosed: false,
    };
  }
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    pending: 0,
    syncing: false,
    lastSync: null,
    sessionClosed: false,
  });

  const syncMovements = async () => {
    if (!sessaoId || !participanteId || !userId) return;
    if (stats.sessionClosed) return;

    try {
      setStats((prev) => ({ ...prev, syncing: true }));

      const queue = await getSyncQueue(userId);

      if (queue.length === 0) {
        setStats((prev) => ({ ...prev, syncing: false, pending: 0 }));
        return;
      }

      setStats((prev) => ({ ...prev, pending: queue.length }));

      const movements = queue.map((item: QueueItem) => ({
        id: item.id,
        codigo_barras: item.codigo_barras,
        quantidade: item.quantidade,
        timestamp: item.timestamp,
        tipo_local: item.tipo_local || "LOJA",
      }));

      const payload = {
        participantId: participanteId,
        movements: movements,
      };

      const response = await fetch(`/api/session/${sessaoId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        const data = await response.json().catch(() => ({}));

        setStats((prev) => ({ ...prev, sessionClosed: true, syncing: false }));

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        toast({
          title: "⚠��� Sessão Encerrada",
          description:
            data.error ||
            "O gerente finalizou a contagem. Seus dados estão salvos localmente.",
          variant: "destructive",
          duration: 10000,
        });

        const idsToMark = queue.map((item: QueueItem) => item.id);
        await markAsNotSynced(idsToMark);

        console.warn(
          `[SyncQueue] Sessão ${sessaoId} foi encerrada. Sincronização interrompida.`,
        );

        return;
      }

      if (response.ok) {
        const idsToRemove = queue.map((item: QueueItem) => item.id);
        await removeFromSyncQueue(idsToRemove);

        setStats((prev) => ({
          ...prev,
          syncing: false,
          pending: 0,
          lastSync: new Date(),
        }));

        console.log(`[SyncQueue] Sincronizou ${queue.length} movimentos.`);
        return;
      }

      console.warn(`[SyncQueue] Erro ${response.status} ao sincronizar`);
      setStats((prev) => ({ ...prev, syncing: false }));
    } catch (error: any) {
      console.error("[SyncQueue] Erro na sincronização:", error);
      setStats((prev) => ({ ...prev, syncing: false }));
    }
  };

  useEffect(() => {
    if (!enabled || !sessaoId || stats.sessionClosed) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    syncMovements();

    intervalRef.current = setInterval(syncMovements, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    sessaoId,
    participanteId,
    userId,
    enabled,
    intervalMs,
    stats.sessionClosed,
  ]);

  return {
    stats,
    syncNow: syncMovements,
    isSessionClosed: stats.sessionClosed,
  };
}
