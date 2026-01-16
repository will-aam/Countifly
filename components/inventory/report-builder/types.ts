// components/inventory/report-builder/types.ts

import type { ProductCount } from "@/lib/types";

export interface ReportConfig {
  // Filtros de Dados
  showCorrect: boolean;
  showSurplus: boolean;
  showMissing: boolean;

  // --- ADICIONE ESTA LINHA AQUI ---
  hideTempItems: boolean; // Ocultar itens novos (TEMP-*)
  // --------------------------------

  // Visualização dos Cards
  showCardSku: boolean;
  showCardSystem: boolean;
  showCardCounted: boolean;
  showCardDivergence: boolean;
  showCardAccuracy: boolean;

  showCardItemsCorrect: boolean;
  showCardItemsMissing: boolean;
  showCardItemsSurplus: boolean;

  // Layout da Tabela
  showAuditColumn: boolean;
  hideDecimals: boolean;
  showInternalCode: boolean;
  sortByBiggestError: boolean;

  // Metadados
  reportTitle: string;
  customScope: string;

  // Layout e Assinaturas
  showSignatureBlock: boolean;
  showCpfLine: boolean;
  truncateLimit: number;

  // Logo
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;
}

export interface ReportBuilderProps {
  items: ProductCount[];
  meta?: {
    date: string;
    userName?: string;
    sessionId?: string | number;
  };
  onBack: () => void;
}
