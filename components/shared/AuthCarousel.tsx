"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PresentationCards } from "./PresentationCards";
import { ArrowRightLeft, Database, Boxes, ScanLine, Printer, Image as ImageIcon, FileSpreadsheet, UploadCloud, Users, CheckCircle2, WifiOff, RefreshCw, History } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Palco dos cards                                                            */
/* -------------------------------------------------------------------------- */

const STAGE_W = 420;
const STAGE_H = 490;
const STAGE_PAD = 32; // respiro vertical (py-4 em cima + embaixo)

/**
 * Desenha o card em tamanho fixo (420x490) e escala pra caber na área disponível.
 * Substitui as 6 cópias da string de scale por media query: aquelas dependiam
 * da ordem em que o Tailwind gera o CSS, e com altura baixa podiam aplicar o
 * scale errado. Aqui a escala vem direto da medida real do container.
 */
function CardStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(1, width / STAGE_W, (height - STAGE_PAD) / STAGE_H));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full min-h-0 w-full items-center justify-center py-4">
      <div
        aria-hidden="true"
        className="relative flex shrink-0 flex-col items-center justify-center"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

// Slide 2: Importação de CSV
function CsvCard() {
  return (
    <CardStage>
      <div className="flex w-[340px] flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">inventario_mensal.csv</h4>
            <p className="text-xs text-zinc-400">8,5 MB • 15.000 linhas</p>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-white/20 bg-zinc-800/50 p-8">
          <div className="absolute inset-0 animate-pulse bg-primary/5 motion-reduce:animate-none" />
          <UploadCloud className="relative z-10 h-8 w-8 text-primary" />
          <span className="relative z-10 text-xs font-medium text-zinc-300">Validando os dados...</span>
        </div>

        <div className="mt-2 space-y-2 font-mono text-xs text-zinc-500">
          {[5000, 10000].map((line) => (
            <div key={line} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="flex-1">Linha {line.toLocaleString("pt-BR")}: OK</span>
            </div>
          ))}
          {/* Última linha ainda em andamento: combina com o texto "Validando" acima */}
          <div className="flex items-center gap-3 text-zinc-400">
            <RefreshCw className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
            <span className="flex-1">Linha 15.000: validando</span>
          </div>
        </div>
      </div>
    </CardStage>
  );
}

// Slide 3: Sessões em Equipe
const TEAM = [
  { name: "João (Host)", count: 450, color: "bg-blue-500" },
  { name: "Maria", count: 890, color: "bg-purple-500" },
  { name: "Carlos", count: 320, color: "bg-orange-500" },
];

function TeamCard() {
  const total = TEAM.reduce((sum, user) => sum + user.count, 0);
  const max = Math.max(...TEAM.map((user) => user.count));

  return (
    <CardStage>
      <div className="flex w-[340px] flex-col gap-6 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-white">Sessão #4928</span>
          </div>
          <div className="animate-pulse rounded-full bg-green-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400 motion-reduce:animate-none">
            Em andamento
          </div>
        </div>

        <div className="space-y-4">
          {TEAM.map((user) => (
            <div key={user.name} className="flex items-center gap-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white", user.color)}>
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-zinc-300">{user.name}</span>
                  <span className="text-zinc-400">{user.count.toLocaleString("pt-BR")} itens</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className={cn("h-full rounded-full", user.color)} style={{ width: `${(user.count / max) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-zinc-400">Total auditado</span>
          <span className="font-mono text-lg font-bold text-white">{total.toLocaleString("pt-BR")}</span>
        </div>
      </div>
    </CardStage>
  );
}

// Slide 4: Offline-first
const PENDING_ITEMS = 4;

function OfflineCard() {
  return (
    <CardStage>
      <div className="flex w-[340px] flex-col gap-6 rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-semibold">Sem conexão</span>
          </div>
          <span className="text-xs">Modo offline</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>Fila de sincronização</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-white">{PENDING_ITEMS} pendentes</span>
          </div>

          <div className="space-y-2">
            {Array.from({ length: PENDING_ITEMS }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/50 p-3">
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-zinc-500" />
                  <span className="font-mono text-xs text-zinc-300">Produto 78910...</span>
                </div>
                <RefreshCw className="h-4 w-4 text-zinc-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardStage>
  );
}

// Slide 5: Conexão com ERP
const ERP_PROGRESS = 75;

function ErpCard() {
  return (
    <CardStage>
      <div className="flex w-[340px] flex-col items-center gap-6 rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
              <Database className="h-8 w-8" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Countifly</span>
          </div>

          <div className="flex animate-pulse flex-col items-center text-zinc-500 motion-reduce:animate-none">
            <ArrowRightLeft className="h-6 w-6" />
            <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary/80">Sincronizando</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 shadow-inner ring-1 ring-white/10">
              <Boxes className="h-8 w-8" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Seu ERP</span>
          </div>
        </div>

        <div className="mt-4 w-full space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-primary" style={{ width: `${ERP_PROGRESS}%` }} />
          </div>
          <div className="flex justify-between font-mono text-xs text-zinc-500">
            <span>Atualizando inventário...</span>
            <span className="text-primary">{ERP_PROGRESS}%</span>
          </div>
        </div>
      </div>
    </CardStage>
  );
}

// Slide 6: Gerador de Etiquetas
// Largura de cada faixa; as posições pares são barras, as ímpares são espaços.
const BARCODE = (() => {
  const widths = [2, 1, 1, 3, 2, 1, 1, 2, 4, 1, 1, 2, 2, 1, 3, 1, 2];
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, total: x };
})();

function TagsCard() {
  return (
    <CardStage>
      <div className="absolute left-1/2 top-1/2 w-[280px] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] scale-95 rounded-xl border border-white/10 bg-zinc-100 p-6 opacity-60 shadow-2xl" />
      <div className="relative z-10 w-[300px] rounded-xl border border-white/20 bg-zinc-50 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900">PRODUTO XYZ</h3>
            <p className="font-mono text-xs text-zinc-500">SKU: 9988-7766-55</p>
          </div>
          <div className="rounded-lg bg-zinc-200 p-2 text-zinc-600">
            <Printer className="h-5 w-5" />
          </div>
        </div>

        <div className="mb-4 flex h-20 w-full flex-col justify-center gap-1 opacity-80">
          {/* O viewBox precisa ter a largura total das barras; antes era 100 e o código ocupava só ~30% à esquerda */}
          <svg viewBox={`0 0 ${BARCODE.total} 24`} preserveAspectRatio="none" className="h-16 w-full">
            {BARCODE.bars.map((bar) => (
              <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={24} fill="#000" />
            ))}
          </svg>
          <p className="text-center font-mono text-[10px] tracking-[0.2em] text-zinc-800">7891029384756</p>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <span className="text-xs font-semibold text-zinc-600">LOTE: 2026/A</span>
          <span className="text-lg font-bold text-zinc-900">R$ 149,90</span>
        </div>
      </div>
    </CardStage>
  );
}

// Slide 7: Cálculo por Imagem
const BOXES = 12;

function ImageCountCard() {
  return (
    <CardStage>
      <div className="relative h-[400px] w-[340px] overflow-hidden rounded-2xl border-2 border-white/10 bg-zinc-900 shadow-2xl">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-2 p-4">
          {Array.from({ length: BOXES }).map((_, i) => (
            <div key={i} className="rounded-md border border-primary/40 bg-zinc-700/40" />
          ))}
        </div>

        <div className="absolute inset-0 z-10 flex flex-col">
          <div className="flex flex-1 justify-between p-6">
            <div className="h-8 w-8 border-l-2 border-t-2 border-primary" />
            <div className="h-8 w-8 border-r-2 border-t-2 border-primary" />
          </div>

          {/* shadow-primary/60 funciona com qualquer formato de cor do tema (o rgba(var(--primary)) antigo só funciona com variável em "r, g, b") */}
          <div className="absolute left-0 top-1/2 h-0.5 w-full animate-pulse bg-primary/60 shadow-lg shadow-primary/60 motion-reduce:animate-none" />

          <div className="flex flex-1 items-end justify-between p-6">
            <div className="h-8 w-8 border-b-2 border-l-2 border-primary" />
            <div className="h-8 w-8 border-b-2 border-r-2 border-primary" />
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-primary/30 bg-primary/20 px-4 py-2 backdrop-blur-md">
          <ScanLine className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{BOXES} caixas identificadas</span>
        </div>

        <div className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 backdrop-blur-md">
          <ImageIcon className="h-4 w-4 text-white" />
        </div>
      </div>
    </CardStage>
  );
}

/* -------------------------------------------------------------------------- */
/* Slides                                                                     */
/* -------------------------------------------------------------------------- */

type Slide = {
  title: string;
  description: string;
  content: React.ReactNode;
  inDevelopment?: boolean;
};

const slides: Slide[] = [
  {
    title: "Contagem livre e auditoria",
    description: "Com o Countifly, a sua auditoria pode ser feita utilizando nossa base de dados global de produtos, auxiliando significativamente na velocidade e precisão de cada contagem.",
    content: <PresentationCards />,
  },
  {
    title: "Contagem por importação",
    description: "Faça upload de planilhas e arquivos CSV contendo seu estoque esperado. O sistema valida os dados e permite realizar contagens baseadas na lista previamente importada.",
    content: <CsvCard />,
  },
  {
    title: "Sessões colaborativas em equipe",
    description: "Otimize auditorias complexas permitindo que vários membros da equipe contem estoques simultaneamente. Cada movimento é registrado e auditável em tempo real.",
    content: <TeamCard />,
  },
  {
    title: "Resiliência offline-first",
    description: "Sem internet no galpão? Não tem problema. Continue bipando códigos de barra normalmente. O Countifly salva no cache local e sincroniza automaticamente quando a conexão voltar.",
    content: <OfflineCard />,
  },
  {
    title: "Conexões de ERP",
    description: "Sincronização inteligente. Conecte o Countifly diretamente ao seu sistema de ERP e mantenha seus estoques, cadastros e faturamentos sempre atualizados em tempo real.",
    content: <ErpCard />,
    inDevelopment: true,
  },
  {
    title: "Gerador de etiquetas",
    description: "Organização padronizada. Utilize nosso gerador integrado para criar e imprimir etiquetas e códigos de barras, facilitando a identificação rápida e o rastreio dos seus produtos.",
    content: <TagsCard />,
  },
  {
    title: "Cálculo por imagem",
    description: "Inteligência Artificial a seu favor. Revolucione o seu inventário com a contagem automática por imagem, identificando caixas e calculando quantidades instantaneamente.",
    content: <ImageCountCard />,
    inDevelopment: true,
  },
];

const SLIDE_DURATION_MS = 6000;

/* -------------------------------------------------------------------------- */
/* Carrossel                                                                  */
/* -------------------------------------------------------------------------- */

export function AuthCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  // setTimeout dependente do slide atual: ao clicar num dos pontos, o contador
  // recomeça do zero (com setInterval o slide podia trocar logo após o clique).
  // Pausa com mouse/foco em cima e não roda se o usuário pediu menos movimento.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [currentSlide, paused]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Recursos do Countifly"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 py-6 text-primary-foreground shadow-2xl xl:px-8 xl:py-12"
    >
      {/* Grade de fundo */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)]"
        )}
      />
      {/* Vinheta radial: apaga a grade nas bordas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      />

      {/* Card do slide atual. Só o slide ativo é montado: assim a animação de entrada
          roda a cada troca (antes rodava uma vez, com todos os slides invisíveis) e os
          pulses e barras dos slides escondidos não ficam animando à toa. */}
      <div className="relative z-10 min-h-0 w-full flex-1">
        <div
          key={currentSlide}
          className="absolute inset-0 flex animate-in flex-col items-center justify-center fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none"
        >
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Texto + pontos */}
      <div className="relative z-20 flex w-full shrink-0 flex-col items-center pt-4">
        {/* Todos os textos ocupam a mesma célula do grid: a altura vira a do maior
            texto, sem altura fixa. Antes (120/150px) os títulos longos estouravam
            a caixa e encostavam nos pontos. */}
        <div className="mx-auto grid w-full max-w-lg text-center">
          {slides.map((slide, index) => (
            <div
              key={slide.title}
              aria-hidden={index !== currentSlide}
              className={cn(
                "col-start-1 row-start-1 flex flex-col items-center transition-opacity duration-500 ease-in-out",
                index === currentSlide ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <div className="mb-2 flex flex-col items-center gap-2 xl:mb-4">
                <h2 className="text-balance text-2xl font-bold tracking-tight text-white xl:text-4xl">{slide.title}</h2>
                {slide.inDevelopment && (
                  <span className="rounded-full border border-white/10 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 backdrop-blur-sm">
                    Em desenvolvimento
                  </span>
                )}
              </div>
              <p className="text-pretty text-sm leading-relaxed text-white/80 xl:text-base">{slide.description}</p>
            </div>
          ))}
        </div>

        {/* Pontos de navegação: botão com área de toque de 24px, a barra visível continua fina */}
        <div className="mt-6 flex items-center justify-center">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Ir para: ${slide.title}`}
              aria-current={index === currentSlide}
              className="group flex h-6 cursor-pointer items-center px-1 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-zinc-950",
                  index === currentSlide ? "w-8 bg-white xl:w-10" : "w-6 bg-white/30 group-hover:bg-white/50 xl:w-8"
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}