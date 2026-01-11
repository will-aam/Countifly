// app/components/inventory/Import/ImportUploadSection.tsx
"use client";

import React, { useState } from "react";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// Icons
import {
  Download,
  HelpCircle,
  AlertCircle,
  Trash2,
  Monitor,
  Share2,
  Link as LinkIcon,
  Zap,
  Upload,
} from "lucide-react";

// Utils & Types
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
  onStartDemo: () => void;

  // Callbacks para o fluxo de importação
  onImportStart: () => void; // Para tirar o snapshot
  onImportSuccess: () => Promise<void>; // Para recarregar o banco
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
  onStartDemo,
  onImportStart,
  onImportSuccess,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportErrorDetail[]>([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    imported: 0,
    errors: 0,
  });
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // --- Handlers Auxiliares ---
  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado",
        description: "Envie o link por WhatsApp ou e-mail.",
      });
    });
  };

  const handleShareLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Acesse o Countifly no computador",
      text: "Link de acesso:",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log(err);
      }
    } else {
      handleCopyLink();
    }
  };

  // --- Lógica Principal de Upload ---
  const processUpload = async (file: File) => {
    if (!userId) return;

    // 1. Prepara UI e Snapshot
    setImportErrors([]);
    setIsImporting(true);
    setCsvErrors([]);
    setImportProgress({ current: 0, total: 0, imported: 0, errors: 0 });
    setIsLoading(true);

    // Avisa o pai para tirar o snapshot AGORA
    onImportStart();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/inventory/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new Error("Sessão expirada.");
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao enviar o arquivo.");
      }

      if (!response.body) throw new Error("Sem resposta do servidor.");

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
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.substring(6));

            if (data.type === "fatal") {
              setImportErrors((prev) => [
                ...prev,
                { message: data.error, type: "fatal" },
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
                  message: `Código ${data.barcode} já existe.`,
                  type: "conflict",
                },
              ]);
            }
            if (data.type === "start") {
              setImportProgress({
                current: 0,
                total: data.total,
                imported: 0,
                errors: 0,
              });
            }
            if (data.type === "progress") {
              setImportProgress((prev) => ({ ...prev, ...data }));
            }
            if (data.type === "complete") {
              // Importação finalizada no back
              setIsImporting(false);
              // Chama o sucesso no pai (recarregar DB e comparar)
              await onImportSuccess();
            }
          }
        }
      }
    } catch (error: any) {
      setCsvErrors([error.message || "Erro desconhecido."]);
      setIsImporting(false);
      setIsLoading(false);
    } finally {
      if (!isImporting) setIsLoading(false);
    }
  };

  const handleCsvUploadWithConfirmation = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";

    if (products.length === 0) {
      void processUpload(file);
    } else {
      setPendingFile(file);
      setIsConfirmDialogOpen(true);
    }
  };

  const confirmImport = async () => {
    if (pendingFile) {
      const f = pendingFile;
      setPendingFile(null);
      setIsConfirmDialogOpen(false);
      await processUpload(f);
    }
  };

  return (
    <TooltipProvider>
      {/* Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar novo arquivo CSV?</DialogTitle>
            <DialogDescription className="space-y-2 text-sm">
              <p>Já existem produtos importados. Se continuar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Itens novos serão adicionados.</li>
                <li>
                  Itens existentes serão <strong>somados</strong>.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                Para zerar, use "Limpar importação" antes.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingFile(null);
                setIsConfirmDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmImport}>Continuar importação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile View */}
      <div className="block sm:hidden">
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center space-y-6 pt-4">
              <div className="space-y-2">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Monitor className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-x1 font-semibold">
                  Configure no computador
                </h3>
              </div>
              <div className="text-left text-sm text-muted-foreground space-y-3 bg-muted/50 p-5 rounded-lg border border-border">
                <p>
                  1. Acesse o <strong>Countifly</strong> pelo computador.
                </p>
                <p>2. Baixe o modelo e preencha.</p>
                <p>3. Importe o arquivo.</p>
              </div>
              <Button
                onClick={onStartDemo}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                <Zap className="mr-2 h-5 w-5" /> Explorar modo demonstração
              </Button>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button onClick={handleShareLink} className="w-full">
                  <Share2 className="mr-2 h-4 w-4" /> Enviar link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full"
                >
                  <LinkIcon className="mr-2 h-4 w-4" /> Copiar link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Importar produtos
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full opacity-70"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-0">
                  <div className="p-4 space-y-3">
                    <h4 className="font-semibold">
                      Orientações para o arquivo CSV
                    </h4>
                    <ul className="text-sm space-y-1">
                      <li>
                        <span className="font-medium">Separador:</span> ponto e
                        vírgula (;)
                      </li>
                      <li>
                        <span className="font-medium">Código de barras:</span>{" "}
                        formato número
                      </li>
                      <li>
                        <span className="font-medium">Codificação:</span> UTF-8
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
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Apenas o bloco de código com o botão de copiar */}
            <div className="text-xs text-blue-600 dark:text-blue-400">
              <div className="relative bg-gray-950 text-gray-100 rounded-md p-3 font-mono text-xs border-blue-300 dark:border-blue-600 border">
                <button
                  onClick={() => {
                    const textoParaAreaDeTransferencia =
                      "codigo_de_barras\tcodigo_produto\tdescricao\tsaldo_estoque";
                    navigator.clipboard
                      .writeText(textoParaAreaDeTransferencia)
                      .then(() => {
                        const btn = document.getElementById("copy-btn");
                        if (btn) {
                          btn.textContent = "Copiado!";
                          setTimeout(() => (btn.textContent = "Copiar"), 2000);
                        }
                      });
                  }}
                  id="copy-btn"
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

            {/* Input e Botões */}
            <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
              <div className="col-span-9">
                <Input
                  type="file"
                  accept=".csv"
                  disabled={isLoading || isImporting}
                  onChange={handleCsvUploadWithConfirmation}
                  className="h-10 cursor-pointer border-dashed"
                />
              </div>
              <div className="col-span-3 h-10">
                {onClearAllData && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onClearAllData}
                    // ALTERAÇÃO AQUI: Desabilita se não houver produtos
                    disabled={products.length === 0 || isLoading || isImporting}
                    className="w-full h-10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Limpar importação
                  </Button>
                )}
              </div>
            </div>

            {/* Barra de Progresso */}
            {isImporting && importProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importando...</span>
                  <span>
                    {Math.round(
                      (importProgress.current / importProgress.total) * 100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={(importProgress.current / importProgress.total) * 100}
                  className="h-2"
                />
              </div>
            )}

            {/* Lista de Erros */}
            {importErrors.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-red-600 flex gap-2">
                    <AlertCircle className="h-4 w-4" /> Erros (
                    {importErrors.length})
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
                  className={`w-full rounded-md border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900 overflow-y-auto ${MAX_VISIBLE_HEIGHT}`}
                >
                  <div className="p-3 space-y-2">
                    {importErrors
                      .slice(0, MAX_RENDERED_ERRORS)
                      .map((err, i) => (
                        <div
                          key={i}
                          className="text-sm border-b border-red-100 dark:border-red-800/50 pb-2 last:border-0 text-red-900 dark:text-red-200"
                        >
                          {err.row && (
                            <span className="font-mono font-bold text-xs bg-white dark:bg-black/20 px-1 rounded border mr-2">
                              Linha {err.row}
                            </span>
                          )}
                          {err.message}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Erros Gerais CSV */}
            {!isImporting && csvErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {csvErrors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
