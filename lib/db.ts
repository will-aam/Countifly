// lib/db.ts
/**
 * Descrição: Gerenciador do Banco de Dados Local (IndexedDB).
 * Responsabilidade: Persistir dados no dispositivo do usuário de forma robusta e assíncrona.
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
      usuario_id: number;
      // CAMPO NOVO ADICIONADO PARA CORRIGIR O ERRO:
      tipo_local?: "LOJA" | "ESTOQUE";
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
// Mantenha > que o que já foi para produção
const DB_VERSION = 7; // Subi para 7 para garantir a atualização do schema se necessário

let dbPromise: Promise<IDBPDatabase<CountiflyDB>> | null = null;

/**
 * Inicializa e abre a conexão com o IndexedDB.
 */
export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<CountiflyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // --- sync_queue ---
        if (!db.objectStoreNames.contains("sync_queue")) {
          const queueStore = db.createObjectStore("sync_queue", {
            keyPath: "id",
          });
          queueStore.createIndex("by-timestamp", "timestamp");
          queueStore.createIndex("by-user", "usuario_id");
        }

        // --- products ---
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", {
            keyPath: "id",
          });
          productStore.createIndex("by-code", "codigo_produto");
        }

        // --- barcodes ---
        if (!db.objectStoreNames.contains("barcodes")) {
          db.createObjectStore("barcodes", {
            keyPath: "codigo_de_barras",
          });
        }

        // --- local_counts ---
        if (!db.objectStoreNames.contains("local_counts")) {
          const countsStore = db.createObjectStore("local_counts", {
            keyPath: "id",
          });
          countsStore.createIndex("by-product", "codigo_produto");
          countsStore.createIndex("by-user", "usuario_id");
        }
      },
    });
  }
  return dbPromise;
};

// --- MÉTODOS DA FILA DE SINCRONIZAÇÃO ---

/** Adiciona um movimento à fila de envio. */
export const addToSyncQueue = async (
  userId: number,
  movement: Omit<CountiflyDB["sync_queue"]["value"], "usuario_id">,
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
  barcodes: BarCode[],
) => {
  const db = await initDB();
  const tx = db.transaction(["products", "barcodes"], "readwrite");

  await tx.objectStore("products").clear();
  await tx.objectStore("barcodes").clear();

  const productStore = tx.objectStore("products");
  const barcodeStore = tx.objectStore("barcodes");

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

/**
 * Salva o estado atual da contagem do usuário, RESPEITANDO O MODO.
 * Agora ele apaga apenas as contagens do modo atual (audit ou import) e reescreve.
 */
export const saveLocalCounts = async (
  userId: number,
  counts: ProductCount[],
  mode: "audit" | "import", // NOVO ARGUMENTO OBRIGATÓRIO
) => {
  const db = await initDB();
  const tx = db.transaction("local_counts", "readwrite");
  const store = tx.objectStore("local_counts");
  const index = store.index("by-user");

  // 1. Recupera TUDO o que tem salvo para este usuário
  const allUserCounts = await index.getAll(IDBKeyRange.only(userId));

  // 2. Separa o que devemos manter (o que é do OUTRO modo)
  // Se o item não tem 'mode' definido (legado), assumimos que é 'audit' ou tratamos como deletável se o modo for audit
  const countsToKeep = allUserCounts.filter((c) => c.mode && c.mode !== mode);

  // 3. Prepara a nova lista completa (Outros modos + Novos dados deste modo)
  // Adiciona a tag do modo atual em todos os novos itens para garantir
  const countsToAdd = counts.map((c) => ({ ...c, usuario_id: userId, mode }));

  const finalCounts = [...countsToKeep, ...countsToAdd];

  // 4. Limpa tudo do usuário para reescrever a lista consolidada e limpa
  // (É mais seguro apagar e reescrever do usuário do que tentar deletar um por um)
  let cursor = await index.openKeyCursor(IDBKeyRange.only(userId));
  while (cursor) {
    await store.delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }

  // 5. Salva a lista consolidada
  if (finalCounts.length > 0) {
    await Promise.all(finalCounts.map((c) => store.put(c)));
  }

  await tx.done;
};

/** Recupera a contagem salva localmente. */
export const getLocalCounts = async (userId: number) => {
  const db = await initDB();
  return db.getAllFromIndex("local_counts", "by-user", userId);
};

/**
 * Limpa TODO o banco local.
 * Usado no Logout ou na função "Limpar Tudo".
 */
export const clearLocalDatabase = async (userId?: number) => {
  const db = await initDB();

  if (userId) {
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
    const tx = db.transaction(
      ["sync_queue", "products", "barcodes", "local_counts"],
      "readwrite",
    );

    await tx.objectStore("sync_queue").clear();
    await tx.objectStore("products").clear();
    await tx.objectStore("barcodes").clear();
    await tx.objectStore("local_counts").clear();

    await tx.done;
  }
};
