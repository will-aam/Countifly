// app/(private)/dashboard/page.tsx
import { prisma } from "@/lib/prisma";
import { getAuthPayload } from "@/lib/auth";
import postgres from "postgres";
import { Lock } from "lucide-react";
import {
  HistoryChart,
  CountedCategoriesChart,
  CompanyChart,
  ProductivityChart,
  SessionAlertBar,
  GlobalCatalogInfoCard,
  InventoryPlannerCard,
  MobileDashboard,
  type MobileHistoryEntry,
} from "./components";
import { extractCountedCategoryData } from "@/lib/dashboard-counted-categories";
import { classifySavedCountType } from "@/lib/saved-counts";

export const dynamic = "force-dynamic";

// ─── Global DB helpers ────────────────────────────────────────────────────────

async function getGlobalCatalogCount() {
  try {
    if (!process.env.CATALOG_DB_URL) return 0;
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result = await sql`SELECT COUNT(*)::int FROM produtos_globais`;
    await sql.end();
    return result[0].count || 0;
  } catch {
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
  } catch {
    return [];
  }
}

async function getGlobalSubcategoryCount(): Promise<number> {
  try {
    if (!process.env.CATALOG_DB_URL) return 0;
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result =
      await sql`SELECT COUNT(DISTINCT subcategoria)::int as count FROM produtos_globais WHERE subcategoria IS NOT NULL AND subcategoria != ''`;
    await sql.end();
    return result[0]?.count || 0;
  } catch {
    return 0;
  }
}

async function getGlobalSubcategoryNames(): Promise<string[]> {
  try {
    if (!process.env.CATALOG_DB_URL) return [];
    const sql = postgres(process.env.CATALOG_DB_URL, { ssl: "require" });
    const result =
      await sql`SELECT DISTINCT subcategoria FROM produtos_globais WHERE subcategoria IS NOT NULL AND subcategoria != '' ORDER BY subcategoria LIMIT 500`;
    await sql.end();
    return result.map((r) => r.subcategoria as string);
  } catch {
    return [];
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPrincipalPage() {
  const payload = await getAuthPayload();
  const userId = payload?.userId;

  if (!userId) return null;

  const [
    user,
    activeSession,
    globalCatalogCount,
    historicoSalvo,
    categoriasGlobais,
    subcategoryCount,
    subcategoryNames,
    empresasCadastradas,
    movimentosSessoes,
  ] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        tipo: true,
        modulo_importacao: true,
        modulo_livre: true,
        modulo_sala: true,
        modulo_empresa: true,
        modulo_modular: true,
        modulo_api: true,
        fixar_planejador: true,
      },
    }),
    prisma.sessao.findFirst({
      where: {
        anfitriao_id: userId,
        status: "ABERTA",
        modo: "MULTIPLAYER",
      },
    }),
    getGlobalCatalogCount(),
    prisma.contagemSalva.findMany({
      where: { usuario_id: userId },
      select: {
        created_at: true,
        conteudo_csv: true,
        tipo_contagem: true,
        nome_arquivo: true,
      },
      orderBy: { created_at: "desc" },
      take: 500,
    }),
    getGlobalCategories(),
    getGlobalSubcategoryCount(),
    getGlobalSubcategoryNames(),
    prisma.empresa.findMany({
      where: { usuario_id: userId, ativo: true },
      select: {
        nome_fantasia: true,
        _count: { select: { contagens_salvas: true } },
      },
    }),
    prisma.movimento.findMany({
      where: { sessao: { anfitriao_id: userId } },
      select: { data_hora: true },
    }),
  ]);

  const isAdmin = user?.tipo === "ADMIN";

  const perms = {
    importacao: isAdmin || user?.modulo_importacao,
    livre: isAdmin || user?.modulo_livre,
    sala: isAdmin || user?.modulo_sala,
    modular: isAdmin || user?.modulo_modular,
    api: isAdmin || user?.modulo_api,
    empresa: isAdmin || user?.modulo_empresa,
  };

  // ── Histórico (gráfico anual) ──
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
      (m) => m.month === d.getMonth() && m.year === d.getFullYear()
    );
    if (match) match.count += 1;
  });

  const rawHistory = historicoSalvo.map((item) => ({
    created_at: item.created_at.toISOString(),
  }));

  const mobileHistory: MobileHistoryEntry[] = historicoSalvo.map((item) => {
    const rawType = (
      item.tipo_contagem && item.tipo_contagem !== "legacy"
        ? item.tipo_contagem
        : classifySavedCountType(item.nome_arquivo)
    ).toLowerCase();

    const bucket: MobileHistoryEntry["bucket"] =
      rawType === "modular" || rawType === "mixed"
        ? "modular"
        : rawType === "audit" || rawType === "team" || rawType === "api"
          ? "other"
          : "erp";

    return {
      created_at: item.created_at.toISOString(),
      bucket,
    };
  });

  const movementDates = movimentosSessoes.map((m) =>
    m.data_hora.toISOString(),
  );

  // ── Categorias Contadas ──
  const countedCategoriesData = extractCountedCategoryData(historicoSalvo);
  const canViewCategories = perms.livre || perms.importacao || perms.modular;

  // ── Empresas ──
  const dadosEmpresas = empresasCadastradas.map((empresa) => ({
    name: empresa.nome_fantasia,
    count: empresa._count.contagens_salvas,
  }));

  // ── Produtividade (por hora) ──
  const horasDoDia = Array.from({ length: 24 }).map((_, i) => ({
    hour: `${i}h`,
    count: 0,
  }));
  movimentosSessoes.forEach((mov) => {
    const hour = new Date(mov.data_hora).getHours();
    horasDoDia[hour].count += 1;
  });

  // ── Nomes de categorias para o Planejador ──
  const categoryNames = categoriasGlobais.map((c) => c.name);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* BARRA DE SESSÃO ATIVA */}
      {perms.sala && activeSession && (
        <SessionAlertBar session={activeSession} />
      )}

      {/* ── VERSÃO MOBILE REDESENHADA ───────────────────────────── */}
      <div className="lg:hidden">
        <MobileDashboard
          history={mobileHistory}
          movementDates={movementDates}
          hourlyProductivity={horasDoDia}
          companies={dadosEmpresas}
          globalCatalogCount={globalCatalogCount}
          categoryCount={categoriasGlobais.length}
          subcategoryCount={subcategoryCount}
          perms={{
            importacao: Boolean(perms.importacao),
            modular: Boolean(perms.modular),
            sala: Boolean(perms.sala),
            livre: Boolean(perms.livre),
            empresa: Boolean(perms.empresa),
          }}
        />
      </div>

      {/* ── VERSÃO DESKTOP (PRESERVADA) ───────────────────────── */}
      <div className="hidden lg:block space-y-6">
        {/* SEÇÃO 1: PLANEJADOR DE INVENTÁRIO ROTATIVO */}
        <section>
          <InventoryPlannerCard
            userId={String(userId)}
            countedCategoriesData={countedCategoriesData}
            categories={categoryNames}
            subcategories={subcategoryNames}
            initialPinned={user?.fixar_planejador ?? true}
          />
        </section>

        {/* SEÇÃO 2: HISTÓRICO + CATEGORIAS CONTADAS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0 items-stretch">
          <div className="col-span-1 lg:col-span-2 min-w-0 w-full">
            <HistoryChart rawHistory={rawHistory} data={mesesDoAno} />
          </div>

          <div className="col-span-1 relative min-w-0 w-full">
            {!canViewCategories && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-950/50 backdrop-blur-[4px] rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-full shadow-lg mb-3">
                  <Lock className="w-6 h-6 text-zinc-400" />
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  Módulo Restrito
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 px-6 text-center">
                  Requer acesso aos módulos de contagem.
                </span>
              </div>
            )}
            <CountedCategoriesChart data={countedCategoriesData} />
          </div>
        </section>

        {/* SEÇÃO 3: PRODUTIVIDADE + EMPRESAS + BASE GLOBAL */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0 items-stretch">
          <div className="min-w-0 w-full">
            <ProductivityChart
              data={horasDoDia}
              isBlocked={!perms.sala}
              blockedText="Requer o módulo Gestão de Sala ativo no plano Team para visualizar picos de bipagem da equipe."
            />
          </div>
          <div className="min-w-0 w-full">
            <CompanyChart
              data={dadosEmpresas}
              isBlocked={!perms.empresa}
              blockedText="Requer o módulo Empresas no plano Enterprise para gerenciar filiais múltiplas."
            />
          </div>
          <div className="min-w-0 w-full">
            <GlobalCatalogInfoCard
              count={globalCatalogCount}
              categoryCount={categoriasGlobais.length}
              subcategoryCount={subcategoryCount}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
