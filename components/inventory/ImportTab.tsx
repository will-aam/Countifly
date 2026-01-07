// components/inventory/ImportTab.tsx
/**
 * Descrição: Aba de importação de produtos via arquivo CSV.
 * Responsabilidade: Interface feita para upload de arquivos CSV,
 * exibindo apenas informações essenciais com progresso claro e feedback direto.
 */

"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";

// --- Componentes de UI ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Trash2,
  HelpCircle,
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
  onClearAllData?: () => void;
}

interface ImportErrorDetail {
  row?: number;
  message: string;
  type: "error" | "conflict" | "fatal";
  details?: string;
}

// --- COMPONENTE DA LINHA (Modificado para o Pontinho Azul) ---
interface ProductTableRowProps {
  product: Product;
  barCode?: BarCode;
  isModified?: boolean; // Nova prop para o indicador
}

const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
  barCode,
  isModified,
}) => (
  <TableRow>
    <TableCell className="min-w-[180px]">
      <div className="flex flex-col gap-0.5">
        <div className="font-medium line-clamp-2 leading-tight">
          {product.descricao}
        </div>
        <div className="text-[12px] text-muted-foreground font-mono">
          Cód: {product.codigo_produto} | Cód. de Barras:{" "}
          {barCode?.codigo_de_barras || "N/A"}
        </div>
      </div>
    </TableCell>

    {/* COLUNA DA QUANTIDADE COM O PONTINHO AZUL */}
    <TableCell className="text-right font-medium whitespace-nowrap">
      <div className="flex items-center justify-end gap-2">
        {isModified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Item novo ou atualizado recentemente</p>
            </TooltipContent>
          </Tooltip>
        )}
        <span>{formatNumberBR(product.saldo_estoque)}</span>
      </div>
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
          <span className="font-semibold">Codificação:</span> UTF-8
        </li>
        <li>
          <span className="font-semibold">Cabeçalho:</span> nomes exatos das
          colunas
        </li>
      </ul>
    </div>
    <div className="text-xs text-blue-600 dark:text-blue-400">
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
          <pre className="whitespace-nowrap">{`codigo_de_barras;codigo_produto;descricao;saldo_estoque`}</pre>
        </div>
      </div>
    </div>
    <Button
      variant="default"
      size="sm"
      onClick={downloadTemplateCSV}
      className="w-full"
    >
      <Download className="h-3 w-3 mr-1" />
      Baixar modelo CSV
    </Button>
  </div>
);
CsvInstructions.displayName = "CsvInstructions";

const MAX_RENDERED_ERRORS = 15;
const MAX_VISIBLE_HEIGHT = "max-h-[300px]";

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
  onClearAllData,
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

  // --- LÓGICA DO PONTINHO AZUL ---
  const [modifiedProductCodes, setModifiedProductCodes] = useState<Set<string>>(
    new Set()
  );
  // Snapshot para guardar o estado ANTES da importação
  const preImportSnapshot = useRef<Map<string, number>>(new Map());

  // --- CONTROLE DE UI ---
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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
        console.log(err);
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
        description: "Envie o link por WhatsApp ou e-mail.",
      });
    });
  };

  // --- FUNÇÃO PRINCIPAL DE UPLOAD ---
  const processUpload = async (file: File) => {
    if (!userId) return;

    // 1. Limpa erros e inicia loading
    setImportErrors([]);
    setIsImporting(true);
    setCsvErrors([]);
    setImportProgress({ current: 0, total: 0, imported: 0, errors: 0 });
    setIsLoading(true);

    // 2. TIRA A FOTO (SNAPSHOT) DO ESTOQUE ATUAL
    const snapshot = new Map<string, number>();
    products.forEach((p) => {
      if (p.codigo_produto) {
        snapshot.set(p.codigo_produto.toString(), Number(p.saldo_estoque || 0));
      }
    });
    preImportSnapshot.current = snapshot;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/inventory/${userId}/import`, {
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
              setIsImporting(false);

              // 3. RECARREGA OS DADOS DO BANCO
              await loadCatalogFromDb();

              // 4. LÓGICA DE COMPARAÇÃO (RODA APÓS O LOAD)
              // Como o 'products' é uma prop, precisamos esperar o pai atualizar ou
              // forçar a comparação na próxima renderização.
              // Mas aqui, vamos usar um setTimeout curto para garantir que o React atualizou o estado 'products' do pai
              // OBS: O ideal seria um useEffect, mas para forçar a detecção:

              // Vamos emitir um evento customizado ou apenas confiar que quando o pai atualizar
              // a gente compara. Vou usar uma estratégia segura:
              // Definimos um flag que o useEffect vai capturar.
              setNeedsComparison(true);
            }
          }
        }
      }
    } catch (error: any) {
      setCsvErrors([error.message || "Erro desconhecido."]);
      setIsImporting(false);
      setIsLoading(false);
    } finally {
      // Garantia de desligar o loading se algo quebrar
      if (!isImporting) setIsLoading(false);
    }
  };

  // Estado auxiliar para disparar a comparação assim que 'products' mudar
  const [needsComparison, setNeedsComparison] = useState(false);

  useEffect(() => {
    if (needsComparison && products.length > 0) {
      const modified = new Set<string>();

      products.forEach((prod) => {
        if (!prod.codigo_produto) return;
        const codigo = prod.codigo_produto.toString();
        const saldoAtual = Number(prod.saldo_estoque || 0);
        const saldoAntigo = preImportSnapshot.current.get(codigo);

        // Se não existia antes (novo) OU se o saldo é diferente (soma)
        if (saldoAntigo === undefined || saldoAntigo !== saldoAtual) {
          modified.add(codigo);
        }
      });

      setModifiedProductCodes(modified);
      setNeedsComparison(false); // Reseta o gatilho
      setIsLoading(false); // Libera a UI

      // Limpa o snapshot para liberar memória
      preImportSnapshot.current.clear();
    }
  }, [products, needsComparison, setIsLoading]);

  const handleCsvUploadWithConfirmation = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = ""; // Limpa input

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

  const cancelImport = () => {
    setPendingFile(null);
    setIsConfirmDialogOpen(false);
  };

  return (
    <>
      <TooltipProvider>
        {/* --- DIALOG DE CONFIRMAÇÃO --- */}
        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
        >
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
              <Button variant="outline" onClick={cancelImport}>
                Cancelar
              </Button>
              <Button onClick={confirmImport}>Continuar importação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MOBILE (MANTIDO IDÊNTICO) */}
        <div className="block sm:hidden">
          {/* ... Seu código mobile original mantido ... */}
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

        {/* DESKTOP */}
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
                  <TooltipContent>
                    <p>Use o modelo CSV padrão.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Instruções de Copiar Código - Mantido */}
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <div className="relative bg-gray-950 text-gray-100 rounded-md p-3 font-mono text-xs border-blue-300 dark:border-blue-600 border">
                  <button
                    id="copy-btn-desk"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        "codigo_de_barras;codigo_produto;descricao;saldo_estoque"
                      )
                    }
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                  >
                    Copiar
                  </button>
                  <pre className="whitespace-nowrap">{`codigo_de_barras;codigo_produto;descricao;saldo_estoque`}</pre>
                </div>
              </div>

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
                      className="w-full h-10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Limpar importação
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
                        (importProgress.current / importProgress.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (importProgress.current / importProgress.total) * 100
                    }
                    className="h-2"
                  />
                </div>
              )}

              {/* Erros - Mantido */}
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

          {products.length > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Produtos Importados ({products.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto / Códigos</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          barCode={barCodes.find(
                            (bc) => bc.produto_id === product.id
                          )}
                          // AQUI A MÁGICA: Se o código estiver no Set de modificados, ativa o pontinho
                          isModified={
                            product.codigo_produto
                              ? modifiedProductCodes.has(
                                  product.codigo_produto.toString()
                                )
                              : false
                          }
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {products.length > 10 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Mostrando todos os {products.length} itens.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            !isImporting && (
              <Card className="mt-6">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-lg">
                    Nenhum produto cadastrado
                  </p>
                  <p className="text-sm">Importe um arquivo CSV acima.</p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </TooltipProvider>
    </>
  );
};

ImportTab.displayName = "ImportTab";
