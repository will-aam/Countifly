// components/inventory/database-report/types.ts

import type { ProductCount } from "@/lib/types";

export interface DatabaseReportConfig {
  // --- Metadados ---
  reportTitle: string;
  customScope: string;
  hideTempItems?: boolean; // ✅ ADICIONAR

  // --- Filtros Básicos ---
  showCorrect: boolean;
  showSurplus: boolean;
  showMissing: boolean;

  // --- Organização e Filtros Avançados ---
  groupByCategory: boolean;
  groupBySubcategory: boolean;
  showCategoryTotals: boolean;
  showSubCategoryTotals: boolean;
  showCategoryInItem: boolean;

  // --- NOVAS PROPRIEDADES (MODO RESUMO) ---
  showOnlyCategorySummary: boolean; // Exibir apenas o cabeçalho/total da categoria
  showOnlySubcategorySummary: boolean; // Exibir apenas o cabeçalho/total da subcategoria
  // ----------------------------------------

  selectedCategories: string[];
  selectedSubcategories: string[];

  // --- Colunas da Tabela ---
  showSystemBalance: boolean;
  showCountColumn: boolean;
  showDifference: boolean;
  showValues: boolean;

  // --- Cards de Resumo ---
  showCardSku: boolean;
  showCardVolume: boolean;
  showCardTicket: boolean;
  showCardTotalValue: boolean;

  // --- Layout e Estilo ---
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;

  orientation: "portrait" | "landscape";

  // --- Rodapé e Assinaturas ---
  showSignatureBlock: boolean;
  showCpfLine: boolean;
  truncateLimit: number;
}

export interface DatabaseReportProps {
  items: ProductCount[];
  meta?: {
    date: string;
    clientName: string;
    fileName: string;
  };
  onBack: () => void;
}
