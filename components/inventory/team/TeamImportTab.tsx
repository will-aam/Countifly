// components/inventory/team/TeamImportTab.tsx
/**
 * Aba de Importação do Modo Equipe
 * - IDÊNTICA ao modo individual (ImportTab.tsx)
 * - Reutiliza ImportUploadSection
 * - Suporta SSE automático
 */
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Upload } from "lucide-react";
import { formatNumberBR } from "@/lib/utils";

import { ImportUploadSection } from "@/components/inventory/Import/ImportUploadSection";

interface ProductSessao {
  codigo_produto: string;
  codigo_barras: string | null;
  descricao: string;
  saldo_sistema: number;
  saldo_contado: number;
}

interface TeamImportTabProps {
  sessionId: number;
  userId: number;
  products: ProductSessao[];
  onImportSuccess: () => Promise<void>;
  onClearImport: () => void;
}

// Componente da linha da tabela (igual ao modo individual)
interface ProductTableRowProps {
  product: ProductSessao;
  isModified?: boolean;
}

const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
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
          {product.codigo_barras || "N/A"}
        </div>
      </div>
    </TableCell>
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
        <span>{formatNumberBR(product.saldo_sistema)}</span>
      </div>
    </TableCell>
  </TableRow>
);

export function TeamImportTab({
  sessionId,
  userId,
  products,
  onImportSuccess,
  onClearImport,
}: TeamImportTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Filtra produtos (se necessário - por enquanto usa todos)
  const displayedProducts = useMemo(() => {
    return products;
  }, [products]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ✅ CÓPIA EXATA do ImportTab: ImportUploadSection */}
        <ImportUploadSection
          userId={userId}
          setIsLoading={setIsLoading}
          setCsvErrors={setCsvErrors}
          isLoading={isLoading}
          csvErrors={csvErrors}
          products={displayedProducts as any} // Cast para compatibilidade
          onClearAllData={onClearImport}
          downloadTemplateCSV={() => {
            // Função de download de template
            const header =
              "codigo_de_barras;codigo_produto;descricao;saldo_estoque";
            const blob = new Blob([`\uFEFF${header}`], {
              type: "text/csv;charset=utf-8;",
            });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "modelo_importacao_sessao.csv";
            link.click();
          }}
          onImportStart={() => {
            // Antes de começar a importação
            console.log("[TeamImport] Iniciando importação...");
          }}
          onImportSuccess={onImportSuccess}
          customApiUrl={`/api/sessions/${sessionId}/import`} // ✅ API da sessão
          hideEducationalCards={false}
        />

        {/* ✅ CÓPIA EXATA do ImportTab: Tabela de Resultados */}
        {displayedProducts.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Produtos Importados ({displayedProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">
                        Produto / Códigos
                      </TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProducts.map((product, idx) => (
                      <ProductTableRow
                        key={`${product.codigo_produto}-${idx}`}
                        product={product}
                        isModified={false} // Pode adicionar lógica de modificação se quiser
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              {displayedProducts.length > 10 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Mostrando todos os {displayedProducts.length} itens.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          !isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg">Nenhum produto importado</p>
                <p className="text-sm">Importe um arquivo CSV acima.</p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </TooltipProvider>
  );
}
