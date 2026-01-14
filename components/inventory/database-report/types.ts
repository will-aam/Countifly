// components/inventory/database-report/types.ts

/**
 * Configuração visual específica para o Relatório de Auditoria de Banco de Dados.
 * Focado em Valuation (Financeiro) e Categorização.
 */

export interface DatabaseReportConfig {
  // Metadados
  reportTitle: string;
  customScope: string;

  // Visualização Financeira
  showFinancials: boolean; // Exibir colunas de preço e total

  // Layout
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl?: string | null;

  // Rodapé
  showSignatureBlock: boolean;
  showCpfLine: boolean;

  // Outros (Mantidos para compatibilidade visual se necessário)
  truncateLimit: number;
}
