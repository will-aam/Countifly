// components/inventory/ImportTab.tsx
/**
 * Descrição: Aba de importação de produtos via arquivo CSV.
 * Responsabilidade: Interface feita para upload de arquivos CSV,
 * exibindo apenas informações essenciais com progresso claro e feedback direto.
 */

"use client";

import type React from "react";
import { useState } from "react";

// --- Componentes de UI ---
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatNumberBR } from "@/lib/utils";

// --- Ícones ---
import {
  Upload,
  Download,
  AlertCircle,
  Monitor,
  Share2,
  Link as LinkIcon,
  Zap,
} from "lucide-react";

// --- Tipos ---
import type { Product, BarCode } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

// --- Interfaces e Tipos ---
interface ImportTabProps {
  userId: number | null;
  setIsLoading: (loading: boolean) => void;
  setCsvErrors: (errors: string[]) => void;
  loadCatalogFromDb: () => Promise<void>;
  isLoading: boolean;
  csvErrors: string[];
  products: Product[];
  barCodes: BarCode[];
  downloadTemplateCSV: () => void;
  onStartDemo: () => void;
}

// --- Nova Interface para Erros de Importação ---
interface ImportErrorDetail {
  row?: number;
  message: string;
  type: "error" | "conflict" | "fatal";
  details?: string;
}

// --- Componentes Helper ---
interface ProductTableRowProps {
  product: Product;
  barCode?: BarCode;
}

const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
  barCode,
}) => (
  <TableRow>
    <TableCell className="font-medium">{product.codigo_produto}</TableCell>
    <TableCell>{product.descricao}</TableCell>
    <TableCell>
      <Badge variant="outline">{formatNumberBR(product.saldo_estoque)}</Badge>
    </TableCell>
    <TableCell className="font-mono text-sm hidden sm:table-cell">
      {barCode?.codigo_de_barras || "-"}
    </TableCell>
  </TableRow>
);
ProductTableRow.displayName = "ProductTableRow";

interface CsvInstructionsProps {
  downloadTemplateCSV: () => void;
  isMobile?: boolean;
}

const CsvInstructions: React.FC<CsvInstructionsProps> = ({
  downloadTemplateCSV,
  isMobile = false,
}) => (
  <div className="space-y-4">
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-3">
        Orientações para o arquivo CSV
      </h3>
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
        <li>
          <span className="font-semibold">Separador:</span> ponto e vírgula (;)
        </li>
        <li>
          <span className="font-semibold">Código de barras:</span> formato
          número
        </li>
        <li>
          <span className="font-semibold">Saldo em estoque:</span> apenas
          números inteiros
        </li>
        <li>
          <span className="font-semibold">Codificação:</span> UTF-8
        </li>
        <li>
          <span className="font-semibold">Cabeçalho:</span> nomes exatos das
          colunas
        </li>
      </ul>
    </div>

    {!isMobile && (
      <div className="text-xs text-blue-600 dark:text-blue-400">
        <div className="relative bg-gray-950 text-gray-100 rounded-md p-3 font-mono text-xs border border-gray-800">
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
            className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 py-1 rounded transition-all"
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
    )}

    <Button
      variant="outline"
      size="sm"
      onClick={downloadTemplateCSV}
      className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/30 bg-transparent"
    >
      <Download className="h-3 w-3 mr-1" />
      Baixar modelo CSV
    </Button>
  </div>
);
CsvInstructions.displayName = "CsvInstructions";

// --- MELHORIA: Constantes movidas para fora do componente para evitar recriação ---
const MAX_RENDERED_ERRORS = 15; // Renderiza até 15 itens no HTML
const MAX_VISIBLE_HEIGHT = "max-h-[300px]"; // Altura para mostrar +/- 6 itens antes de cortar

export const ImportTab: React.FC<ImportTabProps> = ({
  userId,
  setIsLoading,
  setCsvErrors,
  loadCatalogFromDb,
  isLoading,
  csvErrors,
  products,
  barCodes,
  downloadTemplateCSV,
  onStartDemo,
}) => {
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

  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportErrorDetail[]>([]);

  const handleShareLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Acesse o Countifly no computador",
      text: "Acesse o sistema de inventário Countifly pelo computador utilizando o link abaixo:",
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Usuário cancelou o compartilhamento ou erro:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado",
        description:
          "Envie o link por WhatsApp ou e-mail para acessá-lo pelo computador.",
      });
    });
  };

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
          if (line.startsWith("data: ")) {
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

              // Para tudo, pois é fatal
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
      }
    } catch (error: any) {
      console.error("Erro no handleCsvUploadWithProgress:", error);
      setCsvErrors([error.message || "Ocorreu um erro durante a importação."]);
      setIsImporting(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Importar produtos
          </CardTitle>
          <CardDescription>
            Importe um arquivo CSV com a sua base de produtos.
          </CardDescription>

          <div className="hidden sm:block mt-4">
            <CsvInstructions
              downloadTemplateCSV={downloadTemplateCSV}
              isMobile={false}
            />
          </div>

          <div className="sm:hidden mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Ver orientações para o CSV
                </Button>
              </DialogTrigger>

              <DialogContent
                className={`
                  w-full
                  max-w[calc(100vw-2rem)]
                  sm:max-w-2xl
                  max-h-[85vh]
                  p-0
                  flex flex-col
                  overflow-hidden
                `}
              >
                <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
                  <DialogTitle className="text-lg sm:text-xl break-words">
                    Orientações para o arquivo CSV
                  </DialogTitle>
                </DialogHeader>

                <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto">
                  <div className="max-w-full">
                    <CsvInstructions
                      downloadTemplateCSV={downloadTemplateCSV}
                      isMobile={true}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden sm:block space-y-2">
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleCsvUploadWithProgress}
              disabled={isLoading || isImporting}
              key={isImporting ? "importing" : "idle"}
            />

            {isImporting && importProgress.total > 0 && (
              <div className="space-y-2">
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

            {/* --- RELATÓRIO DE ERROS SIMPLIFICADO --- */}
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

          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-semibold text-blue-800 dark:text-blue-200">
                Produtos cadastrados
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {products.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {products.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Produtos cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table className="responsive-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Código de barras
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const barCode = barCodes.find(
                      (bc) => bc.produto_id === product.id
                    );
                    return (
                      <ProductTableRow
                        key={product.id}
                        product={product}
                        barCode={barCode}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        !isImporting && (
          <Card>
            <CardContent className="py-8 sm:py-12">
              <div className="block sm:hidden text-center space-y-6 pt-4">
                <div className="space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Monitor className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-x1 font-semibold">
                    Configure no computador
                  </h3>
                </div>

                <div className="text-left text-sm text-muted-foreground space-y-3 bg-muted/50 p-5 rounded-lg border border-border">
                  <p className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>
                      Acesse o <strong>Countifly</strong> pelo computador.
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>
                      Baixe o modelo CSV e preencha com os dados do seu ERP.
                    </span>
                  </p>
                  <p className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Importe o arquivo no computador.</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>
                      Após a importação, os dados serão exibidos automaticamente
                      aqui no aplicativo.
                    </span>
                  </p>
                </div>

                <Button
                  onClick={onStartDemo}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-md h-12"
                >
                  <Zap className="mr-2 h-5 w-5 fill-current" />
                  Explorar modo demonstração
                </Button>

                <div className="pt-4 border-t border-border/60">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Continue no computador:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={handleShareLink} className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Enviar link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="w-full"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Copiar link
                    </Button>
                  </div>
                </div>
              </div>

              <div className="hidden sm:block text-center text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg">Nenhum produto cadastrado</p>
                <p className="text-sm">
                  Importe um arquivo CSV utilizando o formulário acima.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </>
  );
};

ImportTab.displayName = "ImportTab";
