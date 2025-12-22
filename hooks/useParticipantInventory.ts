/**
 * Descrição: Hook especializado para o modo "Colaborador" (Multiplayer) com Suporte Offline.
 * Responsabilidade:
 * 1. Gerenciar a interação do usuário com a lista de produtos.
 * 2. Delegar a sincronização para o hook 'useSyncQueue' (IndexedDB).
 * 3. Garantir UI Otimista (atualiza a tela antes de confirmar o envio).
 * 4. Carregar catálogo do servidor ou do cache local (Offline).
 * 5. Manter funcionalidades avançadas: Resetar item, Remover movimento e Protocolo de Encerramento.
 * 6. Fornecer feedback tátil para ações de sucesso e erro.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";

interface ProductSessao {
  codigo_produto: string;
  codigo_barras: string | null;
  descricao: string;
  saldo_sistema: number;
  saldo_contado: number;
}

interface UseParticipantInventoryProps {
  sessionData: {
    session: { id: number; codigo: string };
    participant: { id: number; nome: string };
  } | null;
}

// Funções auxiliares para feedback tátil
const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(200);
  }
};

const vibrateError = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
};

export const useParticipantInventory = ({
  sessionData,
}: UseParticipantInventoryProps) => {
  // --- Integração com o Carteiro Silencioso ---
  const { addToQueue, queueSize, isSyncing, syncNow } = useSyncQueue();

  // --- Estado Local da UI ---
  const [products, setProducts] = useState<ProductSessao[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<ProductSessao | null>(
    null
  );

  // Estado para controle de sessão encerrada
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);

  // --- 1. Carga Inteligente (Network First -> Cache Fallback) ---
  const loadSessionProducts = useCallback(async () => {
    if (!sessionData) return;

    try {
      // Tenta buscar do servidor (Online)
      const response = await fetch(
        `/api/session/${sessionData.session.id}/products`
      );

      if (response.status === 409) {
        setIsSessionFinalized(true);
        vibrateError(); // Vibração de erro ao detectar sessão encerrada
        toast({
          title: "Sessão Encerrada",
          description: "O anfitrião finalizou esta contagem.",
          variant: "destructive",
        });
        throw new Error("SESSION_CLOSED");
      }

      if (!response.ok) throw new Error("Erro ao carregar produtos.");

      const data: ProductSessao[] = await response.json();
      setProducts(data);
      vibrateSuccess(); // Vibração de sucesso ao carregar catálogo online

      // Salva no IndexedDB para uso futuro (Offline)
      const dbProducts = data.map((p) => ({
        id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
        codigo_produto: p.codigo_produto,
        descricao: p.descricao,
        saldo_estoque: p.saldo_sistema,
      }));

      const dbBarcodes = data.map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        produto_id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
      }));

      saveCatalogOffline(dbProducts, dbBarcodes).catch(console.error);
    } catch (error: any) {
      if (error.message === "SESSION_CLOSED") return;

      console.warn(
        "⚠️ Falha na rede. Tentando carregar catálogo offline...",
        error
      );

      // Fallback: Tenta carregar do IndexedDB
      try {
        const cached = await getCatalogOffline();
        if (cached.products.length > 0) {
          const restoredProducts: ProductSessao[] = cached.products.map((p) => {
            const bc = cached.barcodes.find(
              (b) =>
                b.produto_id === p.id || b.codigo_de_barras === p.codigo_produto
            );
            return {
              codigo_produto: p.codigo_produto,
              codigo_barras: bc?.codigo_de_barras || null,
              descricao: p.descricao,
              saldo_sistema: p.saldo_estoque,
              saldo_contado: 0, // Offline começamos com 0 visualmente (fila ajusta depois)
            };
          });

          setProducts(restoredProducts);
          vibrateSuccess(); // Vibração de sucesso ao carregar do cache
          toast({
            title: "Modo Offline 📡",
            description: "Carregamos o catálogo salvo no dispositivo.",
          });
        }
      } catch (dbError) {
        vibrateError(); // Vibração de erro ao falhar completamente
        toast({
          title: "Erro de conexão",
          description: "Não foi possível carregar a lista de produtos.",
          variant: "destructive",
        });
      }
    }
  }, [sessionData]);

  useEffect(() => {
    loadSessionProducts();
  }, [loadSessionProducts]);

  // --- 2. Lógica de Escaneamento ---
  const handleScan = useCallback(() => {
    if (!scanInput) return;
    const code = scanInput.trim();

    const product = products.find(
      (p) =>
        areBarcodesEqual(p.codigo_barras || "", code) ||
        areBarcodesEqual(p.codigo_produto, code)
    );

    if (product) {
      setCurrentProduct(product);
      vibrateSuccess(); // Vibração de sucesso ao encontrar o item
    } else {
      vibrateError(); // Vibração de erro ao não encontrar
      toast({
        title: "Item não encontrado",
        description: "Este item não consta na lista desta sessão.",
        variant: "destructive",
      });
      setCurrentProduct(null);
    }
  }, [scanInput, products]);

  // --- 3. Adicionar Movimento (Via Fila Offline) ---
  // ATUALIZADO: Agora aceita o parâmetro tipo_local
  const handleAddMovement = useCallback(
    async (qtd: number, tipo_local: "LOJA" | "ESTOQUE" = "LOJA") => {
      if (!currentProduct || !sessionData || isSessionFinalized) {
        if (isSessionFinalized) {
          vibrateError();
          toast({
            title: "Sessão Finalizada",
            description: "Não é possível adicionar novos itens.",
            variant: "destructive",
          });
        }
        return;
      }

      // Adiciona ao IndexedDB com o local correto
      await addToQueue({
        codigo_barras:
          currentProduct.codigo_barras || currentProduct.codigo_produto,
        quantidade: qtd,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
        tipo_local: tipo_local, // <--- SALVANDO O LOCAL
      });

      // Atualiza UI Otimista (apenas soma no total visual por enquanto)
      setProducts((prev) =>
        prev.map((p) => {
          if (p.codigo_produto === currentProduct.codigo_produto) {
            return { ...p, saldo_contado: (p.saldo_contado || 0) + qtd };
          }
          return p;
        })
      );

      vibrateSuccess();
      toast({
        title: qtd > 0 ? "Adicionado ✅" : "Removido 🔻",
        description: `${qtd} un. em ${tipo_local}`, // Feedback visual do local
      });

      setScanInput("");
      setQuantityInput("");
      setCurrentProduct(null);
    },
    [currentProduct, sessionData, isSessionFinalized, addToQueue]
  );

  // --- 4. Remover Movimento (Estratégia de Compensação) ---
  const handleRemoveMovement = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (
        !product ||
        (product.saldo_contado || 0) <= 0 ||
        !sessionData ||
        isSessionFinalized
      )
        return;

      const targetCode = product.codigo_barras || product.codigo_produto;
      const qtdParaRemover = -1; // Sempre adiciona um movimento negativo

      await addToQueue({
        codigo_barras: targetCode,
        quantidade: qtdParaRemover,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
      });

      // Atualiza UI Otimista
      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === productCode
            ? { ...p, saldo_contado: Math.max(0, (p.saldo_contado || 0) - 1) }
            : p
        )
      );

      vibrateSuccess(); // Vibração de sucesso ao corrigir
      toast({ title: "Correção registrada", description: "-1 unidade." });
    },
    [products, sessionData, isSessionFinalized, addToQueue]
  );

  // --- 5. Zerar Item ---
  const handleResetItem = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (
        !product ||
        (product.saldo_contado || 0) <= 0 ||
        !sessionData ||
        isSessionFinalized
      )
        return;

      const qtdParaZerar = -product.saldo_contado; // Zera o total atual
      const targetCode = product.codigo_barras || product.codigo_produto;

      await addToQueue({
        codigo_barras: targetCode,
        quantidade: qtdParaZerar,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === productCode ? { ...p, saldo_contado: 0 } : p
        )
      );

      vibrateSuccess(); // Vibração de sucesso ao zerar
      toast({
        title: "Item Zerado",
        description: "Contagem reiniciada.",
        variant: "destructive",
      });
    },
    [products, sessionData, isSessionFinalized, addToQueue]
  );

  // --- 6. Otimização de Visibilidade (Sincronizar ao Focar) ---
  useEffect(() => {
    if (isSessionFinalized) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 App voltou para o foco. Sincronizando...");
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncNow, isSessionFinalized]);

  // --- 7. Calcular Itens Faltantes ---
  const missingItems = useMemo(() => {
    return products
      .filter((p) => p.saldo_contado === 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema,
      }));
  }, [products]);

  return {
    products,
    queueSize,
    isSyncing,
    lastSyncTime: null, // Gerenciado pelo hook da fila
    missingItems,
    pendingMovements: [], // A fila bruta não precisa ser exposta para a UI
    isSessionFinalized,

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
    forceSync: syncNow,
  };
};
