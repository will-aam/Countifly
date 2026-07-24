"use client";

import { useState, useMemo } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Link as LinkIcon,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseFile, ParsedItem } from "@/lib/file-parser";
import { generateBarcodeSvg } from "@/lib/barcode";

export default function LabelsGeneratorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const [pdfConfig, setPdfConfig] = useState({ cols: 3, rows: 8 });
  const [bulkImageUrl, setBulkImageUrl] = useState("");

  // Preview Limitado para não travar a tela com SVGs infinitos
  const previewLimit = 12;
  const previewItems = useMemo(() => items.slice(0, previewLimit), [items]);
  const labelRatio = 210 / pdfConfig.cols / (297 / pdfConfig.rows);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setItems([]);
    setErrorMsg("");
    setStatus("loading");

    try {
      const parsed = await parseFile(file);
      setItems(parsed);
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Erro ao ler o arquivo.");
    }
  }

  function updateItemImageByIndex(index: number, newUrl: string) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], imagem: newUrl };
      return next;
    });
  }

  function applyBulkImageUrl() {
    const url = bulkImageUrl.trim();
    if (!url) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.imagem?.trim()) return it;
        return { ...it, imagem: url };
      }),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Controles do PDF */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-slate-50 p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">Gerador de Etiquetas</h1>
          <p className="text-slate-400 text-sm">
            Importe seus produtos e gere layouts para impressão.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800 p-2 px-4 rounded-lg border border-slate-700">
          <span className="text-sm font-medium text-slate-300">
            Layout (A4):
          </span>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              Colunas:
              <Input
                type="number"
                min="1"
                max="10"
                value={pdfConfig.cols}
                onChange={(e) =>
                  setPdfConfig({ ...pdfConfig, cols: Number(e.target.value) })
                }
                className="w-16 h-8 bg-slate-900 border-slate-600 text-slate-50"
              />
            </label>
            <label className="flex items-center gap-1">
              Linhas:
              <Input
                type="number"
                min="1"
                max="20"
                value={pdfConfig.rows}
                onChange={(e) =>
                  setPdfConfig({ ...pdfConfig, rows: Number(e.target.value) })
                }
                className="w-16 h-8 bg-slate-900 border-slate-600 text-slate-50"
              />
            </label>
          </div>
          <Button variant="secondary" size="sm" className="ml-2 gap-2">
            <Printer className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Importar Planilha</CardTitle>
            <CardDescription>
              Envie um arquivo .csv ou .xlsx contendo código e nome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique ou arraste o arquivo aqui
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv, .xlsx"
                onChange={handleFileChange}
              />
            </label>
          </CardContent>
        </Card>

        {/* Resumo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Arquivo:</span>
              <span className="font-medium truncate max-w-[200px]">
                {selectedFile?.name || "Nenhum selecionado"}
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">
                {status === "idle" && (
                  <span className="text-slate-500">Aguardando</span>
                )}
                {status === "loading" && (
                  <span className="text-orange-500">Processando...</span>
                )}
                {status === "done" && (
                  <span className="text-green-600">Concluído</span>
                )}
                {status === "error" && (
                  <span className="text-red-500">Erro</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Itens Identificados:
              </span>
              <span className="text-2xl font-bold text-primary">
                {items.length}
              </span>
            </div>
            {errorMsg && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {errorMsg}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {items.length > 0 && (
        <>
          {/* Ações em Massa */}
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Imagens</CardTitle>
              <CardDescription>
                Atribua imagens padrão ou envie em lote.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  URL Padrão (para itens sem foto)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://site.com/imagem.jpg"
                    value={bulkImageUrl}
                    onChange={(e) => setBulkImageUrl(e.target.value)}
                  />
                  <Button
                    onClick={applyBulkImageUrl}
                    disabled={!bulkImageUrl.trim()}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center border rounded-lg bg-muted/20 p-4">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Upload de Lote Local (Em breve)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Produtos */}
          <Card>
            <CardHeader>
              <CardTitle>Listagem de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[150px]">CÓDIGO</TableHead>
                      <TableHead>NOME DO PRODUTO</TableHead>
                      <TableHead className="w-[400px]">IMAGEM (URL)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={`${it.codigo}-${idx}`}>
                        <TableCell className="font-mono">{it.codigo}</TableCell>
                        <TableCell>
                          {it.nome || (
                            <span className="text-muted-foreground italic">
                              Sem nome
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            <Input
                              className="h-8 text-xs"
                              placeholder="Cole a URL..."
                              value={it.imagem || ""}
                              onChange={(e) =>
                                updateItemImageByIndex(idx, e.target.value)
                              }
                            />
                            {it.imagem && (
                              <a
                                href={it.imagem}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:bg-muted p-2 rounded"
                              >
                                <LinkIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Preview SVG */}
          <Card>
            <CardHeader>
              <CardTitle>
                Pré-visualização do Layout ({pdfConfig.cols} x {pdfConfig.rows})
              </CardTitle>
              <CardDescription>
                Mostrando os primeiros {Math.min(previewLimit, items.length)}{" "}
                itens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-4 bg-muted/30 p-4 rounded-lg border border-border"
                style={{
                  gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
                }}
              >
                {previewItems.map((it, idx) => {
                  let svg = "";
                  let error = "";
                  try {
                    svg = generateBarcodeSvg(it.codigo);
                  } catch (e) {
                    error = "Erro no código";
                  }

                  const hasImage = !!it.imagem && it.imagem.trim().length > 0;

                  return (
                    <div
                      key={idx}
                      className="bg-card border rounded-md p-2 flex flex-col shadow-sm"
                      style={{ aspectRatio: `${labelRatio} / 1` }}
                    >
                      <div className="flex-1 flex overflow-hidden items-center">
                        <div
                          className="h-full flex items-center justify-center"
                          style={{ width: hasImage ? "60%" : "100%" }}
                        >
                          {error ? (
                            <span className="text-[10px] text-destructive">
                              {error}
                            </span>
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: svg }}
                            />
                          )}
                        </div>
                        {hasImage && (
                          <div className="w-[40%] h-full pl-1 flex items-center justify-center">
                            <img
                              src={it.imagem}
                              alt=""
                              className="max-w-full max-h-full object-contain rounded"
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-center border-t border-dashed mt-1 pt-1">
                        <div className="text-[10px] font-bold text-foreground leading-tight truncate">
                          {it.codigo}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {it.nome || "Produto sem nome"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
