import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

function parseMoney(val: any): number {
  if (!val) return 0;
  let clean = String(val).replace("R$", "").trim();
  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

const normalizeHeader = (header: string) =>
  header.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Sincroniza silenciosamente o catálogo de produtos e os preços históricos de uma empresa
 * a partir de uma contagem salva no sistema.
 * É executada exclusivamente quando o usuário clica em "Salvar Contagem".
 */
export async function syncCompanyCatalogFromCsv(
  empresaId: number,
  csvContent: string,
  contagemId?: number
) {
  try {
    const cleanCsv = csvContent.replace(/^#[^\r\n]*(?:\r\n|\r|\n)?/gm, "");
    const parsed = Papa.parse<Record<string, string>>(cleanCsv, {
      header: true,
      skipEmptyLines: "greedy",
      comments: "#",
      delimitersToGuess: [";", ",", "\t", "|"],
    });

    if (!parsed.data || parsed.data.length === 0) return;

    // Mapa para consolidar os itens por código de barras dentro do mesmo CSV
    const itemsMap = new Map<string, {
      barcode: string;
      code?: string;
      desc: string;
      ncm?: string;
      category?: string;
      price: number;
    }>();

    for (const row of parsed.data) {
      const values = new Map(
        Object.entries(row).map(([header, value]) => [normalizeHeader(header), String(value || "").trim()])
      );

      const get = (...headers: string[]) => {
        for (const h of headers) {
          const val = values.get(normalizeHeader(h));
          if (val) return val;
        }
        return "";
      };

      const barcode = get("ean/codigo", "codigo de barras", "codigo_de_barras", "código de barras", "ean", "barcode");
      const code = get("codigo do produto", "codigo_produto", "código produto", "codigo interno", "sku", "referencia");
      const desc = get("descricao", "descrição", "description", "produto", "nome");
      const ncm = get("ncm", "codigo ncm", "codigo_ncm", "código ncm", "classificacao fiscal", "classificacao_fiscal");
      const category = get("categoria", "category") || "Geral";
      const priceRaw = get("preco", "preco unitario", "preço", "custo", "custo unitario", "custo unitário", "valor unitario");
      const price = parseMoney(priceRaw);

      const key = barcode || code;
      if (!key || !desc) continue;

      const existing = itemsMap.get(key);
      if (!existing || (price > 0 && existing.price === 0)) {
        itemsMap.set(key, {
          barcode: key,
          code: code || undefined,
          desc: desc.slice(0, 255),
          ncm: ncm ? ncm.slice(0, 20) : undefined,
          category: category.slice(0, 100),
          price,
        });
      }
    }

    const now = new Date();

    // Atualiza cada produto na tabela empresa_produtos e registra histórico de preço
    for (const item of itemsMap.values()) {
      try {
        const existingProd = await prisma.empresaProduto.findUnique({
          where: {
            empresa_id_codigo_barras: {
              empresa_id: empresaId,
              codigo_barras: item.barcode,
            },
          },
          select: { id: true, ultimo_preco: true },
        });

        let empresaProdutoId: number;

        if (existingProd) {
          empresaProdutoId = existingProd.id;
          const updateData: any = {
            descricao: item.desc,
            data_ultimo_inventario: now,
          };
          if (item.code) updateData.codigo_produto = item.code;
          if (item.ncm) updateData.ncm = item.ncm;
          if (item.category) updateData.categoria = item.category;

          if (item.price > 0) {
            updateData.ultimo_preco = item.price;
          }

          await prisma.empresaProduto.update({
            where: { id: existingProd.id },
            data: updateData,
          });

          // Se o preço for positivo e diferente do anterior, grava histórico
          const prevPrice = existingProd.ultimo_preco ? Number(existingProd.ultimo_preco) : 0;
          if (item.price > 0 && Math.abs(prevPrice - item.price) > 0.005) {
            await prisma.historicoPrecoEmpresa.create({
              data: {
                empresa_produto_id: existingProd.id,
                preco: item.price,
                contagem_id: contagemId || null,
                data_registro: now,
              },
            });
          }
        } else {
          // Cria novo produto no catálogo do cliente
          const created = await prisma.empresaProduto.create({
            data: {
              empresa_id: empresaId,
              codigo_barras: item.barcode,
              codigo_produto: item.code || null,
              descricao: item.desc,
              ncm: item.ncm || null,
              categoria: item.category || "Geral",
              ultimo_preco: item.price > 0 ? item.price : null,
              data_ultimo_inventario: now,
            },
          });
          empresaProdutoId = created.id;

          if (item.price > 0) {
            await prisma.historicoPrecoEmpresa.create({
              data: {
                empresa_produto_id: empresaProdutoId,
                preco: item.price,
                contagem_id: contagemId || null,
                data_registro: now,
              },
            });
          }
        }
      } catch (itemErr) {
        console.error(`Erro ao sincronizar produto ${item.barcode} da empresa ${empresaId}:`, itemErr);
      }
    }
  } catch (err) {
    console.error(`Erro ao sincronizar catálogo da empresa ${empresaId}:`, err);
  }
}

/**
 * Consulta o produto no catálogo histórico da empresa pelo código de barras.
 * Permite auto-preencher o último preço praticado naquele cliente.
 */
export async function getCompanyProductByBarcode(empresaId: number, barcode: string) {
  try {
    return await prisma.empresaProduto.findUnique({
      where: {
        empresa_id_codigo_barras: {
          empresa_id: empresaId,
          codigo_barras: barcode,
        },
      },
      include: {
        historico_precos: {
          orderBy: { data_registro: "desc" },
          take: 5,
        },
      },
    });
  } catch {
    return null;
  }
}
