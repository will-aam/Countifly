/**
 * Descrição: Hook responsável pela lógica de Scanner e Identificação de Produtos.
 * Agora com suporte a BUSCA ONLINE (Live Query) no banco de dados mestre.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils";
import type { Product, BarCode, TempProduct } from "@/lib/types";

const MIN_BARCODE_LENGTH = 13;

const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate)
    navigator.vibrate(200);
};

const vibrateError = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate)
    navigator.vibrate([100, 50, 100]);
};

// Adicionamos a função de busca online como um parâmetro (que virá do useInventory)
export const useScanner = (
  products: Product[],
  barCodes: BarCode[],
  searchProductOnline?: (barcode: string) => Promise<Product | null>,
) => {
  const [scanInput, setScanInput] = useState("");
  const [isCameraViewActive, setIsCameraViewActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const [tempProducts, setTempProducts] = useState<TempProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState<
    Product | TempProduct | null
  >(null);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    vibrateSuccess();
    toast({
      title: "Modo Demo Ativado 🚀",
      description: "Escaneie qualquer item real para testar.",
      className: "bg-blue-600 text-white border-none",
    });
  }, []);

  const focusQuantity = () => {
    setTimeout(() => {
      const quantityEl = document.getElementById("quantity");
      if (quantityEl instanceof HTMLElement) quantityEl.focus();
    }, 100);
  };

  // Transformamos em async para poder esperar a resposta da API Global
  const handleScan = useCallback(
    async (isManualAction = false) => {
      const code = scanInput.trim();

      if (
        code === "" ||
        (!isManualAction && code.length < MIN_BARCODE_LENGTH)
      ) {
        if (isManualAction && code === "") vibrateError();
        return;
      }

      // 1. Busca no Cache Offline (Prioridade Máxima e Instantânea)
      const barCode = barCodes.find((bc) =>
        areBarcodesEqual(bc.codigo_de_barras, code),
      );
      if (barCode?.produto) {
        setCurrentProduct(barCode.produto);
        vibrateSuccess();
        focusQuantity();
        return;
      }

      // 2. Busca nos Produtos Temporários
      const tempProduct = tempProducts.find((tp) =>
        areBarcodesEqual(tp.codigo_de_barras, code),
      );
      if (tempProduct) {
        setCurrentProduct(tempProduct);
        vibrateSuccess();
        focusQuantity();
        return;
      }

      // 3. MODO DEMO
      if (isDemoMode) {
        const randomStock = Math.floor(Math.random() * 90) + 10;
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
        vibrateSuccess();
        focusQuantity();
        toast({
          title: "Produto Simulado Criado!",
          className: "bg-green-600 text-white border-none",
        });
        return;
      }

      // 4. A MÁGICA ONLINE (LIVE QUERY)
      if (searchProductOnline) {
        setIsSearchingOnline(true);
        const onlineProduct = await searchProductOnline(code);
        setIsSearchingOnline(false);

        if (onlineProduct) {
          // Achou no banco global!
          setCurrentProduct(onlineProduct);
          vibrateSuccess();
          focusQuantity();
          toast({
            title: "Item Encontrado na Base Mestra!",
            description: onlineProduct.descricao,
            className: "bg-emerald-600 text-white border-none",
          });
          return;
        }
      }

      // 5. Se não achou em lugar nenhum (Novo Temporário)
      const newTempProduct: TempProduct = {
        id: `TEMP-${code}`,
        codigo_de_barras: code,
        codigo_produto: `TEMP-${code}`,
        descricao: `Novo Item (Não encontrado)`,
        saldo_estoque: 0,
        isTemporary: true,
      };

      setTempProducts((prev) => [...prev, newTempProduct]);
      setCurrentProduct(newTempProduct);
      vibrateError(); // Vibra erro porque não estava no catálogo
      focusQuantity();

      toast({
        title: "Item não cadastrado",
        description: "Preencha a quantidade e será salvo como pendente.",
        variant: "destructive",
      });
    },
    [scanInput, barCodes, tempProducts, isDemoMode, searchProductOnline],
  );

  const handleBarcodeScanned = useCallback((barcode: string) => {
    setIsCameraViewActive(false);
    setScanInput(barcode);
    vibrateSuccess();
  }, []);

  useEffect(() => {
    if (!scanInput) {
      setCurrentProduct(null);
      return;
    }
    if (scanInput.trim().length < MIN_BARCODE_LENGTH) return;

    // Dispara a busca quando o input estiver completo
    handleScan(false);
  }, [scanInput, handleScan]);

  const resetScanner = useCallback(() => {
    setScanInput("");
    setCurrentProduct(null);
    vibrateSuccess();
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
    setTempProducts,
    handleScan,
    handleBarcodeScanned,
    resetScanner,
    isSearchingOnline, // Se quiser mostrar um 'loading' na tela no futuro
  };
};
