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

// Fallback seguro para geração de ID
const safeGenerateId = () => {
  try {
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.randomUUID
    ) {
      return window.crypto.randomUUID();
    }
  } catch (e) {
    console.warn("Crypto UUID não disponível, usando fallback.");
  }
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
    // Evita rodar se já estiver rodando, se estiver offline ou sem usuário
    if (isSyncingRef.current || !navigator.onLine || !userId) return;

    try {
      const queue = await getSyncQueue(userId);
      if (queue.length === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);

      // Cache temporário para não chamar a API de sessão 1000 vezes se tiver 1000 itens
      let singlePlayerContext: {
        sessaoId: number;
        participanteId: number;
      } | null = null;

      // Agrupamento de itens por Sessão + Participante
      const groups = new Map<string, QueueItem[]>();

      for (const item of queue) {
        let targetSessao = item.sessao_id;
        let targetParticipante = item.participante_id;

        // --- LÓGICA INTELIGENTE PARA SINGLE PLAYER ---
        // Se o item não tem sessão (veio do useCounts Singleplayer), descobrimos agora
        if (!targetSessao || !targetParticipante) {
          try {
            if (!singlePlayerContext) {
              // Busca os IDs da sessão pessoal APENAS UMA VEZ por ciclo de sync
              // CORREÇÃO: Nova URL segura (fora de /inventory/)
              const res = await fetch("/api/single/session");
              const data = await res.json();
              if (data.success) {
                singlePlayerContext = {
                  sessaoId: data.sessaoId,
                  participanteId: data.participanteId,
                };
              }
            }

            if (singlePlayerContext) {
              targetSessao = singlePlayerContext.sessaoId;
              targetParticipante = singlePlayerContext.participanteId;
            }
          } catch (err) {
            console.error("Falha ao resolver sessão Singleplayer:", err);
            // Se falhar, ignoramos esse item NESTE ciclo, ele fica na fila para a próxima tentativa
            continue;
          }
        }
        // ---------------------------------------------

        // Se após a tentativa acima ainda não tivermos IDs, pulamos o item com segurança
        if (!targetSessao || !targetParticipante) continue;

        const key = `${targetSessao}-${targetParticipante}`;
        if (!groups.has(key)) groups.set(key, []);

        // Adicionamos ao grupo, mas mantemos o ID original do item para remoção posterior
        groups.get(key)?.push({
          ...item,
          sessao_id: targetSessao, // Injetamos o ID resolvido para uso no payload
          participante_id: targetParticipante,
        });
      }

      // Envia cada grupo para sua respectiva API
      for (const [key, items] of groups.entries()) {
        const [sessaoId, participanteId] = key.split("-");

        try {
          const payload = {
            participantId: parseInt(participanteId, 10),
            movements: items.map((i) => ({
              id: i.id, // ID único para idempotência (evitar duplicidade)
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
            // Se sucesso, remove do IndexedDB usando os IDs originais dos itens da fila
            const idsToRemove = items.map((i) => i.id);
            await removeFromSyncQueue(idsToRemove);
            // console.log(`Sincronizados ${idsToRemove.length} itens para sessão ${sessaoId}`);
          } else {
            console.warn(`Erro API sync sessão ${sessaoId}:`, response.status);
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

  // Loop de Sincronização e Listeners Online/Offline
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

    // Tenta sincronizar a cada 10 segundos se estiver online
    const intervalId = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) processQueue();
    }, 10000);

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
          description: "Usuário não identificado.",
          variant: "destructive",
        });
        return;
      }

      const newItem = {
        ...item,
        id: safeGenerateId(),
      };

      try {
        await addToSyncQueue(userId, newItem);
        await updateQueueSize();
        // Tenta enviar imediatamente se estiver online (melhora a UX)
        if (navigator.onLine) processQueue();
      } catch (error) {
        console.error("Erro ao adicionar à fila local:", error);
        toast({
          title: "Erro Local",
          description: "Falha ao gravar no dispositivo.",
          variant: "destructive",
        });
      }
    },
    [userId, updateQueueSize, processQueue]
  );

  return { queueSize, isSyncing, isOnline, addToQueue, syncNow: processQueue };
}
