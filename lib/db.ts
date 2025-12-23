/**
 * Descrição: Gerenciador do Banco de Dados Local (IndexedDB).
 * Responsabilidade: Persistir dados no dispositivo do usuário de forma robusta e assíncrona.
 * Substitui o uso do localStorage para garantir maior capacidade de armazenamento
 * e evitar perda de dados em limpezas automáticas do navegador.
 * Essencial para o funcionamento Offline-First e PWA.
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Product, BarCode, ProductCount } from "./types";

// Interface que define a estrutura (Schema) do nosso banco local
interface CountiflyDB extends DBSchema {
  // 1. Fila de Sincronização ("Carteiro Silencioso")
  sync_queue: {
    key: string; // ID único do movimento (UUID)
    value: {
      id: string;
      codigo_barras: string;
      quantidade: number;
      timestamp: number;
      // Metadados opcionais para contexto
      sessao_id?: number;
      participante_id?: number;
      usuario_id: number; // Adicionado para suporte multiusuário
    };
    indexes: {
      "by-timestamp": number;
      "by-user": number; // Índice para filtrar por usuário
    };
  };

  // 2. Catálogo de Produtos (Cache Offline para busca rápida)
  products: {
    key: number; // ID do produto
    value: Product;
    indexes: { "by-code": string };
  };

  // 3. Códigos de Barras (Mapeamento rápido para o scanner)
  barcodes: {
    key: string; // O próprio código de barras é a chave
    value: BarCode;
  };

  // 4. Contagens Locais (Estado da UI persistido)
  local_counts: {
    key: number; // ID da contagem
    value: ProductCount & { usuario_id: number }; // Adicionamos usuario_id no valor
    indexes: {
      "by-product": string;
      "by-user": number; // Novo índice para filtrar por usuário
    };
  };
}

const DB_NAME = "countifly-offline-db";
// SUBA ESTA VERSÃO um número acima da que está em produção (se 3, use 4)
const DB_VERSION = 4;

// Singleton da conexão para evitar múltiplas aberturas
let dbPromise: Promise<IDBPDatabase<CountiflyDB>> | null = null;

/**
 * Inicializa e abre a conexão com o IndexedDB.
 * Cria/atualiza as tabelas (Object Stores) se elas não existirem.
 *
 * IMPORTANTE: Nenhuma transação manual dentro do upgrade.
 */
export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<CountiflyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Versões:
        // 0 -> nada criado ainda
        // 1 -> estrutura básica sem índices de usuário
        // 2+ -> com índices by-user em sync_queue e local_counts

        // --- v1: criar stores básicas ---
        if (oldVersion < 1) {
          // sync_queue
          const queueStore = db.createObjectStore("sync_queue", {
            keyPath: "id",
          });
          queueStore.createIndex("by-timestamp", "timestamp");
          // índice by-user será garantido mais abaixo (v2)

          // products
          const productStore = db.createObjectStore("products", {
            keyPath: "id",
          });
          productStore.createIndex("by-code", "codigo_produto");

          // barcodes
          db.createObjectStore("barcodes", { keyPath: "codigo_de_barras" });

          // local_counts
          const countsStore = db.createObjectStore("local_counts", {
            keyPath: "id",
          });
          countsStore.createIndex("by-product", "codigo_produto");
          // índice by-user será garantido mais abaixo (v2)
        }

        // --- v2: garantir índices by-user em sync_queue e local_counts ---
        if (oldVersion < 2) {
          // sync_queue: adicionar índice by-user se não existir
          if (db.objectStoreNames.contains("sync_queue")) {
            const queueStore = db
              .transaction("sync_queue", "versionchange")
              .objectStore("sync_queue");
            if (!queueStore.indexNames.contains("by-user")) {
              queueStore.createIndex("by-user", "usuario_id");
            }
          }

          // local_counts: adicionar índice by-user se não existir
          if (db.objectStoreNames.contains("local_counts")) {
            const countsStore = db
              .transaction("local_counts", "versionchange")
              .objectStore("local_counts");
            if (!countsStore.indexNames.contains("by-user")) {
              countsStore.createIndex("by-user", "usuario_id");
            }
          }
        }

        // --- v3/v4: se precisar de qualquer ajuste futuro, adicionar aqui ---
        // if (oldVersion < 3) { ... }
        // if (oldVersion < 4) { ... }
      },
    });
  }
  return dbPromise;
};

// --- MÉTODOS DA FILA DE SINCRONIZAÇÃO ---

/** Adiciona um movimento à fila de envio. */
export const addToSyncQueue = async (
  userId: number,
  movement: Omit<CountiflyDB["sync_queue"]["value"], "usuario_id">
) => {
  const db = await initDB();
  return db.put("sync_queue", { ...movement, usuario_id: userId });
};

/** Recupera toda a fila, ordenada pelos mais antigos primeiro. */
export const getSyncQueue = async (userId: number) => {
  const db = await initDB();
  return db.getAllFromIndex("sync_queue", "by-user", userId);
};

/** Remove itens da fila após terem sido enviados com sucesso ao servidor. */
export const removeFromSyncQueue = async (ids: string[]) => {
  const db = await initDB();
  const tx = db.transaction("sync_queue", "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
};

// --- MÉTODOS DE CATÁLOGO (OFFLINE CACHE) ---

/** Salva o catálogo completo no dispositivo para uso offline. */
export const saveCatalogOffline = async (
  products: Product[],
  barcodes: BarCode[]
) => {
  const db = await initDB();
  const tx = db.transaction(["products", "barcodes"], "readwrite");

  // Limpa dados antigos para garantir que o cache reflete o servidor
  await tx.objectStore("products").clear();
  await tx.objectStore("barcodes").clear();

  const productStore = tx.objectStore("products");
  const barcodeStore = tx.objectStore("barcodes");

  // Salva tudo em paralelo para ser rápido
  await Promise.all([
    ...products.map((p) => productStore.put(p)),
    ...barcodes.map((b) => barcodeStore.put(b)),
  ]);

  await tx.done;
};

/** Recupera o catálogo do dispositivo. */
export const getCatalogOffline = async () => {
  const db = await initDB();
  const products = await db.getAll("products");
  const barcodes = await db.getAll("barcodes");
  return { products, barcodes };
};

// --- MÉTODOS DE CONTAGEM LOCAL (STATE PERSISTENCE) ---

/** Salva o estado atual da contagem do usuário. */
export const saveLocalCounts = async (
  userId: number,
  counts: ProductCount[]
) => {
  const db = await initDB();
  const tx = db.transaction("local_counts", "readwrite");
  const store = tx.objectStore("local_counts");

  // 1. Limpa apenas os dados DESSE usuário antes de salvar os novos
  const index = store.index("by-user");
  let cursor = await index.openKeyCursor(IDBKeyRange.only(userId));
  while (cursor) {
    await store.delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }

  // 2. Salva as novas contagens vinculando ao userId
  if (counts.length > 0) {
    await Promise.all(
      counts.map((c) => store.put({ ...c, usuario_id: userId }))
    );
  }

  await tx.done;
};

/** Recupera a contagem salva localmente. */
export const getLocalCounts = async (userId: number) => {
  const db = await initDB();
  // Retorna apenas as contagens vinculadas ao ID do usuário logado
  return db.getAllFromIndex("local_counts", "by-user", userId);
};

/**
 * Limpa TODO o banco local.
 * Usado no Logout ou na função "Limpar Tudo" para garantir privacidade e reset.
 */
export const clearLocalDatabase = async (userId?: number) => {
  const db = await initDB();

  if (userId) {
    // Limpa apenas os dados do usuário específico
    const stores = ["sync_queue", "local_counts"] as const;

    for (const storeName of stores) {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const index = store.index("by-user");

      let cursor = await index.openKeyCursor(IDBKeyRange.only(userId));
      while (cursor) {
        await store.delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }

      await tx.done;
    }
  } else {
    // Limpa todos os dados (comportamento original)
    const tx = db.transaction(
      ["sync_queue", "products", "barcodes", "local_counts"],
      "readwrite"
    );

    await tx.objectStore("sync_queue").clear();
    await tx.objectStore("products").clear();
    await tx.objectStore("barcodes").clear();
    await tx.objectStore("local_counts").clear();

    await tx.done;
  }
};
