// app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Declaração global para o Service Worker
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Lista de arquivos gerada pelo build do Next.js para cachear imediatamente
  precacheEntries: self.__SW_MANIFEST,

  // Pula a fase de espera e ativa o novo SW imediatamente
  skipWaiting: true,

  // Assume o controle de todas as abas abertas imediatamente
  clientsClaim: true,

  // Otimização de navegação
  navigationPreload: true,

  // Estratégias de cache padrão (Google Fonts, Imagens, API, etc.)
  runtimeCaching: defaultCache,

  // Opcional: Fallback para quando estiver offline (página customizada)
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
