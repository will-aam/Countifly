// components/inventory/database-report/types.ts

/**
 * Configuração visual específica para o Relatório de Auditoria de Banco de Dados.
 * Focado em Valuation (Financeiro) e Categorização.
 */

export interface DatabaseReportConfig {
  // Metadados
  reportTitle: string;
  customScope: string;

  // Visualização Geral
  showFinancials: boolean;

  // --- ORGANIZAÇÃO E HIERARQUIA (NOVO) ---
  groupByCategory: boolean; // Agrupar por Categoria (Macro)
  groupBySubCategory: boolean; // Agrupar por Subcategoria (Micro)

  // --- TOTAIS NOS GRUPOS (NOVO) ---
  showCategoryTotals: boolean; // Mostrar linha de total da categoria (R$ e Qtd)
  showSubCategoryTotals: boolean; // Mostrar linha de total da subcategoria (R$ e Qtd)

  // --- DETALHES DO ITEM (NOVO) ---
  showCategoryInItem: boolean; // Mostrar nome da categoria/sub logo abaixo do item na lista

  // --- CONTROLE DOS CARDS ---
  showCardSku: boolean;
  showCardVolume: boolean;
  showCardTicket: boolean;
  showCardTotalValue: boolean;

  // Layout
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;

  // Rodapé
  showSignatureBlock: boolean;
  showCpfLine: boolean;

  // Outros
  truncateLimit: number;
}
