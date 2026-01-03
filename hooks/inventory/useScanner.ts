/**
 * Descrição: Hook responsável pela lógica de Scanner e Identificação de Produtos.
 * Responsabilidade:
 * 1. Gerenciar input de scanner (texto e câmera).
 * 2. Identificar produtos no catálogo (ou criar temporários).
 * 3. Gerenciar o Modo Demo e produtos temporários.
 * 4. Feedback tátil para ações de sucesso e erro.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils";
import type { Product, BarCode, TempProduct } from "@/lib/types";

// Constante movida para cá (configuração local do scanner)
const MIN_BARCODE_LENGTH = 13;

// Funções auxiliares para feedback tátil
const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(200); // Vibração curta de sucesso
  }
};

const vibrateError = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]); // Padrão duplo para erro
  }
};

export const useScanner = (products: Product[], barCodes: BarCode[]) => {
  // --- Estados de UI e Controle ---
  const [scanInput, setScanInput] = useState("");
  const [isCameraViewActive, setIsCameraViewActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // --- Estados de Dados Locais ---
  // Produtos temporários vivem aqui pois nascem do escaneamento
  const [tempProducts, setTempProducts] = useState<TempProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState<
    Product | TempProduct | null
  >(null);

  // --- Ações ---

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    vibrateSuccess(); // Vibração ao ativar o modo demo
    toast({
      title: "Modo Demo Ativado 🚀",
      description: "Escaneie qualquer item real para testar.",
      className: "bg-blue-600 text-white border-none",
    });
  }, []);

  /**
   * Lógica central de busca de produtos
   */
  const handleScan = useCallback(
    (isManualAction = false) => {
      const code = scanInput.trim();

      // Validação de tamanho mínimo (ignora ruído se não for manual)
      if (
        code === "" ||
        (!isManualAction && code.length < MIN_BARCODE_LENGTH)
      ) {
        if (isManualAction && code === "") {
          vibrateError(); // Vibração se tentar escanear manualmente sem código
        }
        return;
      }

      // 1. Busca no Catálogo (Prioridade Máxima)
      const barCode = barCodes.find((bc) =>
        areBarcodesEqual(bc.codigo_de_barras, code)
      );

      if (barCode?.produto) {
        setCurrentProduct(barCode.produto);
        vibrateSuccess(); // Vibração de sucesso ao encontrar no catálogo
        return;
      }

      // 2. Busca nos Produtos Temporários já criados
      const tempProduct = tempProducts.find((tp) =>
        areBarcodesEqual(tp.codigo_de_barras, code)
      );

      if (tempProduct) {
        setCurrentProduct(tempProduct);
        vibrateSuccess(); // Vibração de sucesso ao encontrar nos temporários
        return;
      }

      // 3. Lógica do Modo Demo (Simulação)
      if (isDemoMode) {
        const randomStock = Math.floor(Math.random() * 90) + 10;

        // Criamos como um "TempProduct" especial para não precisar mutar o catálogo original
        const demoProduct: TempProduct = {
          id: `DEMO-${code}`,
          codigo_de_barras: code,
          codigo_produto: `DEMO-${code.slice(-4)}`,
          descricao: `Item de Teste (Cód: ${code.slice(-4)})`,
          saldo_estoque: randomStock,
          isTemporary: true,
        };

        setTempProducts((prev) => [...prev, demoProduct]);
        setCurrentProduct(demoProduct);
        vibrateSuccess(); // Vibração de sucesso ao criar produto demo

        toast({
          title: "Produto Simulado Criado!",
          description: `Sistema diz que tem ${randomStock} unidades.`,
          className: "bg-green-600 text-white border-none",
        });
        return;
      }

      // 4. Produto Novo (Temporário Real)
      const newTempProduct: TempProduct = {
        id: `TEMP`,
        codigo_de_barras: code,
        codigo_produto: `TEMP`,
        descricao: `Novo Item`,
        saldo_estoque: 0,
        isTemporary: true,
      };

      setTempProducts((prev) => [...prev, newTempProduct]);
      setCurrentProduct(newTempProduct);
      vibrateSuccess(); // Vibração de sucesso ao criar novo produto temporário

      toast({
        title: "Item não cadastrado",
        description: "Digite a quantidade para adicionar.",
      });
    },
    [scanInput, barCodes, tempProducts, isDemoMode]
  );

  /**
   * Callback quando a câmera detecta um código
   */
  const handleBarcodeScanned = useCallback((barcode: string) => {
    setIsCameraViewActive(false);
    setScanInput(barcode);
    vibrateSuccess(); // Vibração ao detectar código com a câmera

    // Pequeno delay para garantir a renderização da UI antes de focar
    setTimeout(() => {
      const quantityEl = document.getElementById("quantity");
      if (quantityEl) quantityEl.focus();
    }, 100);
  }, []);

  // Efeito de "Auto Scan": Busca assim que o usuário para de digitar um código válido
  useEffect(() => {
    if (!scanInput) {
      setCurrentProduct(null);
      return;
    }
    if (scanInput.trim().length < MIN_BARCODE_LENGTH) return;

    handleScan(false);
  }, [scanInput, handleScan]);

  /**
   * Reseta o estado do scanner (usado após adicionar uma contagem)
   */
  const resetScanner = useCallback(() => {
    setScanInput("");
    setCurrentProduct(null);
    vibrateSuccess(); // Vibração sutil ao resetar o scanner
  }, []);

  return {
    scanInput,
    setScanInput,
    isCameraViewActive,
    setIsCameraViewActive,
    isDemoMode,
    enableDemoMode,
    currentProduct,
    tempProducts,
    setTempProducts, // Exposto caso precise limpar tudo
    handleScan,
    handleBarcodeScanned,
    resetScanner,
  };
};
