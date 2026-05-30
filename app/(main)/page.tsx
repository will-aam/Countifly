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
import { MetricCard } from "@/components/inventory/metric-card";
import { MobileCarousel } from "@/components/inventory/mobile-carousel";

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

  // Busca TUDO do banco real (Adeus mocks)
  const [
    user,
    localCatalogCount,
    activeSession,
    globalCatalogCount,
    produtosSemEan,
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
    // Query REAL para ver a saúde do catálogo: produtos sem código de barras
    prisma.produto.count({
      where: {
        usuario_id: userId,
        tipo_cadastro: "FIXO",
        // Verifica se a relação de códigos de barras está vazia
        codigos_barras: {
          none: {},
        },
      },
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
      // showArrow ausente = sem seta
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
      showArrow: true, // <--- A SETA SÓ APARECE AQUI, COMO VOCÊ PEDIU
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

  // IMPORTANTE: Adicione a importação do MobileCarousel no topo do page.tsx:
  // import { MobileCarousel } from "@/components/inventory/mobile-carousel";

  return (
    <div className="space-y-6">
      {/* MOBILE: As margens negativas fazem o carrossel sangrar nas bordas da tela */}
      <div className="block xl:hidden -mx-4 sm:-mx-6 lg:-mx-8">
        <MobileCarousel>
          {cardsData.map((card) => (
            <MetricCard key={`mobile-${card.id}`} {...card} />
          ))}
        </MobileCarousel>
      </div>

      {/* DESKTOP: Mantém o Grid travado */}
      <div className="hidden xl:grid xl:grid-cols-5 gap-4">
        {cardsData.map((card) => (
          <MetricCard key={`desktop-${card.id}`} {...card} />
        ))}
      </div>
    </div>
  );
}
