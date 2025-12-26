"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPrincipalPage() {
  const router = useRouter();

  // Só garante que o toast começa escondido (não precisa de tema aqui)
  useEffect(() => {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.add("opacity-0", "translate-y-4");
    }
  }, []);

  const handleSelection = (mode: "team" | "free" | "import" | "history") => {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const modes: Record<typeof mode, string> = {
      team: "Modo Equipe",
      free: "Contagem Livre",
      import: "Modo Importação",
      history: "Histórico de Relatórios",
    };

    toast.textContent = `Acessando ${modes[mode]}...`;
    toast.classList.remove("opacity-0", "translate-y-4");
    toast.classList.add("opacity-100", "translate-y-0");

    // Navegação simples por enquanto
    if (mode === "free") {
      router.push("/audit");
    } else if (mode === "history") {
      router.push("/history");
    } else if (mode === "import") {
      router.push("/count-import");
    } else if (mode === "team") {
    }

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-4");
      toast.classList.remove("opacity-100", "translate-y-0");
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col transition-colors duration-300">
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-10">
        {/* Cards de resumo rápido */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                ></path>
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Último Inventário
              </p>
              <p className="text-lg font-bold">Há 2 dias</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                ></path>
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Itens no Catálogo
              </p>
              <p className="text-lg font-bold">14.280</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Colaboradores
              </p>
              <p className="text-lg font-bold">12 Ativos</p>
            </div>
          </div>

          <div className="stat-card p-5 rounded-xl border border-border/40 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Tempo Médio
              </p>
              <p className="text-lg font-bold">45 min</p>
            </div>
          </div>
        </section>

        {/* Seção de Operações Principais */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Iniciar Nova Operação</h3>
              <p className="text-xs text-muted-foreground">
                Escolha o método de contagem para iniciar agora.
              </p>
            </div>
            <div className="h-px bg-border/40 flex-1 ml-6 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Modo Equipe */}
            <button
              onClick={() => handleSelection("team")}
              className="dashboard-card group flex flex-col text-left p-6 rounded-2xl border border-border/50 bg-card shadow-sm relative overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Modo Equipe</h4>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                Trabalho colaborativo com sincronização em tempo real entre
                múltiplos dispositivos.
              </p>
              <div className="flex items-center text-primary font-bold text-xs uppercase tracking-widest">
                Criar Sala de Contagem
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </div>
            </button>

            {/* Contagem Livre */}
            <button
              onClick={() => handleSelection("free")}
              className="dashboard-card group flex flex-col text-left p-6 rounded-2xl border border-border/50 bg-card shadow-sm relative overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  ></path>
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Contagem Livre</h4>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                Acesse o catálogo global para bipar e conferir itens sem
                necessidade de carga prévia.
              </p>
              <div className="flex items-center text-primary font-bold text-xs uppercase tracking-widest">
                Acessar Catálogo
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </div>
            </button>

            {/* Por Importação */}
            <button
              onClick={() => handleSelection("import")}
              className="dashboard-card group flex flex-col text-left p-6 rounded-2xl border border-border/50 bg-card shadow-sm relative overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-5 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Por Importação</h4>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                Suba seu próprio arquivo CSV para uma conferência baseada em
                estoque específico.
              </p>
              <div className="flex items-center text-primary font-bold text-xs uppercase tracking-widest">
                Carregar Planilha
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  ></path>
                </svg>
              </div>
            </button>
          </div>
        </section>

        {/* Seção de Gestão e Histórico */}
        <section className="pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Gestão e Histórico</h3>
              <p className="text-xs text-muted-foreground">
                Analise dados e exporte relatórios de contagens passadas.
              </p>
            </div>
            <div className="h-px bg-border/40 flex-1 ml-6 hidden md:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Histórico de Relatórios */}
            <button
              onClick={() => handleSelection("history")}
              className="dashboard-card group flex items-center p-6 rounded-2xl border border-border/50 bg-card shadow-sm"
            >
              <div className="p-4 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300 mr-6">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <div className="text-left flex-1">
                <h4 className="text-lg font-bold">Histórico de Relatórios</h4>
                <p className="text-sm text-muted-foreground">
                  Visualize auditorias salvas, gere PDFs e exporte para Excel.
                </p>
              </div>
              <div className="p-2 rounded-full border border-border/50 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
                <svg
                  className="h-5 w-5 text-muted-foreground group-hover:text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </div>
            </button>

            {/* Card de Auditoria Rápida */}
            <div className="p-6 rounded-2xl border border-border/50 bg-card/40 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                  Acuracidade Média
                </span>
                <span className="text-xs font-bold text-emerald-500">
                  98.4%
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 mb-4">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: "98.4%" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center">
                Baseado nos últimos 10 inventários realizados.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Feedback Toast */}
      <div
        id="toast"
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-2xl opacity-0 translate-y-4 transition-all duration-300 pointer-events-none text-sm font-bold z-50"
      >
        Carregando Módulo...
      </div>
    </div>
  );
}
