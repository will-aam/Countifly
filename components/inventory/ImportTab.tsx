/**
 * Descrição: Aba de importação de produtos via arquivo CSV.
 * Responsabilidade: Interface feita para upload de arquivos CSV,
 * exibindo apenas informações essenciais com progresso claro e feedback direto.
 */

"use client";

import type React from "react";
import { useState } from "react";

// --- Componentes de UI ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatNumberBR } from "@/lib/utils";

// --- Ícones ---
import {
  Upload,
  AlertCircle,
  Monitor,
  Share2,
  Link as LinkIcon,
  Zap,
} from "lucide-react";

// --- Tipos ---
import type { Product, BarCode } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { ImportUploadSection } from "@/components/inventory/Import/ImportUploadSection";

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
      {formatNumberBR(product.saldo_estoque)}
    </TableCell>
  </TableRow>
);
ProductTableRow.displayName = "ProductTableRow";

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
  // Esses estados agora são só os globais; o upload section cuida do resto
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

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

  return (
    <TooltipProvider>
      <>
        {/* Mensagem para dispositivos móveis - SEMPRE exibida em telas pequenas */}
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
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo para desktop - SOMENTE exibido em telas grandes */}
        <div className="hidden sm:block">
          {/* Seção de upload / aviso / erros */}
          <ImportUploadSection
            userId={userId}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            csvErrors={csvErrors}
            setCsvErrors={setCsvErrors}
            products={products}
            onClearAllData={onClearAllData}
            downloadTemplateCSV={downloadTemplateCSV}
            loadCatalogFromDb={loadCatalogFromDb}
          />

          {/* Lista de produtos importados */}
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
                        <TableHead className="min-w-[180px]">
                          Produto / Códigos
                        </TableHead>
                        <TableHead className="text-right whitespace-nowrap min-w-[100px]">
                          Estoque
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
                {products.length > 10 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Mostrando todos os {products.length} itens. Role para ver
                    mais.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            !isLoading && (
              <Card className="mt-6">
                <CardContent className="py-8 sm:py-12">
                  <div className="hidden sm:block text-center text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium text-lg">
                      Nenhum produto cadastrado
                    </p>
                    <p className="text-sm">
                      Importe um arquivo CSV utilizando o formulário acima.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </>
    </TooltipProvider>
  );
};

ImportTab.displayName = "ImportTab";
