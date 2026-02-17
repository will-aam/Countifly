// components/inventory/team/TeamImportTab.tsx
/**
 * Responsabilidade:
 * 1. Interface para importação CSV.
 * 2. Exibir erros de importação.
 * 3. Listar produtos importados (com dados do sistema e contagem).
 * 4. Botão para limpar dados importados (chama onClearImport).
 * Segurança:
 * - Validação via Token JWT (implementada na API).
 * - Somente o anfitrião pode acessar esta aba (verificado no frontend e backend).
 */
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";
import { ImportUploadSection } from "@/components/inventory/Import/ImportUploadSection";
import { formatNumberBR } from "@/lib/utils";

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
  onClearImport: () => void; // <--- Esta função deve abrir o modal
}

export function TeamImportTab({
  sessionId,
  userId,
  products,
  onImportSuccess,
  onClearImport,
}: TeamImportTabProps) {
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <ImportUploadSection
        userId={userId}
        isLoading={isImportLoading}
        setIsLoading={setIsImportLoading}
        csvErrors={csvErrors}
        setCsvErrors={setCsvErrors}
        products={products as any}
        onImportStart={() => {}}
        onImportSuccess={onImportSuccess}
        customApiUrl={`/api/sessions/${sessionId}/import`}
        hideEducationalCards={false}
        onClearAllData={onClearImport}
      />

      {/* Tabela de Produtos */}
      {products.length > 0 ? (
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>Produtos na Sessão ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">
                      Produto / Códigos
                    </TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, idx) => (
                    <TableRow key={`${product.codigo_produto}-${idx}`}>
                      <TableCell className="min-w-[180px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="font-medium line-clamp-2 leading-tight">
                            {product.descricao}
                          </div>
                          <div className="text-[12px] text-muted-foreground font-mono">
                            Cód: {product.codigo_produto} | Barras:{" "}
                            {product.codigo_barras || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumberBR(product.saldo_sistema)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-bold ${
                            product.saldo_contado > 0
                              ? "text-blue-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatNumberBR(product.saldo_contado)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {products.length > 20 && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Mostrando os primeiros itens...
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        !isImportLoading && (
          <Card className="hidden sm:block">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-lg">Sessão Vazia</p>
              <p className="text-sm">
                Importe um arquivo CSV acima para a equipe começar a contar.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
