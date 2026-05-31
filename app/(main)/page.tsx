// app/(main)/page.tsx
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import postgres from "postgres";
import {
  FileSpreadsheet,
  ScanLine,
  Users,
  Link2,
  AlertCircle,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MobileCarousel } from "@/components/inventory/mobile-carousel";
import { HistoryChart } from "@/components/dashboard/history-chart";

export const dynamic = "force-dynamic";

async function getGlobalCatalogCount() {
  try {
    if (!process.env.CATALOG_DB_URL) return 0;
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result = await sql`SELECT COUNT(*)::int FROM produtos_globais`;
    await sql.end();
    return result[0].count || 0;
  } catch (error) {
    return 0;
  }
}

export default async function DashboardPrincipalPage() {
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) return null;

  const [
    user,
    localCatalogCount,
    activeSession,
    globalCatalogCount,
    produtosSemEan,
    historicoSalvo,
  ] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        tipo: true,
        modulo_livre: true,
        modulo_sala: true,
        modulo_empresa: true,
      },
    }),
    prisma.produto.count({
      where: { usuario_id: userId, tipo_cadastro: "FIXO" },
    }),
    prisma.sessao.findFirst({
      where: { anfitriao_id: userId, status: "ABERTA" },
    }),
    getGlobalCatalogCount(),
    prisma.produto.count({
      where: {
        usuario_id: userId,
        tipo_cadastro: "FIXO",
        codigos_barras: {
          none: {},
        },
      },
    }),
    prisma.contagemSalva.findMany({
      where: { usuario_id: userId },
      select: { created_at: true },
    }),
  ]);

  const isAdmin = user?.tipo === "ADMIN";

  const perms = {
    importacao: true,
    livre: isAdmin || user?.modulo_livre,
    sala: isAdmin || user?.modulo_sala,
    erp: isAdmin || user?.modulo_empresa,
  };

  const cardsData = [
    {
      id: "IMPORTACAO",
      title: "Catálogo Local",
      value: localCatalogCount.toLocaleString("pt-BR"),
      subtitle: "SKUs sincronizados",
      icon: FileSpreadsheet,
      isBlocked: !perms.importacao,
      blockedText: "Módulo base.",
    },
    {
      id: "LIVRE",
      title: "Contagem Livre",
      value: globalCatalogCount.toLocaleString("pt-BR"),
      subtitle: "Itens na base global",
      icon: ScanLine,
      isBlocked: !perms.livre,
      blockedText: "Requer plano PRO para uso.",
    },
    {
      id: "SALA",
      title: "Gestão de Sala",
      value: activeSession ? activeSession.nome : "Inativo",
      subtitle: activeSession
        ? `Cód: ${activeSession.codigo_acesso}`
        : "Nenhuma sessão",
      icon: Users,
      isBlocked: !perms.sala,
      blockedText: "Requer plano Team.",
      isLive: !!activeSession,
      showArrow: true,
    },
    {
      id: "ERP",
      title: "ERP Connect",
      value: "Bling",
      subtitle: "Em desenvolvimento",
      icon: Link2,
      isBlocked: !perms.erp,
      blockedText: "Requer plano Enterprise.",
    },
    {
      id: "T5",
      title: "Acurácia",
      value: produtosSemEan > 0 ? produtosSemEan.toString() : "100%",
      subtitle:
        produtosSemEan > 0 ? "SKUs sem cód. de barras" : "Catálogo impecável",
      icon: AlertCircle,
      isBlocked: false,
    },
  ];

  // =========================================================================
  // LÓGICA DO GRÁFICO: O ano todo (Janeiro a Dezembro)
  // =========================================================================
  const anoAtual = new Date().getFullYear();

  const mesesDoAno = Array.from({ length: 12 }).map((_, i) => {
    // Cria uma data para o dia 1 de cada mês do ano atual
    const d = new Date(anoAtual, i, 1);
    return {
      month: i,
      year: anoAtual,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      count: 0,
    };
  });

  historicoSalvo.forEach((item) => {
    const d = new Date(item.created_at);
    const match = mesesDoAno.find(
      (m) => m.month === d.getMonth() && m.year === d.getFullYear(),
    );
    if (match) {
      match.count += 1;
    }
  });

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="block xl:hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <MobileCarousel>
            {cardsData.map((card) => (
              <MetricCard key={`mobile-${card.id}`} {...card} />
            ))}
          </MobileCarousel>
        </div>

        <div className="hidden xl:grid xl:grid-cols-5 gap-4">
          {cardsData.map((card) => (
            <MetricCard key={`desktop-${card.id}`} {...card} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HistoryChart data={mesesDoAno} className="col-span-1 lg:col-span-2" />
      </section>
    </div>
  );
}
