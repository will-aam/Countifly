import { useState } from "react";
import { Printer, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button"; //[cite: 4]
import { generateLabelsPdf, downloadPdf } from "@/lib/pdf";
import { ParsedItem } from "@/lib/file-parser";

interface PdfExportProps {
  items: ParsedItem[];
  config: {
    cols: number;
    rows: number;
  };
}

export function PdfExport({ items = [], config }: PdfExportProps) {
  const [status, setStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");

  async function handleGenerate() {
    if (items.length === 0) {
      alert("A lista de itens está vazia. Importe uma planilha primeiro.");
      return;
    }

    setStatus("generating");

    try {
      const cols = config.cols || 3;
      const rows = config.rows || 8;

      const doc = await generateLabelsPdf(items, {
        title: "Etiquetas - Countifly",
        cols,
        rows,
        marginMm: 8,
        gapMm: 2,
        barcodeHeightMm: 14,
        showText: true,
      });

      downloadPdf(doc, "etiquetas.pdf");
      setStatus("done");

      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao gerar PDF: ${err?.message}`);
      setStatus("error");
    }
  }

  const isGenerating = status === "generating";
  const isDisabled = items.length === 0 || isGenerating;

  return (
    <Button
      onClick={handleGenerate}
      disabled={isDisabled}
      variant="secondary"
      size="sm"
      className="gap-2 min-w-[140px]"
      title={
        items.length === 0
          ? "Importe uma planilha para habilitar"
          : "Gerar PDF com as configurações atuais"
      }
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : status === "done" ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Baixado!
        </>
      ) : (
        <>
          <Printer className="w-4 h-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
