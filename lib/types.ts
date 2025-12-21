// lib/types.ts
/**
 * Descrição: Definições de Tipos Globais da Aplicação.
 * Responsabilidade: Centralizar todas as interfaces e tipos TypeScript que representam
 * as estruturas de dados principais do sistema de inventário. Isso inclui produtos,
 * códigos de barras, contagens, histórico e tipos auxiliares para a UI e processamento de dados.
 * Manter estas definições centralizadas promove a reutilização e a consistência em toda a aplicação.
 */

/**
 * Representa um produto físico no catálogo de inventário.
 */
export interface Product {
  /** Identificador único do produto no banco de dados. */
  id: number;
  /** Código de identificação único do produto, usado para referências internas. */
  codigo_produto: string;
  /** Nome ou descrição detalhada do produto. */
  descricao: string;
  /** Quantidade atual do produto em estoque, conforme o sistema. */
  saldo_estoque: number;
}

/**
 * Associa um código de barras a um produto específico.
 */
export interface BarCode {
  /** O código de barras escaneável. */
  codigo_de_barras: string;
  /** ID do produto ao qual este código de barras pertence. */
  produto_id: number;
  /** Objeto do produto completo (opcional, preenchido em consultas com JOIN). */
  produto?: Product;
}

/**
 * Representa a contagem de um item específico durante uma sessão de inventário.
 * Esta estrutura é usada para armazenar as quantidades contadas em diferentes locais
 * e calcular a diferença em relação ao saldo do sistema.
 */
export interface ProductCount {
  /** Identificador único para este registro de contagem (gerado no frontend). */
  id: number;
  /** Código de barras do produto que foi contado. */
  codigo_de_barras: string;
  /** Código de identificação do produto. */
  codigo_produto: string;
  /** Descrição do produto. */
  descricao: string;
  /** Saldo do produto no sistema, usado como base para comparação. */
  saldo_estoque: number;
  /** Quantidade do produto contada na loja. */
  quant_loja: number;
  /** Quantidade do produto contada no estoque. */
  quant_estoque: number;
  /** Resultado da fórmula: (quant_loja + quant_estoque) - saldo_estoque. */
  total: number;
  /** Local de estoque onde a contagem foi realizada (pode ser vazio). */
  local_estoque: string;
  /** Data e hora em que o item foi adicionado à contagem (formato ISO). */
  data_hora: string;
}

/**
 * Representa um registro de uma contagem salva no histórico.
 */
export interface InventoryHistory {
  /** Identificador único do registro no banco de dados. */
  id: number;
  /** Data em que a contagem foi salva. */
  data_contagem: string;
  /** Email do usuário que realizou a contagem. */
  usuario_email: string;
  /** Número total de itens na contagem salva. */
  total_itens: number;
  /** Local de estoque principal da contagem. */
  local_estoque: string;
  /** Status da contagem (ex: 'Concluído', 'Pendente'). */
  status: string;
}

/**
 * Define a estrutura esperada de uma linha no arquivo CSV de importação de produtos.
 */
export interface CsvRow {
  /** Código de barras do produto. */
  codigo_de_barras: string;
  /** Código de identificação do produto. */
  codigo_produto: string;
  /** Descrição do produto. */
  descricao: string;
  /** Quantidade em estoque (como string, pois vem do arquivo CSV). */
  saldo_estoque: string;
}

/**
 * Representa um produto temporário criado durante a contagem quando um código de barras não é encontrado no catálogo.
 */
export interface TempProduct {
  /** Identificador único temporário (prefixado com 'TEMP-'). */
  id: string;
  /** Código de barras lido que não corresponde a um produto existente. */
  codigo_de_barras: string;
  /** Código de produto gerado temporariamente. */
  codigo_produto: string;
  /** Descrição padrão para produtos não encontrados. */
  descricao: string;
  /** Saldo em estoque (inicia como 0 para produtos temporários). */
  saldo_estoque: number;
  /** Discriminador que indica que este é um produto temporário e não vem do banco de dados. */
  isTemporary: true;
}

/**
 * Representa uma localização de estoque, usada em componentes de UI (ex: select dropdowns).
 */
export interface Location {
  /** O valor real da localização (ex: 'loja', 'estoque'). */
  value: string;
  /** O texto exibido para o usuário (ex: 'Loja', 'Estoque Principal'). */
  label: string;
}
// lib/types.ts

// ... outros tipos que você possa ter

// Interface para um produto completo no sistema
export interface Product {
  id: number;
  name: string;
  barcode: string;
  price?: number; // Preço pode ser opcional
  stock: number; // Quantidade atual em estoque
}

// Interface para um produto temporário (ex: lido de um arquivo ou API)
export interface TempProduct {
  barcode: string;
  name: string;
  quantity: number;
  price?: number;
}

// Interface para um produto contado durante a auditoria
export interface ProductCount {
  barcode: string;
  name: string;
  quantity: number;
  price?: number;
}

// ... outros tipos
