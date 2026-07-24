import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { ParsedItem } from "@/lib/file-parser";

function basenameWithoutExt(filename: string) {
  const name = String(filename || "");
  const lastDot = name.lastIndexOf(".");
  return (lastDot >= 0 ? name.slice(0, lastDot) : name).trim();
}

interface ImageBatchUploadProps {
  items: ParsedItem[];
  onItemsUpdate: (items: ParsedItem[]) => void;
}

export function ImageBatchUpload({
  items = [],
  onItemsUpdate,
}: ImageBatchUploadProps) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState({ matched: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!Array.isArray(items) || items.length === 0) {
      setStatus("error");
      setErrorMsg("Importe a planilha antes de enviar imagens.");
      return;
    }

    setStatus("working");
    setErrorMsg("");
    setResult({ matched: 0, total: files.length });

    const indexByCodigo = new Map<string, number>();
    items.forEach((it, idx) => {
      const code = String(it.codigo || "").trim();
      if (code) indexByCodigo.set(code, idx);
    });

    let matched = 0;
    const nextItems = [...items];

    for (const file of files) {
      const codeFromFilename = basenameWithoutExt(file.name);

      let idx = indexByCodigo.get(codeFromFilename);

      if (idx === undefined) {
        const cleanName = codeFromFilename.trim();
        idx = indexByCodigo.get(cleanName);
      }

      if (idx === undefined) continue;

      try {
        const dataUrl = await fileToDataUrl(file);
        nextItems[idx] = { ...nextItems[idx], imagem: dataUrl };
        matched++;
      } catch (err) {
        console.error(`Erro ao processar imagem ${file.name}:`, err);
      }
    }

    onItemsUpdate?.(nextItems);
    setResult({ matched, total: files.length });
    setStatus("done");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Upload Local (Arquivos)</h3>
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: <strong>JPG, PNG, WEBP, AVIF, HEIC/HEIF</strong>.
          <br />O nome do arquivo deve ser igual ao código do item (ex:{" "}
          <code className="bg-muted px-1 rounded">78910.heic</code>).
        </p>
      </div>

      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer text-center">
        <UploadCloud className="w-8 h-8 text-muted-foreground mb-3" />
        <span className="text-sm font-medium text-primary">
          Selecione as imagens
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          Você pode selecionar várias de uma vez
        </span>
        <input
          type="file"
          accept="image/*,.heic,.heif,.webp,.avif"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {status === "working" && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-md text-sm border border-orange-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processando imagens (convertendo HEIC se necessário)...</span>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            Processo concluído: <strong>{result.matched}</strong> imagens
            associadas de {result.total} enviadas.
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
