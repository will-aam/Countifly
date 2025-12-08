// hooks/useParticipantInventory.ts
/**
 * Descrição: Hook especializado para o modo "Colaborador" (Multiplayer).
 * Responsabilidade:
 * 1. Gerenciar a fila local de movimentos (bipagens).
 * 2. Sincronizar periodicamente com o servidor (enviar fila e receber atualizações).
 * 3. Garantir que a UI seja rápida (Optimistic UI) mesmo com internet instável.
 * 4. Calcular e expor a lista de ITENS FALTANTES.
 * 5. Permitir a remoção da última bipagem de um item.
 * 6. Permitir zerar a contagem de um item específico de uma só vez.
 * 7. [NOVO] Implementar protocolo de encerramento quando a sessão é finalizada (erro 409).
 * 8. [NOVO] Otimizar o uso de recursos pausando a sincronização quando a aba não está visível.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils"; // <--- Importação Centralizada

// Tipos
interface ProductSessao {
  codigo_produto: string;
  codigo_barras: string | null;
  descricao: string;
  saldo_sistema: number; // O saldo que veio do ERP
  saldo_contado: number; // O total contado por TODOS (vindo do servidor)
}

interface MovimentoFila {
  id: string; // ID temporário (uuid ou timestamp)
  codigo_barras: string;
  quantidade: number;
  timestamp: number;
}

interface UseParticipantInventoryProps {
  sessionData: {
    session: { id: number; codigo: string };
    participant: { id: number; nome: string };
  } | null;
}

export const useParticipantInventory = ({
  sessionData,
}: UseParticipantInventoryProps) => {
  // --- Estado ---
  const [products, setProducts] = useState<ProductSessao[]>([]);
  const [queue, setQueue] = useState<MovimentoFila[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // [NOVO] Estado de controle para o protocolo de encerramento
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);

  // Estado UI
  const [scanInput, setScanInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<ProductSessao | null>(
    null
  );

  // Referências para o loop de sync não ficar preso em closures antigas
  const queueRef = useRef(queue);
  const sessionRef = useRef(sessionData);
  const syncDataRef = useRef<() => Promise<void>>();

  // Atualiza as refs quando o estado muda
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    sessionRef.current = sessionData;
  }, [sessionData]);

  // --- 1. Carga Inicial (Baixar Produtos da Sessão) ---
  const loadSessionProducts = useCallback(async () => {
    if (!sessionData) return;

    try {
      const response = await fetch(
        `/api/session/${sessionData.session.id}/products`
      );
      if (!response.ok) throw new Error("Erro ao carregar produtos.");

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive",
      });
    }
  }, [sessionData]);

  useEffect(() => {
    loadSessionProducts();
  }, [loadSessionProducts]);

  // --- 2. Lógica de Escaneamento (Local) ---
  const handleScan = useCallback(() => {
    if (!scanInput) return;
    const code = scanInput.trim();

    // Tenta achar o produto com tolerância a zeros usando a função do utils
    const product = products.find(
      (p) =>
        areBarcodesEqual(p.codigo_barras || "", code) ||
        areBarcodesEqual(p.codigo_produto, code)
    );

    if (product) {
      setCurrentProduct(product);
    } else {
      // Produto não encontrado na sessão
      toast({
        title: "Item não encontrado",
        description: "Este item não consta na lista desta sessão.",
        variant: "destructive",
      });
      setCurrentProduct(null);
    }
  }, [scanInput, products]);

  const handleAddMovement = useCallback(
    (qtd: number) => {
      if (!currentProduct || !sessionData) return;

      // 1. Cria o movimento
      const movimento: MovimentoFila = {
        id: crypto.randomUUID(), // ID único para evitar duplicação no envio
        codigo_barras:
          currentProduct.codigo_barras || currentProduct.codigo_produto,
        quantidade: qtd,
        timestamp: Date.now(),
      };

      // 2. Adiciona na fila local (UI Otimista)
      setQueue((prev) => [...prev, movimento]);

      // 3. Atualiza o saldo localmente para feedback imediato
      setProducts((prev) =>
        prev.map((p) => {
          if (p.codigo_produto === currentProduct.codigo_produto) {
            return { ...p, saldo_contado: (p.saldo_contado || 0) + qtd };
          }
          return p;
        })
      );

      // 4. Feedback e Limpeza
      toast({
        title: "Registrado!",
        description: `${qtd > 0 ? "+" : ""}${qtd} unidade(s)`,
      });
      setScanInput("");
      setQuantityInput("");
      setCurrentProduct(null);
    },
    [currentProduct, sessionData]
  );

  /**
   * Remove a última bipagem (movimento) pendente para um produto específico.
   * Atualiza a UI de forma otimista para feedback instantâneo.
   */
  const handleRemoveMovement = useCallback(
    (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (!product) return;

      if ((product.saldo_contado || 0) <= 0) {
        toast({
          title: "Saldo zerado",
          description: "Não é possível remover itens com saldo zero.",
          variant: "destructive",
        });
        return;
      }

      const targetCode = product.codigo_barras || product.codigo_produto;

      // 1. Tenta achar um movimento PENDENTE na fila local
      const pendingMovement = queue.findLast(
        (m) => m.codigo_barras === targetCode
      );

      if (pendingMovement) {
        // CENÁRIO A: O item ainda não subiu para o servidor.
        // Podemos remover da fila tranquilamente (Desfazer Ação).

        setQueue((prev) => prev.filter((m) => m.id !== pendingMovement.id));

        setProducts((prev) =>
          prev.map((p) =>
            p.codigo_produto === productCode
              ? {
                  ...p,
                  saldo_contado: Math.max(
                    0,
                    (p.saldo_contado || 0) - pendingMovement.quantidade
                  ),
                }
              : p
          )
        );

        toast({
          title: "Bipagem cancelada",
          description: `Item removido da fila de envio.`,
        });
      } else {
        // CENÁRIO B: O item já sincronizou.
        // Criamos um novo movimento NEGATIVO para compensar no servidor.

        const qtdParaRemover = 1; // Ou você pode abrir um modal perguntando a qtd

        const movimentoEstorno: MovimentoFila = {
          id: crypto.randomUUID(),
          codigo_barras: targetCode,
          quantidade: -qtdParaRemover, // Quantidade Negativa!
          timestamp: Date.now(),
        };

        setQueue((prev) => [...prev, movimentoEstorno]);

        setProducts((prev) =>
          prev.map((p) =>
            p.codigo_produto === productCode
              ? {
                  ...p,
                  saldo_contado: Math.max(
                    0,
                    (p.saldo_contado || 0) - qtdParaRemover
                  ),
                }
              : p
          )
        );

        toast({
          title: "Correção registrada",
          description: `-${qtdParaRemover} unidade(s) registrada(s).`,
        });
      }
    },
    [products, queue]
  );

  // --- NOVA FUNÇÃO: Zera o item completamente ---
  const handleResetItem = useCallback(
    (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      // Verifica se o produto existe e se o saldo contado é maior que zero
      if (!product || (product.saldo_contado || 0) <= 0) {
        toast({
          title: "Ação não permitida",
          description: "Este item não possui contagem para zerar.",
          variant: "destructive",
        });
        return;
      }

      const qtdParaZerar = product.saldo_contado; // Pega o total atual (ex: 15)
      const targetCode = product.codigo_barras || product.codigo_produto;

      // Cria um movimento negativo igual ao total
      const movimentoZerar: MovimentoFila = {
        id: crypto.randomUUID(),
        codigo_barras: targetCode,
        quantidade: -qtdParaZerar, // Envia -15
        timestamp: Date.now(),
      };

      // Adiciona à fila de envio
      setQueue((prev) => [...prev, movimentoZerar]);

      // Zera a UI imediatamente (Optimistic UI)
      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === productCode
            ? { ...p, saldo_contado: 0 } // Força zero visualmente
            : p
        )
      );

      toast({
        title: "Item Zerado",
        description: `Contagem de ${qtdParaZerar} unidade(s) reiniciada.`,
        variant: "destructive", // Vermelho para indicar ação crítica
      });
    },
    [products] // Dependências
  );

  // --- 3. O "Carteiro Silencioso" (Sync Loop) com Protocolo de Encerramento e Otimização de Visibilidade ---

  const syncData = useCallback(async () => {
    // [NOVO] Short-circuit para evitar processamento quando a sessão está finalizada ou a aba está oculta
    if (
      !sessionRef.current ||
      isSyncing ||
      isSessionFinalized ||
      (typeof document !== "undefined" && document.hidden)
    )
      return;

    const currentQueue = queueRef.current;
    const hasDataToSend = currentQueue.length > 0;

    setIsSyncing(true);
    try {
      const response = await fetch(
        `/api/session/${sessionRef.current.session.id}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: sessionRef.current.participant.id,
            movements: currentQueue, // Envia tudo o que está pendente
          }),
        }
      );

      // [NOVO] Verificação específica para erro 409 (sessão encerrada)
      if (response.status === 409) {
        // Ativa o protocolo de encerramento
        setIsSessionFinalized(true);

        // Notifica o usuário sobre o encerramento
        toast({
          title: "Sessão Encerrada",
          description:
            "O anfitrião finalizou a contagem. Não é possível adicionar mais itens.",
          variant: "destructive",
        });

        // Lança um erro específico para tratamento diferenciado no catch
        throw new Error("SESSION_CLOSED");
      }

      if (!response.ok) throw new Error("Erro ao sincronizar dados.");

      const data = await response.json();

      // SUCESSO:
      // 1. Limpar da fila os itens que foram enviados com sucesso
      if (hasDataToSend) {
        setQueue((prev) =>
          prev.filter(
            (item) => !currentQueue.find((sent) => sent.id === item.id)
          )
        );
      }

      // 2. Atualizar os saldos com a verdade absoluta do servidor
      // (Isso corrige eventuais divergências se outro usuário bipou o mesmo item)
      if (data.updatedProducts) {
        setProducts((prev) =>
          prev.map((localProd) => {
            const serverProd = data.updatedProducts.find(
              (sp: any) => sp.codigo_produto === localProd.codigo_produto
            );
            return serverProd
              ? { ...localProd, saldo_contado: serverProd.saldo_contado }
              : localProd;
          })
        );
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Erro de sincronização:", error);

      // [NOVO] Tratamento diferenciado para erro de sessão encerrada
      if (error instanceof Error && error.message === "SESSION_CLOSED") {
        // Não faz nada além do que já foi feito (toast e setIsSessionFinalized)
        // Evita mostrar mensagens de erro adicionais
        return;
      }

      // Para outros erros, mantém o comportamento anterior
      toast({
        title: "Erro de sincronização",
        description:
          "Não foi possível enviar suas alterações. Tentando novamente...",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isSessionFinalized]); // [NOVO] Adicionadas dependências

  // [NOVO] Armazena a função syncData em uma ref para uso no listener de visibilidade
  useEffect(() => {
    syncDataRef.current = syncData;
  }, [syncData]);

  // Loop de Sincronização com Otimização de Visibilidade
  useEffect(() => {
    // [NOVO] Verificação adicional para não iniciar o intervalo se a sessão já estiver finalizada
    if (isSessionFinalized) return;

    // [NOVO] Função para lidar com a troca de aba/bloqueio de tela
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // O usuário voltou! Sincroniza IMEDIATAMENTE para atualizar os dados
        console.log("📱 App voltou para o foco. Sincronizando...");
        syncDataRef.current?.();
      }
    };

    // [NOVO] Adiciona o ouvinte de visibilidade
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Mantém o intervalo padrão, mas agora o syncData() vai abortar se estiver hidden
    const intervalId = setInterval(() => {
      syncData();
    }, 5000); // Tenta sincronizar a cada 5 segundos

    return () => {
      clearInterval(intervalId);
      // [NOVO] Remove o ouvinte de visibilidade ao limpar o efeito
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncData, isSessionFinalized]); // [NOVO] Adicionada dependência

  // --- 4. Calcular Itens Faltantes (Global) ---
  const missingItems = useMemo(() => {
    return products
      .filter((p) => p.saldo_contado === 0) // Considera faltante quem ainda não teve contagem (contado == 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema, // Exibe o saldo do sistema como referência do que falta
      }));
  }, [products]);

  return {
    // Dados
    products,
    queueSize: queue.length,
    isSyncing,
    lastSyncTime,
    missingItems,
    pendingMovements: queue, // Expondo a fila para a UI
    isSessionFinalized, // [NOVO] Expondo o estado para a UI

    // UI State
    scanInput,
    setScanInput,
    quantityInput,
    setQuantityInput,
    currentProduct,

    // Ações
    handleScan,
    handleAddMovement,
    handleRemoveMovement,
    handleResetItem,
    forceSync: syncData,
  };
};
