"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeScanner } from "@/components/features/barcode-scanner";
import { BarcodeDisplay } from "@/components/shared/BarcodeDisplay";
import type { MixedProductCount, MixedSettings } from "./useMixedInventory";
import type { Product, TempProduct } from "@/lib/types";
import {
  Scan,
  Store,
  Package,
  Camera,
  Plus,
  Trash2,
  Search,
  Eraser,
  Check,
  X,
  Calculator,
  CloudUpload,
  Layers,
  AlertCircle,
} from "lucide-react";
import { formatNumberBR, validateDateBR, formatDateInputBR, checkValidadeStatusBR } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface MixedConferenceTabProps {
  scanInput: string;
  setScanInput: (val: string) => void;
  handleScan: (code?: string) => void;
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
  currentProduct: Product | TempProduct | null;
  setCurrentProduct: (product: Product | TempProduct | null) => void;
  descriptionInput?: string;
  setDescriptionInput?: (val: string) => void;
  quantityInput: string;
  setQuantityInput: (val: string) => void;
  locationInput: string;
  setLocationInput: (val: string) => void;
  validadeInput: string;
  setValidadeInput: (val: string) => void;
  loteInput: string;
  setLoteInput: (val: string) => void;
  countingMode: "loja" | "estoque";
  setCountingMode: (mode: "loja" | "estoque") => void;
  handleAddCount: () => void;
  counts: MixedProductCount[];
  handleRemoveCount: (id: string | number) => void;
  handleClearCountsOnly: () => void;
  handleSaveCount?: () => void;
  hasImportedCatalog?: boolean;
  catalogCount?: number;
  isImportReady?: boolean;
  onGoToImport: () => void;
  settings: MixedSettings;
  externalScannerMode?: boolean;
  externalScannerModeReady?: boolean;
  statusItemInput?: "NORMAL" | "AVARIADO" | "VENCIDO";
  setStatusItemInput?: (val: "NORMAL" | "AVARIADO" | "VENCIDO") => void;
  barcodeLength?: number;
}

// Subcomponente do item contado na lista da direita (mesmo design da contagem por importação)
const MixedCountItem: React.FC<{
  item: MixedProductCount;
  hasImportedCatalog?: boolean;
  blindCountMode?: boolean;
  onConfirmDelete: (id: string | number) => void;
}> = ({ item, hasImportedCatalog, blindCountMode, onConfirmDelete }) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <div
      className="
      flex items-center justify-between p-3 rounded-lg mb-2
      bg-blue-100 border border-blue-300
      dark:bg-primary/5 dark:border-primary/10
    "
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate uppercase">{item.descricao}</p>

        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
          <span className="font-mono">Cód:</span>
          <BarcodeDisplay value={item.codigo_de_barras} />
          {hasImportedCatalog && !blindCountMode && item.saldo_estoque !== undefined && (
            <span className="font-mono truncate">
              | Imp: {formatNumberBR(item.saldo_estoque)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* Badge Loja */}
          {((item.quant_loja ?? 0) > 0 || (item.tipo_local === "LOJA" && (item.quant_estoque ?? 0) === 0)) && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md font-medium border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
            >
              Loja: {formatNumberBR(item.quant_loja ?? (item.tipo_local === "LOJA" ? item.quantidade : 0))}
            </Badge>
          )}

          {/* Badge Estoque */}
          {((item.quant_estoque ?? 0) > 0 || (item.tipo_local === "ESTOQUE" && (item.quant_loja ?? 0) === 0)) && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md font-medium border-purple-300 bg-purple-50 text-purple-900 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200"
            >
              Estoque: {formatNumberBR(item.quant_estoque ?? (item.tipo_local === "ESTOQUE" ? item.quantidade : 0))}
            </Badge>
          )}

          {/* Badge Total quando tiver ambos */}
          {(item.quant_loja ?? 0) > 0 && (item.quant_estoque ?? 0) > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 rounded-md font-bold"
            >
              Total: {formatNumberBR(item.quantidade)}
            </Badge>
          )}

          {item.status_item === "AVARIADO" && (
            <Badge className="text-[10px] h-5 px-1.5 rounded-md font-bold bg-red-600 text-white border-none">
              Avariado
            </Badge>
          )}

          {item.status_item === "VENCIDO" && (
            <Badge className="text-[10px] h-5 px-1.5 rounded-md font-bold bg-amber-600 text-white border-none">
              Vencido
            </Badge>
          )}

          {item.localizacao && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md font-mono border border-slate-300 bg-white/60 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100"
            >
              Local: {item.localizacao}
            </Badge>
          )}

          {item.validade && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md font-mono border border-slate-300 bg-white/60 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100"
            >
              Val: {item.validade}
            </Badge>
          )}

          {item.lote && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 rounded-md font-mono border-slate-300 bg-white/60 text-slate-900 dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-100"
            >
              Lote: {item.lote}
            </Badge>
          )}
        </div>
      </div>

      <div className="ml-2 shrink-0">
        {!confirming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-transparent transition-colors"
            aria-label="Excluir item"
            title="Excluir item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfirmDelete(item.id)}
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-transparent"
              aria-label="Confirmar exclusão"
              title="Confirmar"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
              aria-label="Cancelar exclusão"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export function MixedConferenceTab({
  scanInput,
  setScanInput,
  handleScan,
  isCameraActive,
  setIsCameraActive,
  currentProduct,
  setCurrentProduct,
  descriptionInput = "",
  setDescriptionInput,
  quantityInput,
  setQuantityInput,
  locationInput,
  setLocationInput,
  validadeInput,
  setValidadeInput,
  loteInput,
  setLoteInput,
  countingMode,
  setCountingMode,
  handleAddCount,
  counts,
  handleRemoveCount,
  handleClearCountsOnly,
  handleSaveCount,
  hasImportedCatalog = false,
  catalogCount = 0,
  isImportReady,
  onGoToImport,
  settings,
  externalScannerMode = false,
  externalScannerModeReady = false,
  statusItemInput = "NORMAL",
  setStatusItemInput,
  barcodeLength = 13,
}: MixedConferenceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastScannedCodeRef = useRef<string>("");
  const [isDesktop, setIsDesktop] = useState(false);

  // Detecta se a aplicação está rodando em desktop (para desativar câmera da webcam)
  useEffect(() => {
    const checkIsDesktop = () => {
      if (typeof window === "undefined" || typeof navigator === "undefined") return;
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 1024;
      const isTouch = navigator.maxTouchPoints > 0;
      const isMobile = isMobileUA || (isSmallScreen && isTouch);
      setIsDesktop(!isMobile);
    };

    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const handleCameraClick = () => {
    if (isDesktop) {
      toast({
        title: "Câmera disponível apenas no celular",
        description: "A leitura por câmera é exclusiva para dispositivos móveis (smartphones/coletores). No desktop, utilize o leitor de código de barras ou digite o código.",
      });
      return;
    }
    setIsCameraActive(true);
  };

  useEffect(() => {
    if (!externalScannerModeReady || isCameraActive) return;
    barcodeInputRef.current?.focus();
  }, [externalScannerModeReady, externalScannerMode, isCameraActive]);

  useEffect(() => {
    if (!confirmClearAll) return;
    const t = setTimeout(() => setConfirmClearAll(false), 3500);
    return () => clearTimeout(t);
  }, [confirmClearAll]);

  // Busca automática do scanner configurada pelo tamanho exato (padrão: 13 caracteres)
  useEffect(() => {
    const trimmed = (scanInput || "").trim();
    if (!trimmed) {
      lastScannedCodeRef.current = "";
      return;
    }

    // Apenas dispara a busca automática quando atingir o tamanho exato configurado (padrão: 13)
    if (trimmed.length !== barcodeLength) {
      return;
    }

    if (lastScannedCodeRef.current === trimmed) {
      return;
    }

    const currentCode = currentProduct?.codigo_produto || (currentProduct as any)?.codigo_de_barras;
    if (currentCode && String(currentCode).trim().toLowerCase() === trimmed.toLowerCase()) {
      lastScannedCodeRef.current = trimmed;
      return;
    }

    const timer = setTimeout(() => {
      lastScannedCodeRef.current = trimmed;
      handleScan(trimmed);
    }, 200);

    return () => clearTimeout(timer);
  }, [scanInput, currentProduct, handleScan, barcodeLength]);

  const currentTotalCount = useMemo(() => {
    if (!currentProduct) return 0;
    const code = currentProduct.codigo_produto;
    const bar = (currentProduct as any).codigo_de_barras;
    return counts
      .filter((c) => (code && c.codigo_produto === code) || (bar && c.codigo_de_barras === bar))
      .reduce((acc, c) => acc + c.quantidade, 0);
  }, [currentProduct, counts]);

  const filteredCounts = useMemo(() => {
    if (!searchQuery.trim()) return counts;
    const q = searchQuery.toLowerCase();
    return counts.filter(
      (c) =>
        c.descricao?.toLowerCase().includes(q) ||
        c.codigo_de_barras?.toLowerCase().includes(q) ||
        c.codigo_produto?.toLowerCase().includes(q) ||
        c.localizacao?.toLowerCase().includes(q) ||
        c.lote?.toLowerCase().includes(q)
    );
  }, [counts, searchQuery]);

  function handleCalculo() {
    if (!quantityInput) return;
    try {
      const normalized = quantityInput.replace(/,/g, ".");
      const result = Function(`"use strict"; return (${normalized})`)();
      if (Number.isFinite(result)) {
        setQuantityInput(String(result));
      }
    } catch {
      // erro silencioso
    }
  }

  // Validação estrita de data no padrão brasileiro DD/MM/AAAA
  const validadeValidation = useMemo(() => {
    if (!validadeInput.trim()) return { isValid: true };
    if (validadeInput.length < 10) {
      return { isValid: false, error: "Data incompleta (DD/MM/AAAA)" };
    }
    return validateDateBR(validadeInput);
  }, [validadeInput]);

  // Poka-Yoke: Análise temporal da data informada (passada vs. futura)
  const validadeStatus = useMemo(() => {
    return checkValidadeStatusBR(validadeInput);
  }, [validadeInput]);

  // Proteção automática: se data for futura, impede marcar como Vencido; se expirada, sugere Vencido
  useEffect(() => {
    if (validadeStatus.isValid && validadeStatus.isFuture && statusItemInput === "VENCIDO") {
      setStatusItemInput?.("NORMAL");
    } else if (validadeStatus.isValid && validadeStatus.isExpired && statusItemInput === "NORMAL") {
      setStatusItemInput?.("VENCIDO");
    }
  }, [validadeStatus, statusItemInput, setStatusItemInput]);

  // Digitação manual com máscara e controle rigoroso de dias e meses em tempo real
  const handleValidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInputBR(e.target.value, validadeInput);
    setValidadeInput(formatted);
  };

  return (
    <div className="flex flex-col gap-8 lg:gap-6 lg:grid lg:grid-cols-2 w-full lg:items-stretch">
      {/* --- COLUNA ESQUERDA: Scanner e Inputs --- */}
      <div className="flex flex-col gap-4 w-full lg:rounded-xl lg:border lg:border-border lg:shadow-sm lg:bg-card lg:p-6">
        {/* Cabeçalho com indicador de modo (Com ou Sem Catálogo Importado) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center">
            <Scan className="h-5 w-5 mr-2" />
            <span className="font-semibold text-lg">Scanner</span>
          </div>
          {hasImportedCatalog ? (
            <Badge
              variant="outline"
              className="text-xs border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1.5"
            >
              <Layers className="h-3 w-3" />
              Catálogo: {catalogCount} itens
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-xs border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 items-center gap-1.5"
              >
                Sem Catálogo (Modo Livre)
              </Badge>

            </div>
          )}
        </div>

        {/* Modo Loja/Estoque */}
        <div className="w-full">
          <Tabs
            value={countingMode}
            onValueChange={(v) => setCountingMode(v as "loja" | "estoque")}
            className="w-full"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-md bg-muted p-1">
              <TabsTrigger
                value="loja"
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Store className="h-3 w-3" />
                Loja
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="gap-2 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Package className="h-3 w-3" />
                Estoque
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conteúdo do Scanner */}
        <div className="flex flex-col gap-4 mt-2">
          {isCameraActive ? (
            <BarcodeScanner
              onScan={(barcode) => {
                setScanInput(barcode);
                setIsCameraActive(false);
                handleScan(barcode);
              }}
              onClose={() => setIsCameraActive(false)}
            />
          ) : (
            <>
              {/* Campo Localização (no topo, antes de bipar o produto) */}
              {settings.showLocalizacao && (
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="location" className="text-xs font-semibold flex items-center gap-1.5">
                      Localização
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Defina antes de bipar</span>
                  </div>
                  <Input
                    id="location"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Ex: Corredor A, Prateleira 2"
                    className="h-10 text-sm bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        barcodeInputRef.current?.focus();
                      }
                    }}
                  />
                </div>
              )}

              {/* Campo Código de Barras */}
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  {settings.lockManualInput && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Trava anti-digitação ativa (somente leitor/câmera)
                    </span>
                  )}
                </div>
                <div className="flex space-x-2 w-full">
                  <Input
                    ref={barcodeInputRef}
                    id="barcode"
                    type="tel"
                    inputMode={externalScannerMode || settings.lockManualInput ? "none" : "numeric"}
                    readOnly={settings.lockManualInput}
                    value={scanInput}
                    onChange={(e) => {
                      if (settings.lockManualInput) return;
                      setScanInput(e.target.value.replace(/\D/g, ""));
                    }}
                    placeholder={settings.lockManualInput ? "Aguardando leitor ou câmera..." : "Digite ou bipe o código..."}
                    className="flex-1 w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleScan();
                    }}
                  />
                  <Button onClick={() => handleScan()} type="button" disabled={settings.lockManualInput && !scanInput}>
                    <Scan className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleCameraClick}
                    variant="outline"
                    type="button"
                    className={isDesktop ? "opacity-50 text-muted-foreground hover:bg-muted/50 cursor-pointer" : ""}
                    title={isDesktop ? "Função disponível apenas para celular/mobile" : "Escanear com a câmera"}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Card do Produto Selecionado */}
              {currentProduct && (
                <div
                  className={`p-4 border rounded-lg w-full ${"isTemporary" in currentProduct && currentProduct.isTemporary
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3 overflow-hidden">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-semibold truncate text-xs uppercase opacity-70">
                        {"isTemporary" in currentProduct && currentProduct.isTemporary
                          ? "Item Não Cadastrado (Novo)"
                          : "Item Identificado"}
                      </h3>

                      {/* Descrição do produto: somente leitura por padrão; editável se ativado nas configurações */}
                      {settings.allowEditDescription ? (
                        <div className="mt-1.5 space-y-1">
                          <Label htmlFor="custom-desc" className="text-[11px] text-muted-foreground font-medium">
                            Descrição do Produto:
                          </Label>
                          <Input
                            id="custom-desc"
                            value={descriptionInput}
                            onChange={(e) => setDescriptionInput?.(e.target.value)}
                            placeholder="Digite o nome do produto..."
                            className="h-8 text-xs font-semibold bg-background"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-bold truncate uppercase mt-1">
                          {descriptionInput || currentProduct.descricao || "Item sem descrição"}
                        </p>
                      )}

                      <p className="text-[11px] mt-1 font-mono">
                        Cód: {scanInput || currentProduct.codigo_produto}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {hasImportedCatalog && (
                        settings.blindCountMode ? (
                          <Badge variant="outline" className="min-w-[90px] justify-center text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                            Cega: Oculto
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="min-w-[90px] justify-center text-[10px]">
                            Sist: {formatNumberBR(currentProduct.saldo_estoque || 0)}
                          </Badge>
                        )
                      )}
                      <Badge variant="secondary" className="min-w-[90px] justify-center text-[10px]">
                        Cont: {formatNumberBR(currentTotalCount)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantidade (Coleta ativa vs. Modo Levantamento) */}
              {settings.coletarQuantidade !== false ? (
                <div className="space-y-2 w-full">
                  <Label htmlFor="quantity">
                    Quantidade {countingMode === "loja" ? "em Loja" : "em Estoque"}
                  </Label>
                  <div className="relative w-full">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCalculo();
                      }}
                    >
                      <Input
                        id="quantity"
                        type="tel"
                        value={quantityInput}
                        onChange={(e) =>
                          setQuantityInput(e.target.value.replace(/[^0-9+\-*/.,]/g, ""))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCalculo();
                            handleAddCount();
                            barcodeInputRef.current?.focus();
                          }
                        }}
                        inputMode="decimal"
                        className="h-12 text-lg font-semibold pl-9 w-full"
                      />
                      <button type="submit" className="hidden" />
                    </form>
                    <Calculator className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary flex items-center justify-between">
                  <span className="font-semibold">Modo Levantamento Ativo</span>
                  <Badge variant="secondary" className="text-[10px]">1 unidade por item bipado</Badge>
                </div>
              )}

              {/* Campos Especializados (Validade e Lote) */}
              {(settings.showValidade || settings.showLote) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

                  {settings.showValidade && (
                    <div className="space-y-1.5">
                      <Label htmlFor="validade" className="text-xs font-medium">
                        Validade
                      </Label>
                      <Input
                        id="validade"
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/AAAA"
                        value={validadeInput}
                        onChange={handleValidadeChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!validadeValidation.isValid) return;
                            handleAddCount();
                            barcodeInputRef.current?.focus();
                          }
                        }}
                        className={`h-10 text-sm font-mono transition-colors ${!validadeValidation.isValid && validadeInput.trim()
                          ? "border-destructive focus-visible:ring-destructive bg-red-50/20 dark:bg-red-950/20"
                          : ""
                          }`}
                      />
                    </div>
                  )}

                  {settings.showLote && (
                    <div className="space-y-1.5">
                      <Label htmlFor="lote" className="text-xs font-medium">
                        Lote
                      </Label>
                      <Input
                        id="lote"
                        value={loteInput}
                        onChange={(e) => setLoteInput(e.target.value)}
                        placeholder="Ex: LOTE-123"
                        className="h-10 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCount();
                            barcodeInputRef.current?.focus();
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Mensagem de validação de data abaixo de ambos os campos (preserva o alinhamento de Validade e Lote) */}
                  {settings.showValidade && !validadeValidation.isValid && Boolean(validadeInput.trim()) && (
                    <div className="sm:col-span-2 -mt-1">
                      <p className="text-[11px] text-destructive font-medium flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Validade: {validadeValidation.error}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Prevenção de Perdas: Status do Item (Normal, Avariado, Vencido) */}
              {settings.showStatusItem !== false && setStatusItemInput && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Prevenção de Perdas</Label>
                    <span className="text-[10px] text-muted-foreground">Segregar avariados ou vencidos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={statusItemInput === "NORMAL" ? "default" : "outline"}
                      className={`h-9 text-xs font-semibold ${statusItemInput === "NORMAL" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        }`}
                      onClick={() => setStatusItemInput("NORMAL")}
                    >
                      Normal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={statusItemInput === "AVARIADO" ? "default" : "outline"}
                      className={`h-9 text-xs font-semibold ${statusItemInput === "AVARIADO" ? "bg-red-600 hover:bg-red-700 text-white" : ""
                        }`}
                      onClick={() => setStatusItemInput("AVARIADO")}
                    >
                      Avariado
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={statusItemInput === "VENCIDO" ? "default" : "outline"}
                      aria-disabled={validadeStatus.isValid && validadeStatus.isFuture}
                      className={`h-9 text-xs font-semibold transition-opacity ${statusItemInput === "VENCIDO" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                        } ${validadeStatus.isValid && validadeStatus.isFuture
                          ? "opacity-35 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                          : ""
                        }`}
                      title={
                        validadeStatus.isValid && validadeStatus.isFuture
                          ? "Validade futura: produto dentro do prazo não pode ser marcado como vencido"
                          : "Classificar como Vencido"
                      }
                      onClick={() => {
                        if (validadeStatus.isValid && validadeStatus.isFuture) {
                          toast({
                            title: "Produto dentro do prazo de validade",
                            description: `A data ${validadeInput} é futura. Escolha "Normal" ou "Avariado" se houver dano na embalagem.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        setStatusItemInput("VENCIDO");
                      }}
                    >
                      Vencido
                    </Button>
                  </div>
                  {/* Mensagem educativa anti-erro (Poka-Yoke) */}
                  {validadeStatus.isValid && validadeStatus.isFuture && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <span>✓ Validade futura ({validadeInput}): opção "Vencido" bloqueada para evitar inconsistências.</span>
                    </p>
                  )}
                  {validadeStatus.isValid && validadeStatus.isExpired && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <span> Data expirada ({validadeInput}): produto pré-classificado como Vencido.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Botão Adicionar Item */}
              <Button
                onClick={() => {
                  if (settings.showValidade && validadeInput.trim() && !validadeValidation.isValid) return;
                  handleAddCount();
                  barcodeInputRef.current?.focus();
                }}
                className="w-full h-12 font-bold"
                disabled={
                  !currentProduct ||
                  (settings.coletarQuantidade !== false && !quantityInput) ||
                  (settings.showValidade && Boolean(validadeInput.trim()) && !validadeValidation.isValid)
                }
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />{" "}
                {settings.coletarQuantidade === false ? "Cadastrar no Levantamento" : "Adicionar item"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: Lista de Itens Contados --- */}
      <div className="flex flex-col w-full lg:relative lg:h-full">
        <div className="flex flex-col w-full gap-4 lg:gap-0 lg:absolute lg:inset-0 lg:rounded-xl lg:border lg:border-border lg:shadow-sm lg:bg-card">
          {/* Cabeçalho e Busca */}
          <div className="space-y-4 w-full shrink-0 lg:p-6 lg:pb-4 lg:border-b lg:border-border/50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">
                Itens Contados ({counts.length})
              </span>

              {counts.length > 0 && (
                <div className="flex items-center gap-1">
                  {!confirmClearAll ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-transparent px-2"
                      onClick={() => setConfirmClearAll(true)}
                      title="Limpar contagens"
                    >
                      <Eraser className="h-4 w-4 mr-1.5" /> Limpar
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:bg-transparent"
                        onClick={() => {
                          handleClearCountsOnly();
                          setConfirmClearAll(false);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-transparent"
                        onClick={() => setConfirmClearAll(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Área da Lista Rolável */}
          <div className="flex-1 flex flex-col overflow-hidden w-full p-4 bg-card border border-border rounded-xl shadow-sm lg:p-6 lg:bg-transparent lg:border-none lg:rounded-none lg:shadow-none min-h-0">
            <div className="space-y-2 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y pr-1 w-full flex-1 max-h-[45vh] sm:max-h-[400px] lg:max-h-none">
              {filteredCounts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 h-full flex flex-col items-center justify-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum item na lista</p>
                </div>
              ) : (
                filteredCounts.map((item) => (
                  <MixedCountItem
                    key={item.id}
                    item={item}
                    hasImportedCatalog={hasImportedCatalog}
                    blindCountMode={settings.blindCountMode}
                    onConfirmDelete={handleRemoveCount}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
