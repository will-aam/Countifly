// components/inventory/report-builder/types.ts

/**
 * Configuração visual e de filtros do relatório.
 * Controla o que aparece ou não no PDF final.
 */
import type { ProductCount } from "@/lib/types";

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

  // NOVOS CARDS: contagem de SKUs por tipo de divergência
  showCardItemsCorrect: boolean; // qtd de SKUs corretos
  showCardItemsMissing: boolean; // qtd de SKUs com falta
  showCardItemsSurplus: boolean; // qtd de SKUs com sobra

  // Layout da Tabela
  showAuditColumn: boolean;
  hideDecimals: boolean; // exibir apenas números inteiros
  showInternalCode: boolean; // exibir código interno (codigo_produto) na tabela
  sortByBiggestError: boolean; // ordenar por maior erro absoluto primeiro

  // Metadados e Textos
  reportTitle: string; // Título principal (H1)
  customScope: string; // Subtítulo (ex: "Setor de Bebidas")

  // Layout e Assinaturas
  showSignatureBlock: boolean; // Exibir rodapé de assinaturas
  showCpfLine: boolean; // Exibir linha para CPF
  truncateLimit: number; // Limite de caracteres na descrição do produto

  // Logo no relatório
  showLogo: boolean; // se o relatório mostra alguma logo
  useDefaultLogo: boolean; // se usa a logo padrão (Countifly)
  logoDataUrl?: string | null; // PNG base64 da logo do cliente (se houver)
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
