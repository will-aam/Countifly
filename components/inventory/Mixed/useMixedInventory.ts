"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Product, TempProduct } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { getStoredCompanyContext } from "@/lib/company-context";
import { findGlobalCatalogOffline } from "@/lib/db";
import { validateDateBR } from "@/lib/utils";
import * as Papa from "papaparse";

export interface MixedProductCount {
  id: string | number;
  codigo_de_barras: string;
  codigo_produto?: string;
  descricao: string;
  saldo_estoque: number;

  // Quantidade contada nesta linha
  quantidade: number;
  quant_loja?: number;
  quant_estoque?: number;

  // Campos especializados do Modular
  localizacao: string; // Ex: Corredor A, Prateleira 2
  validade?: string;    // Data de validade (YYYY-MM-DD ou DD/MM/AAAA)
  lote?: string;        // Lote do produto

  // Dados financeiros e classificação
  custo?: number;       // Custo unitário para relatório financeiro
  preco?: number;       // Preço de venda
  curva_abc?: "A" | "B" | "C" | string; // Classificação do item no misto
  categoria?: string;
  ncm?: string;         // Classificação Fiscal NCM

  // Metadados
  tipo_local?: "LOJA" | "ESTOQUE";
  data_hora: string;
  status_item?: "NORMAL" | "AVARIADO" | "VENCIDO";
  recontado?: boolean;
}

export interface RecountLog {
  id: string;
  codigo: string;
  codigo_de_barras?: string;
  descricao: string;
  saldo_sistema: number;
  contagem_1: number;
  contagem_2: number;
  resultado_final: number;
  diferenca_final: number;
  status: "CONFIRMADO_1" | "CORRIGIDO";
  data_hora: string;
}

export interface MixedSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  directScanEnabled: boolean;
  defaultLocation: string; // Ex: "Corredor 1"
  defaultCountingLocation: "loja" | "estoque";
  showValidade: boolean;
  showLote: boolean;
  showLocalizacao: boolean;
  coletarQuantidade: boolean; // true: Contagem normal; false: Levantamento de Estoque (1 un. por item)
  showStatusItem: boolean;    // Ponto 4: Prevenção de Perdas (Normal / Avariado / Vencido)
  blindCountMode: boolean;    // Ponto 5: Contagem Cega (oculta saldo importado na leitura)
  lockManualInput: boolean;   // Ponto 5: Trava anti-digitação opcional (desativada por padrão)
  allowEditDescription: boolean; // Permitir ou não editar a descrição ao bipar (desativado por padrão)
  exportNcmEnabled: boolean;  // Ponto 8: Capturar e Exportar NCM (Fiscal) em segundo plano
}

export const DEFAULT_MIXED_SETTINGS: MixedSettings = {
  soundEnabled: false,
  vibrationEnabled: true,
  directScanEnabled: false,
  defaultLocation: "Geral",
  defaultCountingLocation: "loja",
  showValidade: true,
  showLote: true,
  showLocalizacao: true,
  coletarQuantidade: true,
  showStatusItem: true,
  blindCountMode: false,
  lockManualInput: false,
  allowEditDescription: false,
  exportNcmEnabled: true,
};

const getStorageKey = (userId: number, key: string) => `countifly_mixed_${key}_${userId}`;

export function useMixedInventory(userId: number | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<MixedProductCount[]>([]);
  const [settings, setSettings] = useState<MixedSettings>(DEFAULT_MIXED_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | TempProduct | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Formulário de coleta
  const [quantityInput, setQuantityInput] = useState("1");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [locationInput, setLocationInput] = useState("Geral");
  const [validadeInput, setValidadeInput] = useState("");
  const [loteInput, setLoteInput] = useState("");
  const [statusItemInput, setStatusItemInput] = useState<"NORMAL" | "AVARIADO" | "VENCIDO">("NORMAL");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");

  // Metadados de Fotografia e Corte (Pontos 2 e 5 do Manual)
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [corteEntrada, setCorteEntrada] = useState("");
  const [corteSaida, setCorteSaida] = useState("");

  // Auditoria de Corte / Log de Recontagem (Ponto 5 e Etapa Conferir)
  const [recountLogs, setRecountLogs] = useState<RecountLog[]>([]);

  // Tamanho do código de barras para busca automática do leitor (padrão 13, temporário por contagem)
  const [barcodeLength, setBarcodeLength] = useState<number>(13);

  // Carregar dados locais ao iniciar
  useEffect(() => {
    if (!userId) return;
    try {
      const savedSettings = localStorage.getItem(getStorageKey(userId, "settings"));
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_MIXED_SETTINGS, ...parsed });
        if (parsed.defaultLocation) setLocationInput(parsed.defaultLocation);
        if (parsed.defaultCountingLocation) setCountingMode(parsed.defaultCountingLocation);
      }

      const savedCatalog = localStorage.getItem(getStorageKey(userId, "catalog"));
      if (savedCatalog) {
        setProducts(JSON.parse(savedCatalog));
      }

      const savedCounts = localStorage.getItem(getStorageKey(userId, "counts"));
      if (savedCounts) {
        setCounts(JSON.parse(savedCounts));
      }

      const savedSnapshot = localStorage.getItem(getStorageKey(userId, "snapshot_date"));
      if (savedSnapshot) setSnapshotDate(savedSnapshot);

      const savedCorteE = localStorage.getItem(getStorageKey(userId, "corte_entrada"));
      if (savedCorteE) setCorteEntrada(savedCorteE);

      const savedCorteS = localStorage.getItem(getStorageKey(userId, "corte_saida"));
      if (savedCorteS) setCorteSaida(savedCorteS);

      const savedRecount = localStorage.getItem(getStorageKey(userId, "recount_logs"));
      if (savedRecount) {
        setRecountLogs(JSON.parse(savedRecount));
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Modular:", err);
    } finally {
      setIsLoaded(true);
    }
  }, [userId]);

  // Persistir metadados de auditoria e recontagem
  useEffect(() => {
    if (!userId || !isLoaded) return;
    try {
      if (snapshotDate) localStorage.setItem(getStorageKey(userId, "snapshot_date"), snapshotDate);
      else localStorage.removeItem(getStorageKey(userId, "snapshot_date"));

      if (corteEntrada) localStorage.setItem(getStorageKey(userId, "corte_entrada"), corteEntrada);
      else localStorage.removeItem(getStorageKey(userId, "corte_entrada"));

      if (corteSaida) localStorage.setItem(getStorageKey(userId, "corte_saida"), corteSaida);
      else localStorage.removeItem(getStorageKey(userId, "corte_saida"));

      localStorage.setItem(getStorageKey(userId, "recount_logs"), JSON.stringify(recountLogs));
    } catch (e) {
      // Falha silenciosa de persistência
    }
  }, [snapshotDate, corteEntrada, corteSaida, recountLogs, userId, isLoaded]);

  // Salvar contagens localmente sempre que mudar
  useEffect(() => {
    if (!userId || !isLoaded) return;
    try {
      localStorage.setItem(getStorageKey(userId, "counts"), JSON.stringify(counts));
    } catch (err) {
      console.error("Erro ao salvar contagens locais:", err);
    }
  }, [counts, userId, isLoaded]);

  // Salvar configurações
  const updateSettings = useCallback((updates: Partial<MixedSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      if (userId) {
        localStorage.setItem(getStorageKey(userId, "settings"), JSON.stringify(next));
      }
      return next;
    });
  }, [userId]);

  // Atualizar catálogo e salvar
  const updateCatalog = useCallback((newProducts: Product[]) => {
    setProducts(newProducts);
    const nowIso = new Date().toISOString();
    setSnapshotDate((prev) => prev || nowIso);
    if (userId) {
      localStorage.setItem(getStorageKey(userId, "catalog"), JSON.stringify(newProducts));
      if (!localStorage.getItem(getStorageKey(userId, "snapshot_date"))) {
        localStorage.setItem(getStorageKey(userId, "snapshot_date"), nowIso);
      }
    }
  }, [userId]);

  // Limpar contagens apenas
  const clearCountsOnly = useCallback(() => {
    setCounts([]);
    setRecountLogs([]);
    if (userId) {
      localStorage.removeItem(getStorageKey(userId, "counts"));
      localStorage.removeItem(getStorageKey(userId, "recount_logs"));
    }
    toast({ title: "Contagens limpas", description: "O catálogo importado foi mantido." });
  }, [userId]);

  // Limpar tudo (catálogo + contagens)
  const clearAllData = useCallback(() => {
    setProducts([]);
    setCounts([]);
    setRecountLogs([]);
    setCurrentProduct(null);
    setScanInput("");
    setBarcodeLength(13);
    setSnapshotDate(null);
    setCorteEntrada("");
    setCorteSaida("");
    if (userId) {
      localStorage.removeItem(getStorageKey(userId, "catalog"));
      localStorage.removeItem(getStorageKey(userId, "counts"));
      localStorage.removeItem(getStorageKey(userId, "recount_logs"));
      localStorage.removeItem(getStorageKey(userId, "snapshot_date"));
      localStorage.removeItem(getStorageKey(userId, "corte_entrada"));
      localStorage.removeItem(getStorageKey(userId, "corte_saida"));
    }
    toast({ title: "Dados apagados", description: "Catálogo e contagens foram resetados." });
  }, [userId]);

  // Aplicar Recontagem Obrigatória (Auditoria de Corte - Etapa Conferir)
  const handleApplyRecount = useCallback(
    (itemCode: string, newQty: number, status: "CONFIRMADO_1" | "CORRIGIDO") => {
      const prod = products.find(
        (p) =>
          p.codigo_produto === itemCode ||
          String((p as any).codigo_de_barras) === itemCode
      );

      const existingEntries = counts.filter(
        (c) =>
          c.codigo_produto === itemCode ||
          c.codigo_de_barras === itemCode
      );
      const originalCount = existingEntries.reduce((acc, c) => acc + c.quantidade, 0);
      const systemStock = Number(prod?.saldo_estoque || 0);

      const logEntry: RecountLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        codigo: itemCode,
        codigo_de_barras: (prod as any)?.codigo_de_barras || existingEntries[0]?.codigo_de_barras || itemCode,
        descricao: prod?.descricao || existingEntries[0]?.descricao || "Produto",
        saldo_sistema: systemStock,
        contagem_1: originalCount,
        contagem_2: newQty,
        resultado_final: newQty,
        diferenca_final: newQty - systemStock,
        status,
        data_hora: new Date().toISOString(),
      };

      setRecountLogs((prev) => [
        logEntry,
        ...prev.filter((l) => l.codigo !== itemCode),
      ]);

      setCounts((prev) => {
        const withoutItem = prev.filter(
          (c) =>
            c.codigo_produto !== itemCode &&
            c.codigo_de_barras !== itemCode
        );

        const baseEntry = existingEntries[0] || {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          codigo_de_barras: (prod as any)?.codigo_de_barras || itemCode,
          codigo_produto: prod?.codigo_produto || itemCode,
          descricao: prod?.descricao || "Produto Recontado",
          saldo_estoque: systemStock,
          localizacao: settings.defaultLocation || "Geral",
          custo: (prod as any)?.custo || prod?.preco || 0,
          curva_abc: (prod as any)?.curva_abc || "C",
          categoria: prod?.categoria || "Geral",
          tipo_local: settings.defaultCountingLocation === "estoque" ? "ESTOQUE" : "LOJA",
        };

        const updatedEntry: MixedProductCount = {
          ...baseEntry,
          quantidade: newQty,
          recontado: true,
          data_hora: new Date().toISOString(),
        };

        return [updatedEntry, ...withoutItem];
      });

      toast({
        title: "Recontagem registrada e validada!",
        description: `${logEntry.descricao}: ${newQty} un. (${status === "CONFIRMADO_1" ? "Confirmada 1ª Leitura" : "Ajustada"})`,
      });
    },
    [products, counts, settings.defaultLocation, settings.defaultCountingLocation]
  );

  // Buscar produto pelo código (opera com ou sem catálogo importado)
  const handleScan = useCallback(async (codeToScan?: string) => {
    const raw = (codeToScan || scanInput).trim();
    if (!raw) return;

    const clean = raw.toLowerCase();
    // 1. Tenta no catálogo importado (se houver)
    const found = products.find((p) => {
      const pCode = String(p.codigo_produto || "").toLowerCase();
      const pBar = String((p as any).codigo_de_barras || "").toLowerCase();
      return pCode === clean || pBar === clean;
    });

    if (found) {
      setCurrentProduct(found);
      setDescriptionInput(found.descricao);
      toast({ title: "Produto identificado no catálogo", description: found.descricao });

      // Se o produto importado não possui NCM e a captura fiscal está habilitada,
      // busca o NCM em segundo plano na Base Global sem bloquear o operador
      if (!found.ncm && settings.exportNcmEnabled !== false) {
        const barcodeToLookup = String((found as any).codigo_de_barras || found.codigo_produto || raw).trim();
        if (barcodeToLookup) {
          fetch(`/api/global-catalog?barcode=${encodeURIComponent(barcodeToLookup)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              const remoteNcm = (data?.ncm || data?.codigo_ncm || "").trim();
              if (remoteNcm) {
                found.ncm = remoteNcm;
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === found.id ||
                    p.codigo_produto === found.codigo_produto ||
                    String((p as any).codigo_de_barras) === barcodeToLookup
                      ? { ...p, ncm: remoteNcm }
                      : p
                  )
                );
                setCurrentProduct((curr) => {
                  if (!curr) return null;
                  const isSame =
                    curr.codigo_produto === found.codigo_produto ||
                    String((curr as any).codigo_de_barras) === barcodeToLookup;
                  return isSame ? { ...curr, ncm: remoteNcm } : curr;
                });
                setCounts((prev) =>
                  prev.map((c) =>
                    (c.codigo_produto === found.codigo_produto || c.codigo_de_barras === barcodeToLookup) && !c.ncm
                      ? { ...c, ncm: remoteNcm }
                      : c
                  )
                );
              }
            })
            .catch(() => {
              // Silencioso em caso de erro de rede ou código não encontrado
            });
        }
      }
      return;
    }

    // 2. Se não estiver no catálogo importado (ou operando sem catálogo):
    // Consulta a Base Global (offline IndexedDB e API online)
    setIsLoading(true);
    try {
      // 2a. IndexedDB Offline
      if (userId) {
        try {
          const cachedOffline = await findGlobalCatalogOffline(userId, raw);
          if (cachedOffline?.product) {
            const prod = cachedOffline.product;
            const globalProduct: Product = {
              id: `GLOBAL-${prod.id || raw}`,
              codigo_produto: String(prod.codigo_produto || raw),
              descricao: prod.descricao || `Item ${raw}`,
              saldo_estoque: 0,
              preco: prod.price || 0,
              price: prod.price || 0,
              categoria: prod.categoria || "Geral",
              ncm: prod.ncm || (prod as any).codigo_ncm || undefined,
              ...({
                codigo_de_barras: raw,
                custo: prod.price || 0,
                curva_abc: "C",
              } as any),
            };
            setCurrentProduct(globalProduct);
            setDescriptionInput(globalProduct.descricao);
            toast({
              title: "Base Global (Offline)",
              description: prod.descricao,
              className: "bg-emerald-600 text-white border-none",
            });
            return;
          }
        } catch (e) {
          // fallback silencioso
        }
      }

      // 2b. API Online
      const res = await fetch(`/api/global-catalog?barcode=${encodeURIComponent(raw)}`);
      if (res.ok) {
        const itemData = await res.json();
        if (itemData && itemData.descricao) {
          const globalProduct: Product = {
            id: `GLOBAL-${itemData.id || raw}`,
            codigo_produto: String(itemData.codigo_barras || raw),
            descricao: itemData.descricao,
            saldo_estoque: 0,
            preco: Number(itemData.preco || 0),
            price: Number(itemData.preco || 0),
            categoria: itemData.categoria || "Geral",
            ncm: itemData.ncm || itemData.codigo_ncm || undefined,
            ...({
              codigo_de_barras: String(itemData.codigo_barras || raw),
              custo: Number(itemData.preco || 0),
              curva_abc: "C",
            } as any),
          };
          setCurrentProduct(globalProduct);
          setDescriptionInput(globalProduct.descricao);
          toast({
            title: "Base Global",
            description: itemData.descricao,
            className: "bg-emerald-600 text-white border-none",
          });
          return;
        }
      }
    } catch (err) {
      // Busca global silenciosa
    } finally {
      setIsLoading(false);
    }

    // 3. Não encontrado em nenhum catálogo -> Item Temporário / Novo Cadastro
    const temp: TempProduct = {
      id: `TEMP-${Date.now()}`,
      codigo_de_barras: raw,
      codigo_produto: raw,
      descricao: `Item não cadastrado (${raw})`,
      saldo_estoque: 0,
      isTemporary: true,
    };
    setCurrentProduct(temp);
    setDescriptionInput(`Item não cadastrado (${raw})`);
    toast({
      title: "Item não cadastrado",
      description: "Adicione as informações deste item.",
      variant: "default",
    });
  }, [scanInput, products, userId]);

  // Adicionar contagem
  const handleAddCount = useCallback(() => {
    if (!currentProduct) {
      toast({ title: "Bipe ou selecione um item primeiro", variant: "destructive" });
      return;
    }

    const finalLocation = locationInput.trim() || settings.defaultLocation || "Geral";
    const barCode = (currentProduct as any).codigo_de_barras || currentProduct.codigo_produto || scanInput;
    const finalDesc = (descriptionInput.trim() || currentProduct.descricao || `Item ${barCode}`).trim();

    // Modo Levantamento vs. Modo Contagem
    const isLevantamento = settings.coletarQuantidade === false;
    let qty = 1;

    // Validação estrita de data de validade (trata data como data real)
    if (settings.showValidade && validadeInput.trim()) {
      const dateCheck = validateDateBR(validadeInput);
      if (!dateCheck.isValid) {
        toast({
          title: "Data de validade inválida",
          description: dateCheck.error || "Informe uma data válida no formato DD/MM/AAAA.",
          variant: "destructive",
        });
        return;
      }

      // Poka-Yoke: Trava lógica para impedir marcar como VENCIDO um item com validade futura
      if (settings.showStatusItem && statusItemInput === "VENCIDO") {
        const parts = validadeInput.trim().split("/");
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const inputDate = new Date(y, m, d);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          inputDate.setHours(0, 0, 0, 0);

          if (inputDate.getTime() >= today.getTime()) {
            toast({
              title: "Incoerência de Validade",
              description: `A data informada (${validadeInput}) é futura. Um produto dentro do prazo de validade não pode ser classificado como Vencido.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }

    if (!isLevantamento) {
      qty = parseFloat(quantityInput.replace(",", "."));
      if (isNaN(qty) || qty <= 0) {
        toast({ title: "Informe uma quantidade válida", variant: "destructive" });
        return;
      }
    }

    const prodCode = currentProduct.codigo_produto;
    const finalValidade = settings.showValidade ? (validadeInput.trim() || undefined) : undefined;
    const finalLote = settings.showLote ? (loteInput.trim() || undefined) : undefined;
    const finalStatus = settings.showStatusItem ? statusItemInput : "NORMAL";

    // Procura se já existe um item com as mesmas características
    // (mesmo código, mesma localização textual, mesma validade, mesmo lote e mesmo status)
    const matchIndex = counts.findIndex((c) => {
      const sameCode =
        c.codigo_de_barras === barCode ||
        (prodCode && c.codigo_produto === prodCode) ||
        (c.codigo_de_barras && c.codigo_de_barras === prodCode);

      const sameLocation =
        (c.localizacao || "Geral").trim().toLowerCase() === finalLocation.toLowerCase();

      const sameValidade =
        (c.validade || "").trim().toLowerCase() === (finalValidade || "").toLowerCase();

      const sameLote =
        (c.lote || "").trim().toLowerCase() === (finalLote || "").toLowerCase();

      const sameStatus =
        (c.status_item || "NORMAL") === finalStatus;

      return sameCode && sameLocation && sameValidade && sameLote && sameStatus;
    });

    if (matchIndex >= 0) {
      if (isLevantamento) {
        toast({
          title: "Item já levantado",
          description: `"${finalDesc}" já consta no catálogo levantado.`,
          variant: "destructive",
        });
        return;
      }

      // Soma inteligente mantendo Loja e Estoque na mesma linha
      const existing = counts[matchIndex];
      const currentLoja = existing.quant_loja ?? (existing.tipo_local === "LOJA" ? existing.quantidade : 0);
      const currentEstoque = existing.quant_estoque ?? (existing.tipo_local === "ESTOQUE" ? existing.quantidade : 0);

      const newLoja = countingMode === "loja" ? currentLoja + qty : currentLoja;
      const newEstoque = countingMode === "estoque" ? currentEstoque + qty : currentEstoque;
      const newTotal = newLoja + newEstoque;

      const updatedEntry: MixedProductCount = {
        ...existing,
        ncm: existing.ncm || (currentProduct as any)?.ncm || undefined,
        quant_loja: newLoja,
        quant_estoque: newEstoque,
        quantidade: newTotal,
        tipo_local: countingMode === "estoque" ? "ESTOQUE" : "LOJA",
        data_hora: new Date().toISOString(),
      };

      setCounts((prev) => [updatedEntry, ...prev.filter((_, idx) => idx !== matchIndex)]);

      toast({
        title: "Contagem somada!",
        description: `${finalDesc}: Loja ${newLoja} | Estoque ${newEstoque} (Total: ${newTotal})`,
      });
    } else {
      // Nova linha de contagem com características únicas
      const newEntry: MixedProductCount = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        codigo_de_barras: barCode,
        codigo_produto: currentProduct.codigo_produto,
        descricao: finalDesc,
        saldo_estoque: Number(currentProduct.saldo_estoque || 0),
        quant_loja: countingMode === "loja" ? qty : 0,
        quant_estoque: countingMode === "estoque" ? qty : 0,
        quantidade: qty,
        localizacao: finalLocation,
        validade: finalValidade,
        lote: finalLote,
        status_item: finalStatus,
        custo: (currentProduct as any).custo || (currentProduct as any).preco || 0,
        curva_abc: (currentProduct as any).curva_abc || "C",
        categoria: currentProduct.categoria || "Geral",
        ncm: (currentProduct as any)?.ncm || undefined,
        tipo_local: countingMode === "estoque" ? "ESTOQUE" : "LOJA",
        data_hora: new Date().toISOString(),
      };

      setCounts((prev) => [newEntry, ...prev]);

      toast({
        title: isLevantamento ? "Item cadastrado no levantamento!" : "Contagem registrada!",
        description: `${isLevantamento ? "" : `${qty}x `}${finalDesc} em ${finalLocation}`,
      });
    }

    // Limpar campos de entrada imediata
    setQuantityInput("1");
    setDescriptionInput("");
    setScanInput("");
    setStatusItemInput("NORMAL");
    setCurrentProduct(null);
  }, [
    currentProduct,
    quantityInput,
    descriptionInput,
    locationInput,
    validadeInput,
    loteInput,
    countingMode,
    settings.defaultLocation,
    settings.coletarQuantidade,
    settings.showStatusItem,
    statusItemInput,
    counts,
    scanInput,
  ]);

  // Remover um registro específico da lista
  const handleRemoveCount = useCallback((id: string | number) => {
    setCounts((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Registro removido" });
  }, []);

  // Download do template de importação para Modular
  const downloadTemplateCSV = useCallback(() => {
    const headers = [
      "codigo_de_barras",
      "codigo_produto",
      "descricao",
      "saldo_estoque",
      "custo_unitario",
      "curva_abc",
      "localizacao_padrao",
      "categoria",
      "ncm",
    ];
    const exampleRow = [
      "7891000100103",
      "PROD-001",
      "Leite Integral 1L",
      "100",
      "4.50",
      "A",
      "Corredor 2",
      "Laticínios",
      "04012010",
    ];

    const csvContent = "\uFEFF" + [headers.join(";"), exampleRow.join(";")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_inventario_modular.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    products,
    counts,
    settings,
    updateSettings,
    updateCatalog,
    isLoading,
    setIsLoading,
    currentProduct,
    setCurrentProduct,
    scanInput,
    setScanInput,
    handleScan,
    isCameraActive,
    setIsCameraActive,
    quantityInput,
    setQuantityInput,
    descriptionInput,
    setDescriptionInput,
    locationInput,
    setLocationInput,
    validadeInput,
    setValidadeInput,
    loteInput,
    setLoteInput,
    countingMode,
    setCountingMode,
    handleAddCount,
    handleRemoveCount,
    clearCountsOnly,
    clearAllData,
    downloadTemplateCSV,
    statusItemInput,
    setStatusItemInput,
    snapshotDate,
    setSnapshotDate,
    corteEntrada,
    setCorteEntrada,
    corteSaida,
    setCorteSaida,
    recountLogs,
    setRecountLogs,
    handleApplyRecount,
    barcodeLength,
    setBarcodeLength,
  };
}
