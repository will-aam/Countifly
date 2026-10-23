import type { ProductCount } from "@/lib/types";
import type { AuditConfig } from "@/lib/audit";
import { getAuditProfileLabel } from "@/lib/audit";

const formatQuantity = (value: number) => String(value).replace(".", ",");
const formatPrice = (value: number) => value.toFixed(2).replace(".", ",");

export const buildAuditReportRows = (
  productCounts: ProductCount[],
  config: AuditConfig,
  clientName: string,
) =>
  [...productCounts]
    .sort((a, b) => (a.descricao || "").localeCompare(b.descricao || ""))
    .map((item) => {
      const row: Record<string, string> = {
        Cliente: clientName || "",
        Perfil: getAuditProfileLabel(config.profile),
        "EAN/Código": item.codigo_de_barras || item.codigo_produto || "",
        Descrição: item.descricao || "",
        Categoria: item.categoria || "",
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

