// app/(main)/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Home, Settings, FileText } from "lucide-react";
import { HistoryTab } from "@/components/inventory/HistoryTab";
import { useHistory } from "@/hooks/inventory/useHistory";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [userId, setUserId] = useState<number | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("currentUserId");

    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else {
      router.push("/");
    }
    setIsAuthLoading(false);
  }, [router]);

  const {
    history,
    isLoadingHistory,
    loadHistory,
    handleDeleteHistoryItem,
    page,
    setPage,
    totalPages,
  } = useHistory(userId);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) return null;

  // --- Bottom nav handlers (mobile) ---

  // Home aqui significa: voltar para a tela anterior (modo que eu estava antes)
  const handleGoBackHome = () => {
    // Comportamento de "voltar" — podemos evoluir fallback depois se precisar
    router.back();
  };

  const isHistory = pathname.startsWith("/history");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          <HistoryTab
            userId={userId}
            history={history}
            loadHistory={loadHistory}
            handleDeleteHistoryItem={handleDeleteHistoryItem}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            isLoadingHistory={isLoadingHistory}
          />
        </div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-around py-2">
          {/* "Home" -> voltar para a tela anterior */}
          <button
            type="button"
            onClick={handleGoBackHome}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Home</span>
          </button>

          {/* Histórico (página atual) */}
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              isHistory
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className={cn("h-5 w-5", isHistory && "scale-110")} />
            <span className="font-medium">Histórico</span>
          </button>

          {/* Configurações (estático por enquanto) */}
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              "text-muted-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
