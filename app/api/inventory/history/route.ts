// app/api/inventory/history/route.ts
// Rota de API para gerenciar o histórico de contagens salvas do usuário.
// Responsabilidades:
// 1. GET: Retornar a lista de contagens salvas do usuário, com suporte a paginação.
// 2. POST: Salvar uma nova contagem (recebendo o arquivo CSV e metadados via form-data).

import { NextResponse, NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import {
  classifySavedCountType,
  cleanSavedCountFileName,
  createSavedCount,
  isMissingSavedCountTypeColumn,
} from "@/lib/saved-counts";
import {
  MAX_SAVED_COUNT_CSV_BYTES,
  SavedCountValidationError,
  normalizeSavedCountFileName,
  sanitizeSavedCountCsv,
} from "@/lib/csv-security";

export const dynamic = "force-dynamic";

const MAX_MULTIPART_BYTES = MAX_SAVED_COUNT_CSV_BYTES + 128 * 1024;

class HistoryUploadError extends Error {
  constructor(message: string, public readonly status: 400 | 413 | 415) {
    super(message);
  }
}

async function parseBoundedFormData(request: NextRequest, contentType: string) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
      throw new HistoryUploadError("Tamanho da requisição inválido.", 400);
    }
    if (declaredBytes > MAX_MULTIPART_BYTES) {
      throw new HistoryUploadError("O envio excede o limite permitido.", 413);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) throw new HistoryUploadError("Envio sem conteúdo.", 400);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_MULTIPART_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new HistoryUploadError("O envio excede o limite permitido.", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return await new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }).formData();
  } catch {
    throw new HistoryUploadError("Formulário de envio inválido.", 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Identificar Usuário pelo Token
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Paginação
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const skip = (page - 1) * limit;
    const companyIdParam = searchParams.get("empresaId");
    const query = searchParams.get("q")?.trim();
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy");
    const kind = searchParams.get("tipo");
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: any = { usuario_id: userId };
    if (["import", "audit", "team", "api"].includes(kind || "")) {
      where.tipo_contagem = kind;
    }
    if (companyIdParam === "none") where.empresa_id = null;
    else if (companyIdParam && /^\d+$/.test(companyIdParam)) {
      where.empresa_id = Number(companyIdParam);
    }
    if (query) where.nome_arquivo = { contains: query, mode: "insensitive" };
    if (dateFromParam || dateToParam) {
      where.created_at = {};
      if (dateFromParam) {
        const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(dateFromParam)
          ? new Date(`${dateFromParam}T00:00:00.000Z`)
          : new Date(dateFromParam);
        if (!Number.isNaN(dateFrom.getTime())) where.created_at.gte = dateFrom;
      }
      if (dateToParam) {
        const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(dateToParam)
          ? new Date(`${dateToParam}T23:59:59.999Z`)
          : new Date(dateToParam);
        if (!Number.isNaN(dateTo.getTime())) {
          where.created_at.lte = dateTo;
        }
      }
      if (!Object.keys(where.created_at).length) delete where.created_at;
    }

    const orderBy: Prisma.ContagemSalvaOrderByWithRelationInput | Prisma.ContagemSalvaOrderByWithRelationInput[] = sortBy === "name"
      ? { nome_arquivo: sortOrder }
      : sortBy === "company"
        ? [{ empresa: { nome_fantasia: sortOrder } }, { created_at: "desc" as const }]
        : { created_at: sortOrder };

    // 3. Busca Otimizada (SEM o conteúdo CSV pesado na listagem)
    let savedCounts: any[];
    let total: number;
    try {
      [savedCounts, total] = await Promise.all([
        prisma.contagemSalva.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            nome_arquivo: true,
            created_at: true,
            usuario_id: true,
            empresa_id: true,
            tipo_contagem: true,
          },
        }),
        prisma.contagemSalva.count({ where }),
      ]);
    } catch (error) {
      if (!isMissingSavedCountTypeColumn(error)) throw error;

      const legacyWhere: any = { ...where };
      delete legacyWhere.tipo_contagem;
      const typeNameFilter = kind === "import"
        ? { OR: [
            { nome_arquivo: { startsWith: "[COUNT_TYPE:import]", mode: "insensitive" } },
            { nome_arquivo: { startsWith: "[IMP]", mode: "insensitive" } },
          ] }
        : kind === "audit"
          ? { OR: [
              { nome_arquivo: { startsWith: "[COUNT_TYPE:audit]", mode: "insensitive" } },
              { nome_arquivo: { startsWith: "[AUD", mode: "insensitive" } },
            ] }
          : kind === "team"
            ? { OR: [
                { nome_arquivo: { startsWith: "[COUNT_TYPE:team]", mode: "insensitive" } },
                { nome_arquivo: { endsWith: "_FINAL.csv", mode: "insensitive" } },
              ] }
            : kind === "api"
              ? { nome_arquivo: { startsWith: "[COUNT_TYPE:api]", mode: "insensitive" } }
              : null;
      if (typeNameFilter) {
        const conditions = [typeNameFilter];
        if (legacyWhere.nome_arquivo) {
          conditions.push({ nome_arquivo: legacyWhere.nome_arquivo });
          delete legacyWhere.nome_arquivo;
        }
        legacyWhere.AND = conditions;
      }

      const [legacyCounts, legacyTotal] = await Promise.all([
        prisma.contagemSalva.findMany({
          where: legacyWhere,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            nome_arquivo: true,
            created_at: true,
            usuario_id: true,
            empresa_id: true,
          },
        }),
        prisma.contagemSalva.count({ where: legacyWhere }),
      ]);
      savedCounts = legacyCounts.map((item) => ({
        ...item,
        tipo_contagem: classifySavedCountType(item.nome_arquivo),
        nome_arquivo: normalizeSavedCountFileName(
          cleanSavedCountFileName(item.nome_arquivo),
        ),
      }));
      total = legacyTotal;
    }

    return NextResponse.json({
      data: savedCounts.map((item) => ({
        ...item,
        nome_arquivo: normalizeSavedCountFileName(item.nome_arquivo),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Identificar Usuário
    const payload = await getAuthPayload();
    const userId = payload.userId;

    // 2. Aceitar somente multipart/form-data limitado e um arquivo CSV real.
    const contentType = request.headers.get("content-type") || "";
    if (!/^multipart\/form-data\s*;\s*boundary=/i.test(contentType)) {
      return NextResponse.json(
        { error: "Envie o histórico como arquivo CSV multipart." },
        { status: 415 },
      );
    }

    let formData: FormData;
    try {
      formData = await parseBoundedFormData(request, contentType);
    } catch (error) {
      if (error instanceof HistoryUploadError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const fileNameValue = formData.get("fileName");
    const csvFileValue = formData.get("csvFile");
    const empresaIdValue = formData.get("empresa_id");
    const tipoContagemValue = formData.get("tipo_contagem");

    if (
      typeof fileNameValue !== "string" ||
      !fileNameValue.trim() ||
      typeof tipoContagemValue !== "string" ||
      !["import", "audit", "team", "api"].includes(tipoContagemValue)
    ) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    if (!csvFileValue || typeof csvFileValue === "string") {
      return NextResponse.json({ error: "Envie um arquivo CSV." }, { status: 400 });
    }
    const csvFile = csvFileValue;
    if (csvFile.type.toLowerCase().split(";")[0].trim() !== "text/csv") {
      return NextResponse.json(
        { error: "O tipo do arquivo deve ser text/csv." },
        { status: 415 },
      );
    }
    if (csvFile.size === 0) {
      return NextResponse.json({ error: "O arquivo CSV está vazio." }, { status: 400 });
    }
    if (csvFile.size > MAX_SAVED_COUNT_CSV_BYTES) {
      return NextResponse.json({ error: "O CSV excede o limite de 5 MB." }, { status: 413 });
    }
    if (!csvFile.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "O arquivo enviado precisa ter extensão .csv." }, { status: 400 });
    }

    let csvContent: string;
    try {
      csvContent = new TextDecoder("utf-8", { fatal: true }).decode(
        await csvFile.arrayBuffer(),
      );
    } catch {
      return NextResponse.json({ error: "O CSV precisa estar codificado em UTF-8." }, { status: 400 });
    }

    let safeCsvContent: string;
    try {
      safeCsvContent = sanitizeSavedCountCsv(csvContent);
    } catch (error) {
      if (error instanceof SavedCountValidationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const fileName = normalizeSavedCountFileName(fileNameValue);
    const tipoContagem = tipoContagemValue;
    const empresaIdStr = typeof empresaIdValue === "string" ? empresaIdValue : null;

    // ✅ NOVO: Validar empresa (se fornecida)
    let empresaId: number | null = null;
    if (empresaIdStr) {
      if (!/^\d+$/.test(empresaIdStr)) {
        return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
      }
      empresaId = Number(empresaIdStr);
      if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
        return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
      }

      // Verificar se a empresa pertence ao usuário e está ativa
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { usuario_id: true, ativo: true },
      });

      if (!empresa || empresa.usuario_id !== userId || !empresa.ativo) {
        return NextResponse.json(
          { error: "Empresa inválida ou não pertence ao usuário." },
          { status: 400 },
        );
      }
    }

    // 3. Salvar no Banco (Tabela Legado de Histórico)
    const newSavedCount = await createSavedCount({
      nome_arquivo: fileName,
      conteudo_csv: safeCsvContent,
      usuario_id: userId,
      empresa_id: empresaId,
      tipo_contagem: tipoContagem!,
    });

    return NextResponse.json(newSavedCount, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
