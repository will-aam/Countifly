// lib/dashboard-counted-categories.ts
import * as Papa from "papaparse";

export interface CountedItemData {
  year: number;
  month: number; // 1 to 12
  categoria: string;
  subcategoria: string;
  quantidade: number;
}

export function extractCountedCategoryData(
  savedCounts: Array<{ created_at: Date | string; conteudo_csv: string }>
): CountedItemData[] {
  const result: CountedItemData[] = [];

  for (const count of savedCounts) {
    if (!count.conteudo_csv) continue;
    const d = new Date(count.created_at);
    if (isNaN(d.getTime())) continue;

    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    try {
      const cleanCsv = count.conteudo_csv.replace(/^#[^\r\n]*(?:\r\n|\r|\n)?/gm, "");
      const parsed = Papa.parse<Record<string, string>>(cleanCsv, {
        header: true,
        skipEmptyLines: "greedy",
        comments: "#",
      });

      const normalizeHeader = (header: string) =>
        header.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      for (const row of parsed.data) {
        const values = new Map(
          Object.entries(row).map(([header, value]) => [normalizeHeader(header), value])
        );

        const get = (...headers: string[]) => {
          for (const header of headers) {
            const value = values.get(normalizeHeader(header));
            if (value != null && String(value).trim() !== "") return String(value).trim();
          }
          return "";
        };

        const rawCat = get("categoria", "category");
        const rawSubcat = get("subcategoria", "subcategory");

        const cat = rawCat ? rawCat.trim() : "Não Informado";
        const subcat = rawSubcat ? rawSubcat.trim() : "Não Informado";

        // Quantidade contada
        const explicitTotal = get("quantidade", "quantidade total", "quantidade_total", "qtd total", "total contado", "total");
        const storeQty = parseFloat(get("loja", "quant_loja", "quantidade loja").replace(",", ".")) || 0;
        const stockQty = parseFloat(get("estoque", "quant_estoque", "deposito", "depósito").replace(",", ".")) || 0;
        
        let total = 0;
        if (explicitTotal) {
          total = parseFloat(explicitTotal.replace(",", ".")) || 0;
        } else if (storeQty > 0 || stockQty > 0) {
          total = storeQty + stockQty;
        } else {
          total = 1;
        }

        if (total > 0) {
          result.push({
            year,
            month,
            categoria: cat,
            subcategoria: subcat,
            quantidade: total,
          });
        }
      }
    } catch {
      // Ignora falhas em registros individuais corrompidos
    }
  }

  return result;
}
