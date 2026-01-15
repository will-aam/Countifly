// components/inventory/database-report/types.ts

/**
 * Configuração visual específica para o Relatório de Auditoria de Banco de Dados.
 * Focado em Valuation (Financeiro) e Categorização.
 */

export interface DatabaseReportConfig {
  // Metadados
  reportTitle: string;
  customScope: string;

  // Visualização e Agrupamento
  showFinancials: boolean; // Exibir colunas de preço e total
  groupByCategory: boolean; // NOVO: Fundamental para o botão de agrupar funcionar

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
