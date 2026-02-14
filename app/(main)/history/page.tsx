// app/(main)/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HistoryTab } from "@/components/inventory/HistoryTab";
import { useHistory } from "@/hooks/inventory/useHistory";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<number | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Bootstrap do usuário: tenta sessionStorage, se não tiver, chama /api/user/me
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const storedUserId = sessionStorage.getItem("currentUserId");
        if (storedUserId) {
          setUserId(parseInt(storedUserId, 10));
          setIsAuthLoading(false);
          return;
        }

        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login?from=/history");
            return;
          }
          throw new Error("Falha ao carregar usuário autenticado.");
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
          if (data.preferredMode) {
            sessionStorage.setItem("preferredMode", data.preferredMode);
          }
        } else {
          router.replace("/login?from=/history");
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário em /history:", error);
        router.replace("/login?from=/history");
        return;
      } finally {
        setIsAuthLoading(false);
      }
    };

    bootstrapUser();
  }, [router]);

  const {
    history,
    isLoadingHistory,
    loadHistory,
    handleDeleteHistoryItem,
    handleBatchDelete,
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
            handleBatchDelete={handleBatchDelete}
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
