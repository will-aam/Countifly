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
import { toast } from "@/hooks/use-toast";

// Tipos compatíveis com o ImportTab
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

  // estado global vindo do ImportTab
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  csvErrors: string[];
  setCsvErrors: (errors: string[]) => void;

  products: Product[];
  onClearAllData?: () => void;
  downloadTemplateCSV: () => void;
  loadCatalogFromDb: () => Promise<void>;
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

  // Dialog de confirmação quando já existem produtos importados
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingFileEvent, setPendingFileEvent] =
    useState<React.ChangeEvent<HTMLInputElement> | null>(null);

  const handleCsvUploadWithProgress = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

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

        if (done) {
          break;
        }

        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const dataString = line.substring(6);
          const data = JSON.parse(dataString);

          if (data.type === "fatal") {
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
              `Importação concluída. ${data.importedCount} itens importados.`
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
      console.error("Erro no handleCsvUploadWithProgress:", error);
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
      void handleCsvUploadWithProgress(e);
      return;
    }

    setPendingFileEvent(e);
    setIsConfirmDialogOpen(true);
  };

  const confirmImport = async () => {
    if (!pendingFileEvent || !userId) {
      setIsConfirmDialogOpen(false);
      setPendingFileEvent(null);
      return;
    }

    const file = pendingFileEvent.target.files?.[0];
    if (!file) {
      setIsConfirmDialogOpen(false);
      setPendingFileEvent(null);
      return;
    }

    const virtualInput = document.createElement("input");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    virtualInput.files = dataTransfer.files;

    const syntheticEvent = {
      ...pendingFileEvent,
      target: virtualInput,
      currentTarget: virtualInput,
    } as React.ChangeEvent<HTMLInputElement>;

    setIsConfirmDialogOpen(false);
    setPendingFileEvent(null);

    await handleCsvUploadWithProgress(syntheticEvent);
  };

  const cancelImport = () => {
    if (pendingFileEvent) {
      pendingFileEvent.target.value = "";
    }
    setPendingFileEvent(null);
    setIsConfirmDialogOpen(false);
  };

  return (
    <TooltipProvider>
      {/* Dialog de confirmação */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar novo arquivo CSV?</DialogTitle>
            <DialogDescription className="space-y-2 text-sm">
              <p>
                Já existem produtos importados nesta sessão. Se você importar um
                novo arquivo agora:
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
                <strong>&quot;Limpar importação&quot;</strong> antes de subir um
                novo arquivo.
              </p>
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

        <CardContent className="space-y-4">
          {/* Caixa de código */}
          <div className="text-xs text-blue-600 dark:text-blue-400">
            <div
              className="relative bg-gray-950 text-gray-100 rounded-md p-3 font-mono text-xs border-blue-300
dark:border-blue-600 border"
            >
              <button
                onClick={() => {
                  const textoParaAreaDeTransferencia =
                    "codigo_de_barras\tcodigo_produto\tdescricao\tsaldo_estoque";
                  navigator.clipboard
                    .writeText(textoParaAreaDeTransferencia)
                    .then(() => {
                      const btn = document.getElementById("copy-btn-desktop");
                      if (btn) {
                        btn.textContent = "Copiado!";
                        setTimeout(() => (btn.textContent = "Copiar"), 2000);
                      }
                    });
                }}
                id="copy-btn-desktop"
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-2 py-1 rounded transition-all"
              >
                Copiar
              </button>
              <div className="overflow-x-auto pb-1">
                <pre className="whitespace-nowrap">
                  {`codigo_de_barras;codigo_produto;descricao;saldo_estoque`}
                </pre>
              </div>
            </div>
          </div>

          {/* Upload + Limpar */}
          <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
            <div className="col-span-9">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleCsvUploadWithConfirmation}
                disabled={isLoading || isImporting}
                key={isImporting ? "importing" : "idle"}
                className="
                  h-10 cursor-pointer
                  border border-dashed
                  transition-colors
                  text-muted-foreground
                "
              />
            </div>
            <div className="col-span-3 h-10">
              {onClearAllData && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onClearAllData}
                  className="
                    w-full h-10 px-8 
                    flex items-center justify-center gap-2
                    text-sm font-medium
                  "
                  aria-label="Limpar importação"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar importação
                </Button>
              )}
            </div>
          </div>

          {isImporting && importProgress.total > 0 && (
            <div className="hidden sm:block space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando importação...</span>
                <span>
                  {Math.round(
                    (importProgress.current / importProgress.total) * 100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={(importProgress.current / importProgress.total) * 100}
                className="w-full h-2 transition-all duration-500 ease-out"
              />
            </div>
          )}

          {/* Relatório de erros da stream */}
          <div className="hidden sm:block">
            {importErrors.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Problemas na importação ({importErrors.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setImportErrors([])}
                  >
                    Limpar
                  </Button>
                </div>

                <div
                  role="alert"
                  className={`
                    w-full rounded-md border border-red-200 bg-red-50
                    dark:bg-red-900/10 dark:border-red-900
                    overflow-y-auto ${MAX_VISIBLE_HEIGHT}
                  `}
                >
                  <div className="p-3 space-y-2">
                    {importErrors
                      .slice(0, MAX_RENDERED_ERRORS)
                      .map((err, idx) => (
                        <div
                          key={idx}
                          className="text-sm border-b border-red-100 dark:border-red-800/50 pb-2 last:border-0"
                        >
                          {err.row ? (
                            <span className="font-mono font-bold text-xs bg-white dark:bg-black/20 px-1.5 py-0.5 rounded mr-2 border">
                              Linha {err.row}
                            </span>
                          ) : null}
                          <span className="text-red-900 dark:text-red-200">
                            {err.message}
                          </span>
                        </div>
                      ))}
                  </div>

                  {importErrors.length > MAX_RENDERED_ERRORS && (
                    <div className="bg-red-100/50 dark:bg-red-900/20 p-2 text-center border-t border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        ...e mais {importErrors.length - MAX_RENDERED_ERRORS}{" "}
                        erros
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Erros gerais do CSV */}
          {!isImporting && csvErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Erros encontrados:</p>
                  {csvErrors.map((error, index) => (
                    <p key={index} className="text-sm break-words">
                      {error}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

ImportUploadSection.displayName = "ImportUploadSection";
