// hooks/useSyncQueue.ts
/**
 * Descrição: Hook do "Carteiro Silencioso" (Gerenciador de Fila Offline).
 * Responsabilidade:
 * 1. Gerenciar a fila de movimentos pendentes no IndexedDB.
 * 2. Monitorar o status da rede (online/offline).
 * 3. Tentar enviar os dados automaticamente quando houver conexão ("Flush").
 * 4. Expor métodos para adicionar itens à fila e forçar a sincronização.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from "@/lib/db";
import { toast } from "@/hooks/use-toast";

// Interface do Movimento (Ajustada para bater com o lib/db.ts)
export interface QueueItem {
  id: string; // UUID
  codigo_barras: string;
  quantidade: number;
  timestamp: number;
  sessao_id?: number; // Opcional no banco
  participante_id?: number; // Opcional no banco
}

export function useSyncQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Evita múltiplas execuções simultâneas do sync
  const isSyncingRef = useRef(false);

  // --- 1. Monitoramento de Rede e Carga Inicial ---
  useEffect(() => {
    // Verifica status inicial
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    // Carrega o tamanho da fila ao iniciar
    updateQueueSize();

    // Listeners de rede
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexão restaurada 🟢",
        description: "Enviando dados pendentes...",
      });
      processQueue(); // Tenta enviar assim que voltar
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sem conexão 🔴",
        description:
          "Modo Offline ativado. Seus dados estão seguros no dispositivo.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Loop de verificação (Polling) - "O Carteiro passa a cada 15s"
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
  }, []);

  // --- 2. Métodos Auxiliares ---

  const updateQueueSize = async () => {
    try {
      const queue = await getSyncQueue();
      setQueueSize(queue.length);
    } catch (error) {
      console.error("Erro ao ler fila:", error);
    }
  };

  // --- 3. Adicionar à Fila (Ação do Usuário) ---
  const addToQueue = useCallback(async (item: Omit<QueueItem, "id">) => {
    const newItem = {
      ...item,
      id: crypto.randomUUID(), // Gera ID único
    };

    await addToSyncQueue(newItem);
    await updateQueueSize();

    // Tenta enviar imediatamente se estiver online (Optimistic)
    if (navigator.onLine) {
      processQueue();
    }
  }, []);

  // --- 4. Processar a Fila (A Lógica Pesada) ---
  const processQueue = async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);

      // Agrupa movimentos por Sessão e Participante
      const groups = new Map<string, QueueItem[]>();

      for (const item of queue) {
        // Validação de Segurança: Ignora itens sem contexto
        if (!item.sessao_id || !item.participante_id) {
          console.warn("Item inválido na fila (sem ID):", item);
          continue;
        }

        // Chave composta para agrupar
        const key = `${item.sessao_id}-${item.participante_id}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)?.push(item);
      }

      // Envia cada grupo separadamente
      for (const [key, items] of groups.entries()) {
        const [sessaoId, participanteId] = key.split("-");

        try {
          // Prepara o payload conforme esperado pela API existente
          const payload = {
            participantId: parseInt(participanteId, 10),
            movements: items.map((i) => ({
              codigo_barras: i.codigo_barras,
              quantidade: i.quantidade,
              timestamp: i.timestamp,
            })),
          };

          const response = await fetch(`/api/session/${sessaoId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            // Sucesso! Remove APENAS esses itens da fila local
            const idsToRemove = items.map((i) => i.id);
            await removeFromSyncQueue(idsToRemove);
            console.log(
              `Enviados ${items.length} itens para sessão ${sessaoId}`
            );
          } else {
            console.warn(
              `Falha ao enviar lote para sessão ${sessaoId}. Status: ${response.status}`
            );
          }
        } catch (err) {
          console.error(`Erro de rede ao enviar para sessão ${sessaoId}:`, err);
        }
      }

      await updateQueueSize();
    } catch (error) {
      console.error("Erro crítico no processQueue:", error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  return {
    queueSize,
    isSyncing,
    isOnline,
    addToQueue,
    syncNow: processQueue,
  };
}
