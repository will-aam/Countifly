import * as Papa from "papaparse";

export const MAX_SAVED_COUNT_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_SAVED_COUNT_CSV_LINES = 50_000;

export class SavedCountValidationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413,
  ) {
    super(message);
    this.name = "SavedCountValidationError";
  }
}

export function normalizeSavedCountFileName(value: string) {
  const safeName = String(value || "")
    .normalize("NFKC")
    .replace(/[\\/]+/g, "_")
    .replace(/[<>:\"|?*]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  const baseName = safeName
    .replace(/\.csv$/i, "")
    .replace(/\.[^.]*$/, "")
    .slice(0, 155)
    .replace(/[. ]+$/g, "");

  return `${baseName || "contagem"}.csv`;
}

function sanitizeCsvCell(value: string) {
  return /^[\s\u0000-\u001f\u007f\ufeff]*[=+@-]/u.test(value)
    ? `'${value}`
    : value;
}

export function sanitizeSavedCountCsv(csvContent: string) {
  if (typeof csvContent !== "string" || csvContent.trim() === "") {
    throw new SavedCountValidationError("O CSV está vazio ou inválido.", 400);
  }

  const hasBom = csvContent.charCodeAt(0) === 0xfeff;
  const csvWithoutBom = hasBom ? csvContent.slice(1) : csvContent;
  const byteLength = new TextEncoder().encode(csvContent).byteLength;
  const lineCount = (csvWithoutBom.match(/\r\n|\r|\n/g)?.length || 0) + 1;

  if (byteLength > MAX_SAVED_COUNT_CSV_BYTES) {
    throw new SavedCountValidationError("O CSV excede o limite de 5 MB.", 413);
  }
  if (lineCount > MAX_SAVED_COUNT_CSV_LINES) {
    throw new SavedCountValidationError("O CSV excede o limite de 50 mil linhas.", 413);
  }

  const parsed = Papa.parse<string[]>(csvWithoutBom, {
    header: false,
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ",", "\t", "|"],
  });

  if (parsed.errors.length > 0 || parsed.data.length === 0) {
    throw new SavedCountValidationError("O conteúdo enviado não é um CSV válido.", 400);
  }

  const safeRows = parsed.data.map((row) => row.map(sanitizeCsvCell));
  const safeCsv = Papa.unparse(safeRows, {
    delimiter: parsed.meta.delimiter || ";",
    quotes: true,
  });
  const normalizedCsv = `${hasBom ? "\ufeff" : ""}${safeCsv}`;

  if (new TextEncoder().encode(normalizedCsv).byteLength > MAX_SAVED_COUNT_CSV_BYTES) {
    throw new SavedCountValidationError("O CSV excede o limite de 5 MB após a normalização.", 413);
  }

  return normalizedCsv;
}
