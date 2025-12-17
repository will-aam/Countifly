// components/inventory/HistoryTab.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Download,
  History as HistoryIcon,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface HistoryTabProps {
  userId: number | null;
  history: any[];
  loadHistory: () => Promise<void>;
  handleDeleteHistoryItem: (id: number) => Promise<void>;
  // Novas props
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoadingHistory?: boolean;
}

export function HistoryTab({
  userId,
  history,
  loadHistory,
  handleDeleteHistoryItem,
  page,
  setPage,
  totalPages,
  isLoadingHistory = false,
}: HistoryTabProps) {
  // O useEffect chama loadHistory sempre que userId ou loadHistory (que depende de page) mudarem
  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  const handleDownload = (fileName: string, csvContent: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <HistoryIcon className="mr-2" />
            Histórico de Contagens
          </div>
          {isLoadingHistory && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <ul className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2"
              >
                <div className="flex items-center flex-grow min-w-0">
                  <FileText className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      title={item.nome_arquivo}
                    >
                      {item.nome_arquivo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center flex-shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownload(item.nome_arquivo, item.conteudo_csv)
                    }
                  >
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Baixar</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteHistoryItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 py-8">
            {isLoadingHistory
              ? "Carregando..."
              : "Nenhuma contagem encontrada nesta página."}
          </div>
        )}
      </CardContent>

      {/* Rodapé com Paginação - Versão Minimalista */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-3">
          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoadingHistory}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>

          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || isLoadingHistory}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </Card>
  );
}
