// components/inventory/report-builder/types.ts

import type { ProductCount } from "@/lib/types";

/**
 * Configuração visual e de filtros do relatório.
 * Controla o que aparece ou não no PDF final.
 */
export interface ReportConfig {
  // Filtros de Dados (Linhas da Tabela)
  showCorrect: boolean; // Exibir itens com divergência 0
  showSurplus: boolean; // Exibir sobras (+)
  showMissing: boolean; // Exibir faltas (-)

  // Visualização dos Cards de Resumo (KPIs)
  showCardSku: boolean; // Total SKUs
  showCardSystem: boolean; // Estoque Sistema
  showCardCounted: boolean; // Contagem Física
  showCardDivergence: boolean; // Divergência
  showCardAccuracy: boolean; // Acuracidade (%)

  // Layout da Tabela
  showAuditColumn: boolean;

  // Metadados e Textos
  reportTitle: string; // Título principal (H1)
  customScope: string; // Subtítulo (ex: "Setor de Bebidas")

  // Layout e Assinaturas
  showSignatureBlock: boolean; // Exibir rodapé de assinaturas
  showCpfLine: boolean; // Exibir linha para CPF
  truncateLimit: number; // Limite de caracteres na descrição do produto
}

/**
 * Props passadas para o componente Container principal.
 */
export interface ReportBuilderProps {
  // Dados brutos vindos do histórico ou da sessão atual
  items: ProductCount[];
  // Metadados da contagem
  meta?: {
    date: string;
    userName?: string;
    sessionId?: string | number;
  };
  // Função para voltar à tela anterior
  onBack: () => void;
}
