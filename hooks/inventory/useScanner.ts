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
      title: "Modo Demo Ativado",
      className: "bg-blue-600 text-white border-none",
    });
  }, []);

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

      // HIERARQUIA 1: Busca na Importação Local
      const barCode = barCodes.find((bc) =>
        areBarcodesEqual(bc.codigo_de_barras, code),
      );
      if (barCode?.produto) {
        setCurrentProduct(barCode.produto);
        vibrateSuccess();
        return;
      }

      // HIERARQUIA 1.5: Busca em temporários já bipados
      const tempProduct = tempProducts.find((tp) =>
        areBarcodesEqual(tp.codigo_de_barras, code),
      );
      if (tempProduct) {
        setCurrentProduct(tempProduct);
        vibrateSuccess();
        return;
      }

      if (isDemoMode) {
        const demoProduct: TempProduct = {
          id: `DEMO-${code}`,
          codigo_de_barras: code,
          codigo_produto: `DEMO-${code}`,
          descricao: `Item de Teste`,
          saldo_estoque: 10,
          isTemporary: true,
        };
        setTempProducts((prev) => [...prev, demoProduct]);
        setCurrentProduct(demoProduct);
        vibrateSuccess();
        return;
      }

      // HIERARQUIA 2: Busca na Base Global (Neon)
      if (searchProductOnline) {
        setIsSearchingOnline(true);
        const onlineProduct = await searchProductOnline(code);
        setIsSearchingOnline(false);

        if (onlineProduct) {
          setCurrentProduct(onlineProduct);
          vibrateSuccess();
          toast({
            title: "Base Global",
            description: onlineProduct.descricao,
            className: "bg-emerald-600 text-white border-none",
          });
          return;
        }
      }

      // HIERARQUIA 3: Produto Temporário (Novo Item)
      const newTempProduct: TempProduct = {
        id: `TEMP-${code}`,
        codigo_de_barras: code,
        codigo_produto: `TEMP-${code}`,
        descricao: `Novo Item`,
        saldo_estoque: 0,
        isTemporary: true,
      };

      setTempProducts((prev) => [...prev, newTempProduct]);
      setCurrentProduct(newTempProduct);
      vibrateError();

      toast({
        title: "Item não cadastrado",
        description: "Digite a quantidade para adicionar.",
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
    isSearchingOnline,
  };
};
