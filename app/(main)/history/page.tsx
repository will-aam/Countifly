// app/(main)/history/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryTab } from "@/components/inventory/HistoryTab";
import { useHistory } from "@/hooks/inventory/useHistory";

export default function HistoryPage() {
  const router = useRouter();

  // Estado para armazenar o ID real do usuário
  const [userId, setUserId] = useState<number | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // 1. Recuperar o Usuário da Sessão ao montar a página
  useEffect(() => {
    // Tenta pegar do sessionStorage (onde seu app guarda o login)
    const storedUserId = sessionStorage.getItem("currentUserId");

    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else {
      // Se não tiver usuário, manda pro login
      router.push("/");
    }
    setIsAuthLoading(false);
  }, [router]);

  // Inicializamos o hook com o userId dinâmico
  const {
    history,
    isLoadingHistory,
    loadHistory,
    handleDeleteHistoryItem,
    page,
    setPage,
    totalPages,
  } = useHistory(userId);

  // Carrega o histórico assim que tivermos o userId
  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  // Se ainda estiver checando a sessão, mostra um loading simples
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não tiver usuário (e o redirect falhar), não renderiza nada
  if (!userId) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header Fixo da Página */}
      <header className="bg-white dark:bg-gray-900 border-b p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Históricos e Relatórios</h1>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <HistoryTab
            userId={userId} // Agora passa o ID real!
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
    </div>
  );
}
