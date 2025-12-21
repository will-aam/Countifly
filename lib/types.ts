// lib/types.ts

/**
 * ==========================================
 * ENTIDADES DO CATÁLOGO (BANCO DE DADOS)
 * ==========================================
 */

// Produto base vindo do banco de dados ou importação
export interface Product {
  id: number;
  codigo_produto: string;
  descricao: string; // Padronizado como 'descricao' (não use 'name')
  saldo_estoque: number;
  price?: number; // Adicionado para suportar o preço de venda se existir no cadastro
}

// Vínculo entre Código de Barras e Produto
export interface BarCode {
  codigo_de_barras: string;
  produto_id: number;
  produto?: Product;
}

/**
 * ==========================================
 * OPERAÇÃO DE CONTAGEM (O QUE ESTÁ NA MEMÓRIA)
 * ==========================================
 */

// Item sendo contado na Auditoria/Conferência
export interface ProductCount {
  id: number; // Obrigatório para keys do React e IndexedDB

  // Identificadores
  codigo_de_barras: string;
  codigo_produto: string;

  // Dados do Item
  descricao: string;
  saldo_estoque: number; // Snapshot do saldo no momento da contagem

  // Quantidades
  quant_loja: number; // Usado como quantidade principal ou "Frente"
  quant_estoque: number; // Usado para "Depósito"
  quantity?: number; // Alias opcional para facilitar leitura em componentes genéricos
  total?: number; // (quant_loja + quant_estoque)

  // Auditoria Financeira e Metadados
  price?: number; // Preço unitário coletado
  isManual?: boolean; // Se foi inserido manualmente sem código de barras
  data_hora?: string;

  // Propriedades legadas ou de compatibilidade (opcionais)
  barcode?: string; // Alias para codigo_de_barras
  name?: string; // Alias para descricao
}

// Produto temporário (quando não encontrado no banco ou criado manualmente)
export interface TempProduct {
  id: string | number;
  codigo_de_barras: string;
  codigo_produto: string;
  descricao: string;
  saldo_estoque: number;
  isTemporary: true;
  price?: number;
}

/**
 * ==========================================
 * UTILITÁRIOS E HISTÓRICO
 * ==========================================
 */

// Formato de linha do CSV de importação
export interface CsvRow {
  codigo_de_barras: string;
  codigo_produto: string;
  descricao: string;
  saldo_estoque: string;
}

// Registro histórico salvo
export interface InventoryHistory {
  id: number;
  data_contagem: string;
  usuario_email: string;
  total_itens: number;
  local_estoque: string;
  status: string;
}
