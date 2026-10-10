// components/shared/PresentationCards.tsx
/**
 * Descrição: Cartões de apresentação do painel direito da AuthPage.
 * Responsabilidade: Mostrar, de forma minimalista, o produto sendo
 * reconhecido na base global e o andamento de uma contagem.
 */

import { Check } from "lucide-react";

/* Largura alternada barra / espaço, formando um código de barras estático */
const BARCODE_PATTERN = [
  2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 3, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2,
  2, 3, 1, 1, 2, 1, 1, 3, 2, 1,
];

const BARCODE_BARS = (() => {
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  BARCODE_PATTERN.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, width: x };
})();

const CATEGORIES = [
  { name: "Pet", count: "31.514", share: 32, tone: "bg-white" },
  { name: "Calçados", count: "13.787", share: 14, tone: "bg-white/70" },
  { name: "Higiene pessoal", count: "12.802", share: 13, tone: "bg-white/50" },
  { name: "Biscoitos", count: "7.878", share: 8, tone: "bg-white/35" },
  { name: "Bebidas", count: "4.924", share: 5, tone: "bg-white/20" },
];

function Barcode() {
  return (
    <svg
      viewBox={`0 0 ${BARCODE_BARS.width} 24`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      {BARCODE_BARS.bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={24} fill="#18181b" />
      ))}
    </svg>
  );
}

export function PresentationCards() {
  return (
    <div className="relative flex w-full flex-1 items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50]"
      >
        {/* Cartão de trás: produto reconhecido */}
        <div className="absolute left-0 top-0 z-0 w-[320px] rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5 backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-backwards">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-[88px] shrink-0 overflow-hidden rounded-lg bg-zinc-100 px-2.5 py-2.5">
              <Barcode />
              {/* Linha de leitura */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-primary shadow-[0_0_10px_1px] shadow-primary/60" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-white">
                Ração Premium Cães Adultos
              </p>
              <p className="mt-0.5 text-sm text-zinc-400">Pet &middot; Rações &middot; 15 kg</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-3.5 text-sm text-zinc-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Encontrado na base global
          </div>
        </div>

        {/* Cartão da frente: andamento da contagem */}
        <div className="absolute bottom-0 right-0 z-10 w-[340px] rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-200 motion-safe:fill-mode-backwards">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Categorias disponiveis
            </span>
          </div>

          <div className="mt-6">
            <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">
              98.480
            </p>
            <p className="mt-1 text-sm text-zinc-400">itens na base</p>
          </div>

          {/* Barra segmentada por categoria */}
          <div className="mt-6 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/10">
            {CATEGORIES.map((c) => (
              <div
                key={c.name}
                className={`h-full rounded-full ${c.tone}`}
                style={{ width: `${c.share}%` }}
              />
            ))}
          </div>

          <ul className="mt-6 space-y-3.5">
            {CATEGORIES.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-zinc-200">
                  <span className={`h-2 w-2 rounded-full ${c.tone}`} />
                  {c.name}
                </span>
                <span className="flex items-baseline gap-3 tabular-nums">
                  <span className="text-zinc-300">{c.count}</span>
                  <span className="w-9 text-right text-zinc-500">{c.share}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}