// lib/types.ts

/**
 * ==========================================
 * ENTIDADES DO CATÁLOGO (BANCO DE DADOS)
 * ==========================================
 */

// Produto base vindo do banco de dados ou importação
export interface Product {
  id: number;
  codigo_produto: string; // Obrigatório no DB (chave única), mas pode ser igual ao código de barras
  descricao: string;
  saldo_estoque: number;

  // Campo para diferenciar a origem do produto
  tipo_cadastro?: string; // Ex: "FIXO" ou "IMPORTADO"

  // --- Novos campos para Auditoria/Valuation ---
  price?: number; // Preço de venda (Frontend usa este)
  preco?: number; // Alias para compatibilidade direta com Prisma (Decimal -> number)

  // Taxonomia
  categoria?: string; // Macro (ex: Bebidas)
  subcategoria?: string; // Micro (ex: Cervejas) - NOVO
  marca?: string; // Fabricante (ex: Heineken) - NOVO
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
  codigo_produto?: string; // Opcional agora (Legacy usa, Valuation ignora)

  // Dados do Item
  descricao: string;
  saldo_estoque: number; // Snapshot do saldo no momento da contagem

  // Quantidades
  quant_loja: number; // Usado como quantidade principal ou "Frente"
  quant_estoque: number; // Usado para "Depósito"
  quantity?: number; // Alias opcional para facilitar leitura em componentes genéricos
  total?: number; // (quant_loja + quant_estoque)

  // --- CAMPO NOVO: ISOLAMENTO DE ESTADO ---
  mode?: "audit" | "import"; // Define a origem: Auditoria ou Importação

  // Auditoria Financeira e Metadados
  price?: number; // Preço unitário coletado/herdado

  // Taxonomia para Relatório
  categoria?: string;
  subcategoria?: string; // NOVO
  marca?: string; // NOVO

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
  codigo_produto?: string; // Opcional
  descricao: string;
  saldo_estoque: number;
  isTemporary: true;

  // Campos estendidos para manuais
  price?: number;
  categoria?: string;
  subcategoria?: string; // NOVO
  marca?: string; // NOVO
}

/**
 * ==========================================
 * UTILITÁRIOS E HISTÓRICO
 * ==========================================
 */

// Formato de linha do CSV de importação (Legado/Compatibilidade)
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
  empresa_id?: number | null; // ✅ NOVO: Empresa relacionada (opcional)
}

// ✅ NOVO: Interface para Contagem Salva (histórico de CSV)
export interface ContagemSalva {
  id: number;
  nome_arquivo: string;
  conteudo_csv?: string; // Opcional na listagem (só vem no detalhe)
  created_at: string;
  usuario_id: number;
  empresa_id?: number | null; // ✅ NOVO: Empresa relacionada (opcional)
}
