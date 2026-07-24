import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedItem {
  codigo: string;
  nome: string;
  imagem?: string;
}

function normalizeString(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function mapRowToItem(row: any): ParsedItem {
  const entries = Object.entries(row || {});
  const normMap = new Map<string, any>();

  for (const [k, v] of entries) {
    const nk = String(k ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    normMap.set(nk, v);
  }

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const nk = String(key)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normMap.has(nk)) return normMap.get(nk);
    }
    return undefined;
  };

  const codigo = normalizeString(
    pick(
      "codigo",
      "código",
      "cod",
      "codigo de barras",
      "codigo barras",
      "barcode",
      "gtin",
      "ean",
    ),
  );

  const nome = normalizeString(
    pick(
      "nome",
      "nome do produto",
      "produto",
      "descricao",
      "descrição",
      "descricao do produto",
      "descrição do produto",
      "item",
      "titulo",
      "título",
    ),
  );

  const imagem = normalizeString(
    pick(
      "imagem",
      "image",
      "img",
      "foto",
      "foto url",
      "imagem url",
      "url imagem",
      "url da imagem",
      "link imagem",
      "link da imagem",
    ),
  );

  return { codigo, nome, imagem };
}

export async function parseFile(file: File): Promise<ParsedItem[]> {
  if (!file) throw new Error("Nenhum arquivo foi enviado.");

  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".csv")) return await parseCsv(file);
  if (name.endsWith(".xlsx")) return await parseXlsx(file);

  throw new Error("Formato não suportado. Envie um arquivo .csv ou .xlsx");
}

function parseCsv(file: File): Promise<ParsedItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h || "").trim(),
      complete: (results) => {
        if (results.errors?.length) {
          reject(
            new Error(
              `Erro ao ler CSV: ${results.errors[0]?.message || "erro desconhecido"}`,
            ),
          );
          return;
        }

        const data = Array.isArray(results.data) ? results.data : [];
        const items = data
          .map(mapRowToItem)
          .filter((x) => x.codigo && x.codigo.length > 0);
        resolve(items);
      },
      error: (err: any) =>
        reject(new Error(`Erro ao ler CSV: ${err?.message || err}`)),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const items = rows
    .map(mapRowToItem)
    .filter((x) => x.codigo && x.codigo.length > 0);
  return items;
}
