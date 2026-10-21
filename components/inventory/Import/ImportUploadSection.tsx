// components/inventory/Import/ImportUploadSection.tsx
// Componente da aba de Importação de Dados. Gerencia o upload de arquivos CSV, exibe erros de validação e mostra uma tabela dos produtos importados. Utiliza um hook de estado específico para controlar quais itens foram modificados em relação ao snapshot anterior, permitindo destacar visualmente os novos ou alterados. Inclui também uma seção de upload componentizada para melhor organização e reutilização do código.
"use client";

import React, { useState, useMemo } from "react";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// Importando o componente reutilizável de erros
import {
  ImportErrorList,
  ImportError,
  ImportConflict,
} from "@/components/ImportErrorList";

// Icons
import {
  Download,
  HelpCircle,
  AlertCircle,
  Trash2,
  Monitor,
  Share2,
  Link as LinkIcon,
} from "lucide-react";

// Utils & Types
import type { Product } from "@/lib/types";

interface ImportUploadSectionProps {
  userId: number | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  csvErrors: string[];
  setCsvErrors: (errors: string[]) => void;
  products: Product[];
  onClearAllData?: () => void;
  downloadTemplateCSV?: () => void;
  allowBalanceStrategyChoice?: boolean;
  onImportStart: () => void;
  onImportSuccess: () => Promise<void>;
  onImportFailure?: () => void;
  customApiUrl?: string;
  hideEducationalCards?: boolean;
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
  allowBalanceStrategyChoice = false,
  onImportStart,
  onImportSuccess,
  onImportFailure,
  customApiUrl,
  hideEducationalCards = false,
}) => {
  const [isImporting, setIsImporting] = useState(false);

  // Substituímos o importErrors genérico pelos estados estruturados do ImportErrorList
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [validationConflicts, setValidationConflicts] = useState<
    ImportConflict[]
  >([]);

  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    imported: 0,
    errors: 0,
  });
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [balanceStrategy, setBalanceStrategy] = useState<"sum" | "replace">(
    "sum",
  );

  const hasImportedItems = useMemo(() => {
    return products && products.length > 0;
  }, [products]);

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

  const handleDownloadTemplate = () => {
    if (downloadTemplateCSV) {
      downloadTemplateCSV();
    } else {
      const header = "codigo_de_barras;codigo_produto;descricao;saldo_estoque";
      const blob = new Blob([`\uFEFF${header}`], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "modelo_importacao.csv";
      link.click();
    }
  };

  // --- Lógica Principal de Upload ---
  const processUpload = async (
    file: File,
    strategy: "sum" | "replace" = "sum",
  ) => {
    if (!userId) return;

    setValidationErrors([]);
    setValidationConflicts([]);
    setIsImporting(true);
    setCsvErrors([]);
    setImportProgress({ current: 0, total: 0, imported: 0, errors: 0 });
    setIsLoading(true);

    onImportStart();

    const formData = new FormData();
    formData.append("file", file);
    if (allowBalanceStrategyChoice) {
      formData.append("existingBalanceStrategy", strategy);
    }

    try {
      const apiUrl = customApiUrl || `/api/inventory/import`;

      const response = await fetch(apiUrl, {
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
              setCsvErrors([data.error]);
              setIsImporting(false);
              setIsLoading(false);
              onImportFailure?.();
              return;
            }
            if (data.type === "row_error") {
              setValidationErrors((prev) => [
                ...prev,
                {
                  row: data.row,
                  reasons: data.reasons || ["Erro de validação desconhecido."],
                  data: data.data, // Repassa os dados da linha (código, desc) se a API enviar
                },
              ]);
            }
            if (data.type === "row_conflict") {
              setValidationConflicts((prev) => [
                ...prev,
                {
                  row: data.row,
                  message: `Código ${data.barcode || "desconhecido"} já existe.`,
                  barcode: data.barcode,
                  codigo_produto: data.codigo_produto,
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
              setIsImporting(false);
              await onImportSuccess();
            }
          }
        }
      }
    } catch (error: any) {
      setCsvErrors([error.message || "Erro desconhecido."]);
      setIsImporting(false);
      setIsLoading(false);
      onImportFailure?.();
    } finally {
      if (!isImporting) setIsLoading(false);
    }
  };

  const handleCsvUploadWithConfirmation = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = "";

    if (!hasImportedItems) {
      void processUpload(file, "sum");
    } else {
      setBalanceStrategy("sum");
      setPendingFile(file);
      setIsConfirmDialogOpen(true);
    }
  };

  const confirmImport = async () => {
    if (pendingFile) {
      const f = pendingFile;
      setPendingFile(null);
      setIsConfirmDialogOpen(false);
      await processUpload(f, balanceStrategy);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar novo arquivo CSV?</DialogTitle>
            <DialogDescription>
              Já existem produtos importados. Produtos novos serão adicionados.
              {allowBalanceStrategyChoice
                ? " Escolha como tratar o saldo dos códigos de produto já existentes."
                : " Os saldos existentes serão somados; para zerá-los, use Limpar importação antes."}
            </DialogDescription>
          </DialogHeader>
          {allowBalanceStrategyChoice ? (
            <RadioGroup
              value={balanceStrategy}
              onValueChange={(value) =>
                setBalanceStrategy(value as "sum" | "replace")
              }
              className="gap-3"
            >
              <Label
                htmlFor="balance-strategy-sum"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <RadioGroupItem
                  id="balance-strategy-sum"
                  value="sum"
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-foreground">Somar ao saldo atual</span>
                  <span className="block text-xs text-muted-foreground">Mantém o comportamento atual.</span>
                </span>
              </Label>
              <Label
                htmlFor="balance-strategy-replace"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <RadioGroupItem
                  id="balance-strategy-replace"
                  value="replace"
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-foreground">Substituir pelo saldo do arquivo</span>
                  <span className="block text-xs text-muted-foreground">Substitui o saldo anterior dos códigos de produto presentes neste arquivo.</span>
                </span>
              </Label>
            </RadioGroup>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Itens existentes serão somados.</li>
            </ul>
          )}
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
            <Button onClick={confirmImport}>
              {allowBalanceStrategyChoice && balanceStrategy === "replace"
                ? "Substituir saldos e importar"
                : "Importar arquivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile guidance for other import flows that use this shared component */}
      {!hideEducationalCards && (
        <div className="block sm:hidden mb-6">
          <Card>
            <CardContent className="py-8 sm:py-12">
              <div className="text-center space-y-6 pt-4">
                <div className="space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Monitor className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Configure no computador</h3>
                </div>
                <div className="text-left text-sm text-muted-foreground space-y-3 bg-muted/50 p-5 rounded-lg border border-border">
                  <p>1. Acesse o <strong>Countifly</strong> pelo computador.</p>
                  <p>2. Baixe o modelo e preencha.</p>
                  <p>3. Importe o arquivo.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button onClick={handleShareLink} className="w-full">
                    <Share2 className="mr-2 h-4 w-4" /> Enviar link
                  </Button>
                  <Button variant="outline" onClick={handleCopyLink} className="w-full">
                    <LinkIcon className="mr-2 h-4 w-4" /> Copiar link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Desktop View (Principal) */}
      <Card className="hidden sm:block border-none shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-0 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              Importar Catálogo
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Ajuda sobre o arquivo CSV"
                    className="h-6 w-6 rounded-full opacity-70"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Use um arquivo CSV com os cabeçalhos e o separador exibidos abaixo.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" /> Baixar modelo CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Preencha o modelo e selecione o arquivo para carregar seu catálogo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-0 sm:px-6">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              O arquivo deve ser CSV, usar ponto e vírgula (;) como separador e manter os nomes exatos das colunas. Codificação UTF-8.
            </p>
            <div className="relative bg-gray-950 text-gray-100 rounded-md p-3 font-mono text-xs border-blue-300 dark:border-blue-600 border">
              <button
                onClick={() => {
                  const texto =
                    "codigo_de_barras\tcodigo_produto\tdescricao\tsaldo_estoque";
                  navigator.clipboard.writeText(texto).then(() => {
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

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-9">
              <Input
                type="file"
                accept=".csv"
                disabled={isLoading || isImporting}
                onChange={handleCsvUploadWithConfirmation}
                className="h-10 cursor-pointer border-dashed"
              />
            </div>
            <div className="sm:col-span-3 h-10">
              {onClearAllData && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onClearAllData}
                  disabled={!hasImportedItems || isLoading || isImporting}
                  className="w-full h-10"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {isImporting && importProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>
                  {Math.round(
                    (importProgress.current / importProgress.total) * 100,
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

          {/* Integração direta com o componente reutilizável ImportErrorList */}
          {!isImporting &&
            (validationErrors.length > 0 || validationConflicts.length > 0) && (
              <div className="mt-6">
                <ImportErrorList
                  errors={validationErrors}
                  conflicts={validationConflicts}
                  onClose={() => {
                    setValidationErrors([]);
                    setValidationConflicts([]);
                  }}
                />
              </div>
            )}

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
    </TooltipProvider>
  );
};
