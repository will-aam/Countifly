// components/inventory/ImportTab.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react"; // Adicionei useState aqui para forçar re-render na comparação

// --- Componentes ---
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

// --- Hooks e Subcomponentes ---
import { useImportState } from "@/components/inventory/Import/useImportState";
import { ImportUploadSection } from "@/components/inventory/Import/ImportUploadSection";
import type { Product, BarCode } from "@/lib/types";

// --- Interfaces ---
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

// --- Componente da Linha da Tabela ---
interface ProductTableRowProps {
  product: Product;
  barCode?: BarCode;
  isModified?: boolean;
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

// --- Componente Principal ---
export const ImportTab: React.FC<ImportTabProps> = (props) => {
  const { modifiedProductCodes, captureSnapshot, detectChanges } =
    useImportState();

  // Flag para indicar que precisamos comparar na próxima renderização
  const [shouldCompare, setShouldCompare] = useState(false);

  // Callback chamado pelo Upload Section ANTES de começar o upload
  const handleImportStart = () => {
    captureSnapshot(props.products);
  };

  // Callback chamado pelo Upload Section DEPOIS que o upload termina
  const handleImportSuccess = async () => {
    await props.loadCatalogFromDb();
    setShouldCompare(true); // Marca para comparar assim que os produtos atualizarem
  };

  // Efeito que roda quando 'products' muda. Se tivermos flag de comparação, executamos.
  useEffect(() => {
    if (shouldCompare && props.products.length > 0) {
      detectChanges(props.products);
      setShouldCompare(false); // Reseta a flag
      props.setIsLoading(false);
    }
  }, [props.products, shouldCompare, detectChanges, props.setIsLoading]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Seção de Upload (Componentizada) */}
        <ImportUploadSection
          {...props}
          onImportStart={handleImportStart}
          onImportSuccess={handleImportSuccess}
        />

        {/* Tabela de Resultados */}
        {props.products.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Produtos Importados ({props.products.length})
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
                    {props.products.map((product) => (
                      <ProductTableRow
                        key={product.id}
                        product={product}
                        barCode={props.barCodes.find(
                          (bc) => bc.produto_id === product.id
                        )}
                        // Verifica se está na lista de modificados
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
              {props.products.length > 10 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Mostrando todos os {props.products.length} itens.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          !props.isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg">Nenhum produto cadastrado</p>
                <p className="text-sm">Importe um arquivo CSV acima.</p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </TooltipProvider>
  );
};

ImportTab.displayName = "ImportTab";
