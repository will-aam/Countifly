"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminImportPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("Aguardando arquivo...");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress("Lendo CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        console.log("Linhas encontradas:", data.length);

        await sendBatches(data);
      },
    });
  };

  const sendBatches = async (allData: any[]) => {
    const BATCH_SIZE = 50; // Envia de 50 em 50 para não dar timeout
    let processed = 0;

    for (let i = 0; i < allData.length; i += BATCH_SIZE) {
      const batch = allData.slice(i, i + BATCH_SIZE);

      // Mapeia os nomes das colunas do seu CSV para o que a API espera
      const formattedBatch = batch.map((row: any) => ({
        codigo_de_barras: row["codigo_de_barras"] || row["codigo"] || row[0],
        descricao: row["descricao"] || row[1],
        categoria: row["categoria"] || row[2],
        subcategoria: row["subcategoria"] || row[3], // Pode estar vazio
        marca: row["marca"] || row[4], // Pode estar vazio
        preco: row["preco"] || row[5], // Pode estar vazio
      }));

      try {
        const res = await fetch("/api/admin/import-catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: formattedBatch }),
        });

        if (!res.ok) throw new Error("Erro no lote " + i);

        processed += batch.length;
        setProgress(`Processando: ${processed} de ${allData.length} itens...`);
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Falha ao enviar lote.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setProgress("CONCLUÍDO! Todos os itens foram importados como FIXO.");
    toast({ title: "Sucesso", description: "Catálogo importado." });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-10">
      <div className="bg-white p-8 rounded shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-blue-800">
          Importador de Catálogo FIXO
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Use esta página para subir o CSV mestre. Os itens entrarão como "FIXO"
          e não serão apagados ao limpar importações.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded p-8 mb-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              <p>{progress}</p>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center">
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <span className="text-sm font-medium">
                Clique para selecionar CSV
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          )}
        </div>

        {!loading && progress.includes("CONCLUÍDO") && (
          <div className="p-4 bg-green-100 text-green-800 rounded">
            {progress}
          </div>
        )}
      </div>
    </div>
  );
}
