// app/(main)/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HistoryTab } from "@/components/inventory/HistoryTab";
import { useHistory } from "@/hooks/inventory/useHistory";

export default function HistoryPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<number | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("currentUserId");

    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else {
      // NÃO redireciona mais para "/", deixa o middleware cuidar em novas navegações
      setUserId(null);
    }
    setIsAuthLoading(false);
  }, []);

  const {
    history,
    isLoadingHistory,
    loadHistory,
    handleDeleteHistoryItem,
    page,
    setPage,
    totalPages,
    totalItems,
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

  if (!userId) {
    // Se chegou aqui sem userId, provavelmente o usuário não passou pelo login corretamente.
    // Você pode redirecionar explicitamente para login se quiser:
    // router.push("/login");
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Sessão inválida. Faça login novamente para ver o histórico.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            totalItems={totalItems}
          />
        </div>
      </main>
    </div>
  );
}
