// components/inventory/database-report/types.ts
// Tipos e interfaces para o relatório de inventário, incluindo a configuração do relatório e os dados dos produtos.
import type { ProductCount } from "@/lib/types";

export interface DatabaseReportConfig {
  // Metadados
  reportTitle: string;
  customScope: string;
  hideTempItems?: boolean;

  // Filtros básicos
  showCorrect: boolean;
  showSurplus: boolean;
  showMissing: boolean;

  // Organização e filtros avançados
  groupByCategory: boolean;
  groupBySubcategory: boolean;
  showCategoryTotals: boolean;
  showSubCategoryTotals: boolean;
  showCategoryInItem: boolean;

  // Modo resumo
  showOnlyCategorySummary: boolean; // Exibir apenas o cabeçalho/total da categoria
  showOnlySubcategorySummary: boolean; // Exibir apenas o cabeçalho/total da subcategoria

  selectedCategories: string[];
  selectedSubcategories: string[];

  // Colunas da tabela
  showSystemBalance: boolean;
  showCountColumn: boolean;
  showDifference: boolean;
  showValues: boolean;

  // Cards de resumo
  showCardSku: boolean;
  showCardVolume: boolean;
  showCardTicket: boolean;
  showCardTotalValue: boolean;

  // Layout e estilo
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;
  orientation: "portrait" | "landscape";

  // Rodapé e assinaturas
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
