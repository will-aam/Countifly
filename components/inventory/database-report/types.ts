// components/inventory/database-report/types.ts

import type { ProductCount } from "@/lib/types";

export interface DatabaseReportConfig {
  // --- Metadados ---
  reportTitle: string;
  customScope: string; // Faltava este

  // --- Filtros Básicos ---
  showCorrect: boolean;
  showSurplus: boolean;
  showMissing: boolean;

  // --- Organização e Filtros Avançados ---
  groupByCategory: boolean;
  groupBySubcategory: boolean;
  showCategoryTotals: boolean; // Faltava este
  showSubCategoryTotals: boolean; // Faltava este
  showCategoryInItem: boolean; // Faltava este

  selectedCategories: string[];
  selectedSubcategories: string[];

  // --- Colunas da Tabela ---
  showSystemBalance: boolean;
  showCountColumn: boolean;
  showDifference: boolean;
  showValues: boolean;

  // --- Cards de Resumo (Faltavam todos estes) ---
  showCardSku: boolean;
  showCardVolume: boolean;
  showCardTicket: boolean;
  showCardTotalValue: boolean;

  // --- Layout e Estilo (Faltavam estes) ---
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;

  orientation: "portrait" | "landscape";

  // --- Rodapé e Assinaturas ---
  showSignatureBlock: boolean; // Renomeado de showSignature para bater com o painel
  showCpfLine: boolean; // Faltava este
  truncateLimit: number; // Faltava este
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
