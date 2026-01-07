// app/components/inventory/Import/ImportUploadSection.tsx
// Preciso apagar?
"use client";

import React, { useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Download, HelpCircle, AlertCircle, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";

interface ImportErrorDetail {
  row?: number;
  message: string;
  type: "error" | "conflict" | "fatal";
  details?: string;
}

const MAX_RENDERED_ERRORS = 15;
const MAX_VISIBLE_HEIGHT = "max-h-[300px]";

interface ImportUploadSectionProps {
  userId: number | null;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  csvErrors: string[];
  setCsvErrors: (errors: string[]) => void;

  products: Product[];
  onClearAllData?: () => void;
  downloadTemplateCSV: () => void;
  loadCatalogFromDb: () => Promise<void>;

  // NOVO: pai pode guardar snapshot antes da importação
  onBeforeImport?: (currentProducts: Product[]) => void;
}

export const ImportUploadSection: React.FC<ImportUploadSectionProps> = ({
  userId,
  isLoading,
  setIsLoading,
  csvErrors,
  setCsvErrors,
  products,
  onClearAllData,
  downloadTemplateCSV,
  loadCatalogFromDb,
  onBeforeImport,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportErrorDetail[]>([]);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    imported: number;
    errors: number;
  }>({
    current: 0,
    total: 0,
    imported: 0,
    errors: 0,
  });

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleCsvUploadWithProgressFromFile = async (file: File) => {
    if (!file || !userId) return;

    console.log("[Import] Iniciando upload de CSV com arquivo:", file.name);

    // avisa o pai para guardar o snapshot atual
    if (onBeforeImport) {
      onBeforeImport(products);
    }

    setImportErrors([]);
    setIsImporting(true);
    setCsvErrors([]);
    setImportProgress({
      current: 0,
      total: 0,
      imported: 0,
      errors: 0,
    });
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/inventory/${userId}/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        const errorData = await response.json().catch(() => ({
          error: "Falha na requisição de upload.",
        }));
        throw new Error(errorData.error || "Falha ao enviar o arquivo.");
      }

      if (!response.body) {
        throw new Error(
          "A resposta da requisição não contém um corpo (stream)."
        );
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const dataString = line.substring(6);
          const data = JSON.parse(dataString);

          if (data.type === "fatal") {
            console.error("[Import] Erro fatal na importação:", data);
            let msg = data.error;

            if (data.missing && Array.isArray(data.missing)) {
              const missingCols = data.missing.join(", ");
              msg = `Erro no cabeçalho (linha 1): os nomes das colunas não conferem com o padrão esperado.
O sistema exige exatamente: 'codigo_de_barras', 'codigo_produto', 'descricao', 'saldo_estoque'.
Não foram encontradas as colunas: ${missingCols}.
Verifique se há erros de digitação ou espaços extras na primeira linha do arquivo.`;
            }

            setImportErrors((prev) => [
              ...prev,
              {
                message: msg,
                type: "fatal",
              },
            ]);

            setIsImporting(false);
            setIsLoading(false);
            return;
          }

          if (data.type === "row_error") {
            setImportErrors((prev) => [
              ...prev,
              {
                row: data.row,
                message: data.reasons.join(", "),
                type: "error",
              },
            ]);
          }

          if (data.type === "row_conflict") {
            setImportErrors((prev) => [
              ...prev,
              {
                row: data.row,
                message: `O código de barras ${data.barcode} já está cadastrado no sistema.`,
                type: "conflict",
              },
            ]);
          }

          if (data.error) {
            console.error("[Import] Erro geral na importação:", data);
            let errorMessage = data.error;
            if (
              data.details &&
              Array.isArray(data.details) &&
              data.details.length > 0
            ) {
              const detailsString = data.details
                .map(
                  (d: { codigo_de_barras: string; linhas: number[] }) =>
                    `Código: ${d.codigo_de_barras} (linhas: ${d.linhas.join(
                      ", "
                    )})`
                )
                .join("; ");
              errorMessage = `${data.error} Detalhes: ${detailsString}`;
            }
            setCsvErrors([errorMessage]);
            setIsImporting(false);
            setIsLoading(false);
            reader.releaseLock();
            return;
          }

          if (data.type === "start") {
            setImportProgress({
              current: 0,
              total: data.total,
              imported: 0,
              errors: 0,
            });
          } else if (data.type === "progress") {
            setImportProgress((prev) => ({
              ...prev,
              current: data.current,
              total: data.total,
              imported: data.imported,
              errors: data.errors,
            }));
          } else if (data.type === "complete") {
            console.log(
              `[Import] Importação concluída. Itens importados: ${data.imported}`
            );
            setIsImporting(false);
            setIsLoading(false);

            await loadCatalogFromDb();

            reader.releaseLock();
            return;
          }
        }
      }
    } catch (error: any) {
      console.error("Erro no handleCsvUploadWithProgressFromFile:", error);
      setCsvErrors([error.message || "Ocorreu um erro durante a importação."]);
      setIsImporting(false);
      setIsLoading(false);
    }
  };

  const handleCsvUploadWithConfirmation = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !userId) return;

    if (products.length === 0) {
      void handleCsvUploadWithProgressFromFile(file);
      e.target.value = "";
      return;
    }

    setPendingFile(file);
    setIsConfirmDialogOpen(true);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!pendingFile || !userId) {
      setIsConfirmDialogOpen(false);
      setPendingFile(null);
      return;
    }

    const fileToImport = pendingFile;
    setIsConfirmDialogOpen(false);
    setPendingFile(null);

    await handleCsvUploadWithProgressFromFile(fileToImport);
  };

  const cancelImport = () => {
    setPendingFile(null);
    setIsConfirmDialogOpen(false);
  };

  return (
    <TooltipProvider>
      {/* Dialog de confirmação */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar novo arquivo CSV?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Já existem produtos importados nesta sessão. Se você importar
                  um novo arquivo agora:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Os itens do novo arquivo serão{" "}
                    <strong>somados/mesclados</strong> aos que já estão
                    carregados.
                  </li>
                  <li>
                    Essa ação é útil se você estiver dividindo a importação em
                    vários arquivos.
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  Se quiser começar do zero, clique em{" "}
                  <strong>&quot;Limpar importação&quot;</strong> antes de subir
                  um novo arquivo.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelImport}>
              Cancelar
            </Button>
            <Button type="button" variant="default" onClick={confirmImport}>
              Continuar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* resto do componente igual ao seu atual (upload, progress, erros) */}
      {/* ... */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                Importar produtos
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="h-6 w-6 p-0 rounded-full opacity-70"
                      variant="ghost"
                      size="icon"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md p-0">
                    <div className="p-4 space-y-3">
                      <h4 className="font-semibold">Orientações para o CSV</h4>
                      <ul className="text-sm space-y-1">
                        <li>
                          <span className="font-medium">Separador:</span> ponto
                          e vírgula (;)
                        </li>
                        <li>
                          <span className="font-medium">Código de barras:</span>{" "}
                          formato número
                        </li>
                        <li>
                          <span className="font-medium">Codificação:</span>{" "}
                          UTF-8
                        </li>
                        <li>
                          <span className="font-medium">Cabeçalho:</span> nomes
                          exatos das colunas
                        </li>
                      </ul>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={downloadTemplateCSV}
                        className="w-full"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Baixar Modelo CSV
                      </Button>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        {/* ... restante igual, sem mudanças de lógica */}
        {/* (Input de arquivo, progress, erros, etc) */}
        {/* ... */}
      </Card>
    </TooltipProvider>
  );
};

ImportUploadSection.displayName = "ImportUploadSection";
