"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils";
import { playScannerFeedbackTone } from "@/lib/scanner-feedback";
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

export interface ScannerPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  directScanEnabled: boolean;
  isEnabled?: boolean;
  getCountingMode?: () => "loja" | "estoque";
  onFastCount?: (
    product: Product | TempProduct,
    barcode: string,
    countingMode?: "loja" | "estoque",
  ) => void;
}

const DEFAULT_SCANNER_PREFERENCES: ScannerPreferences = {
  soundEnabled: false,
  vibrationEnabled: true,
  directScanEnabled: false,
  isEnabled: true,
};

export const useScanner = (
  barCodes: BarCode[],
  searchProductOnline?: (barcode: string) => Promise<Product | null>,
  preferences: ScannerPreferences = DEFAULT_SCANNER_PREFERENCES,
) => {
  const [scanInput, setScanInput] = useState("");
  const [isCameraViewActive, setIsCameraViewActive] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const [tempProducts, setTempProducts] = useState<TempProduct[]>([]);
  const [currentProduct, setCurrentProduct] = useState<
    Product | TempProduct | null
  >(null);
  const scanInputRef = useRef(scanInput);
  const scanRequestRef = useRef(0);
  const pendingScanRef = useRef<{ code: string; promise: Promise<void> } | null>(
    null,
  );
  const lastAutoScannedCodeRef = useRef("");
  const globalProductCacheRef = useRef<Array<{ barcode: string; product: Product }>>(
    [],
  );
  const preferencesRef = useRef(preferences);

  scanInputRef.current = scanInput;
  preferencesRef.current = preferences;

  const provideFeedback = useCallback((kind: "success" | "not-found") => {
    const currentPreferences = preferencesRef.current;
    if (currentPreferences.vibrationEnabled) {
      if (kind === "success") vibrateSuccess();
      else vibrateError();
    }
    if (currentPreferences.soundEnabled) playScannerFeedbackTone(kind);
  }, []);

  const setResolvedProduct = useCallback(
    (
      product: Product | TempProduct,
      code: string,
      countingMode?: "loja" | "estoque",
    ) => {
      setCurrentProduct(product);
      provideFeedback("success");
      if (preferencesRef.current.directScanEnabled) {
        preferencesRef.current.onFastCount?.(product, code, countingMode);
      }
    },
    [provideFeedback],
  );

  const handleScan = useCallback(
    async (isManualAction = false) => {
      if (preferencesRef.current.isEnabled === false) return;
      const code = scanInputRef.current.trim();

      if (
        code === "" ||
        (!isManualAction && code.length < MIN_BARCODE_LENGTH)
      ) {
        if (
          isManualAction &&
          code === "" &&
          !preferencesRef.current.directScanEnabled
        ) {
          provideFeedback("not-found");
        }
        return;
      }

      if (pendingScanRef.current?.code === code) {
        return pendingScanRef.current.promise;
      }

      const requestId = ++scanRequestRef.current;
      const directScanForRequest = preferencesRef.current.directScanEnabled;
      const countingModeForRequest =
        preferencesRef.current.getCountingMode?.();
      const isCurrentRequest = () =>
        requestId === scanRequestRef.current &&
        scanInputRef.current.trim() === code;

      // HIERARQUIA 1: Busca somente entre os produtos importados pelo usuário.
      const barCode = barCodes.find((bc) =>
        bc.produto?.tipo_cadastro === "IMPORTADO" &&
        areBarcodesEqual(bc.codigo_de_barras, code),
      );
      if (barCode?.produto) {
        setResolvedProduct(barCode.produto, code, countingModeForRequest);
        return;
      }

      // HIERARQUIA 1.5: Busca em temporários já bipados
      const tempProduct = tempProducts.find((tp) =>
        areBarcodesEqual(tp.codigo_de_barras, code),
      );
      if (tempProduct) {
        setResolvedProduct(tempProduct, code, countingModeForRequest);
        return;
      }

      const cachedGlobalProduct = globalProductCacheRef.current.find((entry) =>
        areBarcodesEqual(entry.barcode, code),
      );
      if (cachedGlobalProduct) {
        setResolvedProduct(cachedGlobalProduct.product, code, countingModeForRequest);
        return;
      }

      // HIERARQUIA 2: Busca na Base Global.
      const request = (async () => {
        if (!searchProductOnline) {
          toast({
            title: "Catálogo global indisponível",
            description: "Não foi possível consultar o código de barras.",
            variant: "destructive",
          });
          return;
        }

        setIsSearchingOnline(true);
        let onlineProduct: Product | null;
        try {
          onlineProduct = await searchProductOnline(code);
        } catch {
          if (isCurrentRequest() || directScanForRequest) {
            toast({
              title: "Falha ao consultar o catálogo global",
              description:
                "Tente novamente. O item não foi marcado como não encontrado.",
              variant: "destructive",
            });
          }
          return;
        } finally {
          if (requestId === scanRequestRef.current) setIsSearchingOnline(false);
        }

        const isLatestScan = isCurrentRequest();
        if (!isLatestScan && !directScanForRequest) return;

        if (onlineProduct) {
          globalProductCacheRef.current = [
            ...globalProductCacheRef.current.filter(
              (entry) => !areBarcodesEqual(entry.barcode, code),
            ),
            { barcode: code, product: onlineProduct },
          ];
          if (isLatestScan) {
            setResolvedProduct(onlineProduct, code, countingModeForRequest);
            toast({
              title: "Base Global",
              description: onlineProduct.descricao,
              className: "bg-emerald-600 text-white border-none",
            });
          } else {
            provideFeedback("success");
            if (directScanForRequest) {
              preferencesRef.current.onFastCount?.(
                onlineProduct,
                code,
                countingModeForRequest,
              );
            }
          }
          return;
        }

        // HIERARQUIA 3: Item não encontrado nas duas bases.
        const newTempProduct: TempProduct = {
          id: `TEMP-${code}`,
          codigo_de_barras: code,
          codigo_produto: `TEMP-${code}`,
          descricao: "Item não encontrado",
          saldo_estoque: 0,
          isTemporary: true,
        };

        setTempProducts((prev) =>
          prev.some((item) => areBarcodesEqual(item.codigo_de_barras, code))
            ? prev
            : [...prev, newTempProduct],
        );
        if (isLatestScan) setCurrentProduct(newTempProduct);
        provideFeedback("not-found");
        if (directScanForRequest) {
          preferencesRef.current.onFastCount?.(
            newTempProduct,
            code,
            countingModeForRequest,
          );
        }

        toast({
          title: "Item não encontrado",
          description: directScanForRequest
            ? "O código não consta nas bases. Uma unidade foi adicionada como item não encontrado."
            : "O código não consta na importação nem no catálogo global. Digite a quantidade para contar.",
          variant: "destructive",
        });
      })();

      pendingScanRef.current = { code, promise: request };
      try {
        await request;
      } finally {
        if (pendingScanRef.current?.promise === request) {
          pendingScanRef.current = null;
        }
      }
    },
    [barCodes, tempProducts, searchProductOnline, provideFeedback, setResolvedProduct],
  );

  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      setIsCameraViewActive(false);
      scanInputRef.current = barcode;
      scanRequestRef.current += 1;
      pendingScanRef.current = null;
      lastAutoScannedCodeRef.current = "";
      setIsSearchingOnline(false);
      setCurrentProduct(null);
      setScanInput(barcode);
      void handleScan(true);
    },
    [handleScan],
  );

  const updateScanInput = useCallback((value: string) => {
    if (scanInputRef.current !== value) {
      scanInputRef.current = value;
      scanRequestRef.current += 1;
      pendingScanRef.current = null;
      lastAutoScannedCodeRef.current = "";
      setIsSearchingOnline(false);
      setCurrentProduct(null);
    }
    setScanInput(value);
  }, []);

  useEffect(() => {
    if (!scanInput) {
      setCurrentProduct(null);
      return;
    }
    if (scanInput.trim().length < MIN_BARCODE_LENGTH) return;
    const code = scanInput.trim();
    if (lastAutoScannedCodeRef.current === code) return;
    lastAutoScannedCodeRef.current = code;
    void handleScan(false);
  }, [scanInput, handleScan]);

  const resetScanner = useCallback(() => {
    scanInputRef.current = "";
    scanRequestRef.current += 1;
    pendingScanRef.current = null;
    lastAutoScannedCodeRef.current = "";
    setIsSearchingOnline(false);
    setScanInput("");
    setCurrentProduct(null);
  }, []);

  return {
    scanInput,
    setScanInput: updateScanInput,
    isCameraViewActive,
    setIsCameraViewActive,
    currentProduct,
    tempProducts,
    setTempProducts,
    handleScan,
    handleBarcodeScanned,
    resetScanner,
    isSearchingOnline,
  };
};
