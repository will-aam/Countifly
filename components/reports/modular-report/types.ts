// components/reports/modular-report/types.ts

export interface ModularReportItem {
  id: number;
  codigo_de_barras: string;
  codigo_produto: string;
  descricao: string;
  ncm?: string;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  localizacao: string;
  validade: string;
  lote: string;
  status: "NORMAL" | "AVARIADO" | "VENCIDO" | string;
  status_item?: "NORMAL" | "AVARIADO" | "VENCIDO" | string;
  quant_loja: number;
  quant_estoque: number;
  quantidade: number;
  total?: number;
  custo: number;
  valor_total: number;
  curva_abc: string;
  tipo_local: string;
  data_hora: string;
  saldo_estoque?: number;
}

export interface ModularRecountLog {
  codigo: string;
  descricao?: string;
  contagem_1a?: number;
  saldo_sistema?: number;
  diferenca_1a?: number;
  contagem_2a: number;
  auditor_2a?: string;
  diferenca_final?: number;
  status_validacao: string;
  data_hora?: string;
}

export type AuditBlockPosition = "top" | "bottom" | "none";

export interface ModularReportConfig {
  reportTitle: string;
  companyName: string;
  companyCnpj: string;
  orientation: "landscape" | "portrait";

  // Bloco de Auditoria & Corte de Documentos
  auditBlockPosition: AuditBlockPosition;
  showRecountTable: boolean;

  // Colunas Visíveis na Tabela Principal
  columns: {
    barcode: boolean;
    sku: boolean;
    description: boolean;
    ncm: boolean;
    categoria: boolean;
    subcategoria: boolean;
    marca: boolean;
    location: boolean;
    validade: boolean;
    lote: boolean;
    status: boolean;
    loja: boolean;
    estoque: boolean;
    totalQty: boolean;
    unitCost: boolean;
    totalValue: boolean;
    curvaAbc: boolean;
    dateTime: boolean;
  };

  // Agrupamentos e Filtros por Categoria e Subcategoria
  groupByCategory: boolean;
  groupBySubcategory: boolean;
  showCategoryTotals: boolean;
  showSubCategoryTotals: boolean;
  selectedCategories: string[];
  selectedSubcategories: string[];

  // Cards de Resumo Executivo (KPIs)
  kpis: {
    totalQty: boolean;
    totalSkus: boolean;
    totalValue: boolean;
    damagedCount: boolean;
    expiredCount: boolean;
  };

  // Prevenção de Perdas
  highlightLosses: boolean;

  // Assinaturas
  showSignatures: boolean;
  showCpfLine: boolean;
  signer1Title: string;
  signer2Title: string;
  signer3Title: string;

  // Identidade Visual
  showLogo: boolean;
  useDefaultLogo: boolean;
  logoDataUrl: string | null;

  // Formatação
  hideDecimals: boolean;
  truncateLimit: number;
}

export const defaultModularReportConfig: ModularReportConfig = {
  reportTitle: "Relatório de Inventário - Contagem Modular",
  companyName: "",
  companyCnpj: "",
  orientation: "landscape",

  auditBlockPosition: "top",
  showRecountTable: true,

  columns: {
    barcode: true,
    sku: false, // SKU oculto por padrão (prioriza código de barras)
    description: true,
    ncm: false, // Ativado dinamicamente se houver dados
    categoria: false, // Ativado dinamicamente se houver dados
    subcategoria: false, // Ativado dinamicamente se houver dados
    marca: false, // Ativado dinamicamente se houver dados
    location: true,
    validade: false, // Ativado dinamicamente se houver dados
    lote: false, // Ativado dinamicamente se houver dados
    status: true,
    loja: true,
    estoque: true,
    totalQty: true,
    unitCost: true,
    totalValue: true,
    curvaAbc: false, // Desativada por padrão
    dateTime: false,
  },

  groupByCategory: false,
  groupBySubcategory: false,
  showCategoryTotals: true,
  showSubCategoryTotals: true,
  selectedCategories: [],
  selectedSubcategories: [],

  kpis: {
    totalQty: true,
    totalSkus: true,
    totalValue: true,
    damagedCount: true,
    expiredCount: true,
  },

  highlightLosses: true,

  showSignatures: true,
  showCpfLine: false,
  signer1Title: "Auditor Líder / Conferente",
  signer2Title: "Gerente da Unidade / Loja",
  signer3Title: "Controladoria / Fiscal",

  showLogo: true,
  useDefaultLogo: true,
  logoDataUrl: null,

  hideDecimals: false,
  truncateLimit: 40,
};
