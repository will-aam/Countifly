import { prisma } from "@/lib/prisma";
import {
  normalizeSavedCountFileName,
  sanitizeSavedCountCsv,
} from "@/lib/csv-security";

type SavedCountCreateData = Parameters<typeof prisma.contagemSalva.create>[0]["data"];

const isMissingTypeColumn = (error: unknown) => {
  const candidate = error as { code?: string; meta?: { column?: string }; message?: string };
  const mentionsTypeColumn = candidate.meta?.column?.includes("tipo_contagem") ||
    candidate.message?.toLowerCase().includes("tipo_contagem");
  return Boolean(mentionsTypeColumn && (!candidate.code || candidate.code === "P2022" || candidate.code === "P2009"));
};

export async function createSavedCount(data: SavedCountCreateData) {
  const safeData = {
    ...data,
    nome_arquivo: normalizeSavedCountFileName(data.nome_arquivo),
    conteudo_csv: sanitizeSavedCountCsv(data.conteudo_csv),
  };

  try {
    return await prisma.contagemSalva.create({ data: safeData });
  } catch (error) {
    if (!isMissingTypeColumn(error)) throw error;

    // Compatibilidade temporária com bancos ainda sem a migração. O marcador
    // fica somente no banco e é removido na resposta da API e pela migração.
    const { tipo_contagem, nome_arquivo, ...legacyData } = safeData;
    const marker = `[COUNT_TYPE:${String(tipo_contagem || "legacy")}]`;
    return prisma.contagemSalva.create({
      data: {
        ...legacyData,
        nome_arquivo: `${marker} ${nome_arquivo}`,
      },
    });
  }
}

export const isMissingSavedCountTypeColumn = isMissingTypeColumn;

export function classifySavedCountType(fileName: string) {
  const marker = fileName.match(/^\[COUNT_TYPE:(import|audit|team|api|legacy)\]/i)?.[1];
  if (marker) return marker.toLowerCase();
  if (/^\[IMP\]/i.test(fileName)) return "import";
  if (/^\[AUD/i.test(fileName)) return "audit";
  if (/_FINAL\.csv$/i.test(fileName)) return "team";
  return "legacy";
}

export function cleanSavedCountFileName(fileName: string) {
  return fileName
    .replace(/^\[COUNT_TYPE:(?:import|audit|team|api|legacy)\]\s*/i, "")
    .replace(/^\[IMP\]\s*/i, "")
    .replace(/^\[AUD[^\]]*\]\s*/i, "")
    .replace(/_FINAL\.csv$/i, ".csv");
}
