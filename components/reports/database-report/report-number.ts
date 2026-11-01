import type { ProductCount } from "@/lib/types";

export const parseReportNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null || value === "") return 0;
  let normalized = String(value).trim().replace(/R\$/gi, "").trim();
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getReportCountedQuantity = (item: ProductCount): number => {
  const total = parseReportNumber(item.total);
  if (total !== 0) return total;

  const quantity = parseReportNumber(item.quantity);
  if (quantity !== 0) return quantity;

  return parseReportNumber(item.quant_loja) + parseReportNumber(item.quant_estoque);
};
