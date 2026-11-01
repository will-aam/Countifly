import type { ProductCount } from "@/lib/types";
import type { Product } from "@/lib/types";
import type { AuditConfig } from "@/lib/audit";
import { getAuditProfileLabel } from "@/lib/audit";
import { areBarcodesEqual } from "@/lib/utils";

const formatQuantity = (value: number) => String(value).replace(".", ",");
const formatPrice = (value: number) => value.toFixed(2).replace(".", ",");

export const mergeOfflineBaseWithCounts = (
  offlineBase: Array<{ barcode: string; product: Product }>,
  countedItems: ProductCount[],
): ProductCount[] => {
  const matchedCountIds = new Set<number>();
  const baseRows = offlineBase.map(({ barcode, product }, index) => {
    const count = countedItems.find((item) =>
      areBarcodesEqual(item.codigo_de_barras, barcode),
    );
    if (count) matchedCountIds.add(count.id);

    const baseRow: ProductCount = {
      id: -(index + 1),
      codigo_de_barras: barcode,
      codigo_produto: product.codigo_produto || String(product.id),
      descricao: product.descricao || "Produto sem descrição",
      saldo_estoque: 0,
      quant_loja: 0,
      quant_estoque: 0,
      quantity: 0,
      total: 0,
      mode: "audit",
      quantityCaptured: true,
      price: 0,
      priceCaptured: false,
      categoria: product.categoria || "Geral",
      subcategoria: product.subcategoria || "",
      marca: product.marca || "",
    };

    return count
      ? {
          ...baseRow,
          ...count,
          codigo_de_barras: count.codigo_de_barras || barcode,
          codigo_produto: count.codigo_produto || baseRow.codigo_produto,
          descricao: count.descricao || baseRow.descricao,
          categoria: count.categoria || baseRow.categoria,
          subcategoria: count.subcategoria || baseRow.subcategoria,
          marca: count.marca || baseRow.marca,
        }
      : baseRow;
  });

  return [
    ...baseRows,
    ...countedItems.filter((item) => !matchedCountIds.has(item.id)),
  ];
};

export const buildAuditReportRows = (
  productCounts: ProductCount[],
  config: AuditConfig,
) =>
  [...productCounts]
    .sort((a, b) => (a.descricao || "").localeCompare(b.descricao || ""))
    .map((item) => {
      const row: Record<string, string> = {
        Perfil: getAuditProfileLabel(config.profile),
        "EAN/Código": item.codigo_de_barras || item.codigo_produto || "",
        Descrição: item.descricao || "",
        Categoria: item.categoria || "",
        Subcategoria: item.subcategoria || "",
        Marca: item.marca || "",
      };

      const quantity =
        Number(item.quant_loja || 0) +
        Number(item.quant_estoque || 0) +
        Number(item.quantity || 0);

      if (config.collectQuantity) {
        if (config.quantityLayout === "split") {
          row.Loja = formatQuantity(Number(item.quant_loja || 0));
          row.Estoque = formatQuantity(Number(item.quant_estoque || 0));
        }
        row.Quantidade = formatQuantity(quantity);
      }

      if (config.collectPrice) {
        const hasPrice = item.priceCaptured ?? Number(item.price || 0) > 0;
        row["Preço Unit."] = hasPrice ? formatPrice(Number(item.price || 0)) : "";
        row["Status do Preço"] = hasPrice ? "Coletado" : "Pendente";
        if (config.collectQuantity) {
          row["Valor Total"] = hasPrice
            ? formatPrice(Number(item.price || 0) * quantity)
            : "";
        }
      }

      return row;
    });

