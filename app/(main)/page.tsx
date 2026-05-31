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
  Lock,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MobileCarousel } from "@/components/inventory/mobile-carousel";
import { HistoryChart } from "@/components/dashboard/history-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { CompanyChart } from "@/components/dashboard/company-chart";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";

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

async function getGlobalCategories() {
  try {
    if (!process.env.CATALOG_DB_URL) return [];
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result = await sql`
      SELECT categoria as name, COUNT(*)::int as count 
      FROM produtos_globais 
      WHERE categoria IS NOT NULL AND categoria != ''
      GROUP BY categoria 
      ORDER BY count DESC
    `;
    await sql.end();
    return result as unknown as { name: string; count: number }[];
  } catch (error) {
    return [];
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
    categoriasGlobais,
    empresasCadastradas, // Nova busca para Lojas
    movimentosSessoes, // Nova busca para Produtividade
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
        codigos_barras: { none: {} },
      },
    }),
    prisma.contagemSalva.findMany({
      where: { usuario_id: userId },
      select: { created_at: true },
    }),
    getGlobalCategories(),

    // Busca as empresas do usuário e já traz a contagem de arquivos salvos associados a elas
    prisma.empresa.findMany({
      where: { usuario_id: userId, ativo: true },
      select: {
        nome_fantasia: true,
        _count: { select: { contagens_salvas: true } },
      },
    }),

    // Puxa as horas em que houveram bipagens nas sessões abertas pelo usuário
    prisma.movimento.findMany({
      where: { sessao: { anfitriao_id: userId } },
      select: { data_hora: true },
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

  // Agrupamento Histórico (Anual)
  const anoAtual = new Date().getFullYear();
  const mesesDoAno = Array.from({ length: 12 }).map((_, i) => {
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
    if (match) match.count += 1;
  });

  // Formatação Empresas
  const dadosEmpresas = empresasCadastradas.map((empresa) => ({
    name: empresa.nome_fantasia,
    count: empresa._count.contagens_salvas,
  }));

  // Agrupamento Produtividade por Hora (0h a 23h)
  const horasDoDia = Array.from({ length: 24 }).map((_, i) => ({
    hour: `${i}h`,
    count: 0,
  }));
  movimentosSessoes.forEach((mov) => {
    const hour = new Date(mov.data_hora).getHours();
    horasDoDia[hour].count += 1;
  });

  return (
    <div className="space-y-8">
      {/* SEÇÃO 1: CARDS */}
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

      {/* SEÇÃO 2: HISTÓRICO E CATEGORIAS (Grid principal) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HistoryChart data={mesesDoAno} className="col-span-1 lg:col-span-2" />

        {/* Usamos a mesma lógica nos painéis! Passamos as props isBlocked caso não tenha o módulo livre */}
        <div className="col-span-1 relative h-full">
          {!perms.livre && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-950/50 backdrop-blur-[4px] rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-full shadow-lg mb-3">
                <Lock className="w-6 h-6 text-zinc-400" />
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                Módulo Restrito
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 px-6 text-center">
                Requer plano PRO.
              </span>
            </div>
          )}
          <CategoryChart data={categoriasGlobais} />
        </div>
      </section>

      {/* SEÇÃO 3: BLOCOS NOVOS (Lado a Lado) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityChart
          data={horasDoDia}
          isBlocked={!perms.sala}
          blockedText="Requer o módulo Gestão de Sala ativo no plano Team para visualizar picos de bipagem da equipe."
        />
        <CompanyChart
          data={dadosEmpresas}
          isBlocked={!perms.erp}
          blockedText="Requer o módulo Empresas no plano Enterprise para gerenciar filiais múltiplas."
        />
      </section>
    </div>
  );
}
