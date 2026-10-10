"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PresentationCards } from "./PresentationCards";
import { ArrowRightLeft, Database, Boxes, ScanLine, Printer, Image as ImageIcon, FileSpreadsheet, UploadCloud, Users, CheckCircle2, WifiOff, RefreshCw, History } from "lucide-react";

// Slide 2: Importação de CSV
function CsvCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="w-[340px] rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">inventario_mensal.csv</h4>
              <p className="text-xs text-zinc-400">8.5 MB • 15.000 linhas</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-white/20 bg-zinc-800/50 p-8 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <UploadCloud className="h-8 w-8 text-primary relative z-10" />
            <span className="text-xs font-medium text-zinc-300 relative z-10">Analisando e validando dados...</span>
          </div>
          <div className="space-y-2 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="flex-1">Linha {i * 5000}: OK</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 3: Sessões em Equipe
function TeamCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="w-[340px] rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-white">Sessão #4928</span>
            </div>
            <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              Em Andamento
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { name: "João (Host)", count: 450, color: "bg-blue-500" },
              { name: "Maria", count: 890, color: "bg-purple-500" },
              { name: "Carlos", count: 320, color: "bg-orange-500" }
            ].map((user, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white", user.color)}>
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 font-medium">{user.name}</span>
                    <span className="text-zinc-400">{user.count} itens</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", user.color)} style={{ width: `${(user.count / 1000) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-sm">
            <span className="text-zinc-400">Total Auditado</span>
            <span className="font-mono font-bold text-white text-lg">1.660</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 4: Offline-first
function OfflineCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="w-[340px] rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm font-semibold">Sem Conexão</span>
            </div>
            <span className="text-xs">Modo Offline</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span>Fila de Sincronização</span>
              <span className="bg-zinc-800 px-2 py-0.5 rounded-full text-white">4 pendentes</span>
            </div>
            
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-mono text-zinc-300">Produto 78910...</span>
                  </div>
                  <RefreshCw className="h-4 w-4 text-zinc-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 5: Conexão com ERP
function ErpCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="w-[340px] rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex w-full items-center justify-between px-2">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
                <Database className="h-8 w-8" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Countifly</span>
            </div>

            <div className="flex flex-col items-center animate-pulse text-zinc-500">
              <ArrowRightLeft className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-mono uppercase tracking-widest text-primary/80">Sincronizando</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 ring-1 ring-white/10 shadow-inner">
                <Boxes className="h-8 w-8" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Seu ERP</span>
            </div>
          </div>

          <div className="w-full space-y-3 mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-[75%] rounded-full bg-primary" />
            </div>
            <div className="flex justify-between text-xs text-zinc-500 font-mono">
              <span>Atualizando inventário...</span>
              <span className="text-primary">75%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 6: Gerador de Etiquetas
function TagsCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] rounded-xl border border-white/10 bg-zinc-100 p-6 shadow-2xl rotate-[-4deg] opacity-60 scale-95" />
        <div className="relative z-10 w-[300px] rounded-xl border border-white/20 bg-zinc-50 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-900 text-lg">PRODUTO XYZ</h3>
              <p className="text-xs text-zinc-500 font-mono">SKU: 9988-7766-55</p>
            </div>
            <div className="p-2 bg-zinc-200 rounded-lg text-zinc-600">
              <Printer className="h-5 w-5" />
            </div>
          </div>

          <div className="w-full h-20 flex flex-col justify-center gap-1 opacity-80 mb-4">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-16">
              {[2, 1, 1, 3, 2, 1, 1, 2, 4, 1, 1, 2, 2, 1, 3, 1, 2].map((w, i, arr) => {
                const x = arr.slice(0, i).reduce((a, b) => a + b, 0);
                return i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={24} fill="#000" /> : null;
              })}
            </svg>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] text-zinc-800">7891029384756</p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
            <span className="text-xs font-semibold text-zinc-600">LOTE: 2026/A</span>
            <span className="text-lg font-bold text-zinc-900">R$ 149,90</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 7: Cálculo por Imagem
function ImageCountCard() {
  return (
    <div className="relative flex w-full h-full items-center justify-center min-h-0 py-4">
      <div
        aria-hidden="true"
        className="relative h-[490px] w-[420px] shrink-0 origin-center [@media(max-height:1000px)]:scale-[0.90] [@media(max-height:900px)]:scale-[0.80] [@media(max-height:800px)]:scale-[0.70] [@media(max-height:700px)]:scale-[0.60] [@media(max-height:600px)]:scale-[0.50] flex flex-col items-center justify-center"
      >
        <div className="relative w-[340px] h-[400px] overflow-hidden rounded-2xl border-2 border-white/10 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-2 p-4 opacity-40">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-md bg-zinc-700 border border-zinc-600" />
            ))}
          </div>

          <div className="absolute inset-0 z-10 flex flex-col">
            <div className="flex-1 flex justify-between p-6">
              <div className="w-8 h-8 border-t-2 border-l-2 border-primary" />
              <div className="w-8 h-8 border-t-2 border-r-2 border-primary" />
            </div>
            
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-[pulse_2s_ease-in-out_infinite]" />

            <div className="flex-1 flex items-end justify-between p-6">
              <div className="w-8 h-8 border-b-2 border-l-2 border-primary" />
              <div className="w-8 h-8 border-b-2 border-r-2 border-primary" />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-primary/20 border border-primary/30 px-4 py-2 backdrop-blur-md whitespace-nowrap">
            <ScanLine className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">12 Caixas Identificadas</span>
          </div>
          
          <div className="absolute top-4 right-4 z-20 bg-black/50 p-2 rounded-full backdrop-blur-md">
            <ImageIcon className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

const slides = [
  {
    title: "Contagem Livre e Auditoria",
    description: "Com o Countifly, a sua auditoria pode ser feita utilizando nossa base de dados global de produtos, auxiliando significativamente na velocidade e precisão de cada contagem.",
    content: <PresentationCards />
  },
  {
    title: "Contagem por Importação",
    description: "Faça upload de planilhas e arquivos CSV contendo seu estoque esperado. O sistema valida os dados e permite realizar contagens baseadas na lista previamente importada.",
    content: <CsvCard />
  },
  {
    title: "Sessões Colaborativas em Equipe",
    description: "Otimize auditorias complexas permitindo que vários membros da equipe contem estoques simultaneamente. Cada movimento é registrado e auditável em tempo real.",
    content: <TeamCard />
  },
  {
    title: "Resiliência Offline-First",
    description: "Sem internet no galpão? Não tem problema. Continue bipando códigos de barra normalmente. O Countifly salva no cache local e sincroniza automaticamente quando a conexão voltar.",
    content: <OfflineCard />
  },
  {
    title: "Conexões de ERP",
    description: "Sincronização inteligente. Conecte o Countifly diretamente ao seu sistema de ERP e mantenha seus estoques, cadastros e faturamentos sempre atualizados em tempo real.",
    content: <ErpCard />,
    inDevelopment: true
  },
  {
    title: "Gerador de Etiquetas",
    description: "Organização padronizada. Utilize nosso gerador integrado para criar e imprimir etiquetas e códigos de barras, facilitando a identificação rápida e o rastreio dos seus produtos.",
    content: <TagsCard />
  },
  {
    title: "Cálculo por Imagem",
    description: "Inteligência Artificial a seu favor. Revolucione o seu inventário com a contagem automática por imagem, identificando caixas e calculando quantidades instantaneamente.",
    content: <ImageCountCard />,
    inDevelopment: true
  }
];

export function AuthCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // Muda a cada 6 segundos

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full relative flex flex-col items-center py-6 px-6 xl:py-12 xl:px-8 overflow-hidden text-primary-foreground shadow-2xl">
      {/* Aceternity Grid background effect */}
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)]"
        )}
      />
      {/* Radial gradient for the container to give a faded look */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

      {/* Render current slide content in the upper flexible area */}
      <div className="z-10 w-full flex-1 relative min-h-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out",
              index === currentSlide ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-4 pointer-events-none z-0"
            )}
          >
            {slide.content}
          </div>
        ))}
      </div>

      {/* Bottom text mapping - Fixed height to avoid overlapping with cards */}
      <div className="z-20 w-full h-[180px] xl:h-[220px] shrink-0 relative flex flex-col items-center justify-end pt-4">
        {/* Texts Wrapper */}
        <div className="relative w-full h-[120px] xl:h-[150px] flex flex-col items-center text-center max-w-lg mx-auto">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={cn(
                "absolute top-0 left-0 w-full transition-all duration-500 ease-in-out flex flex-col items-center",
                index === currentSlide ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              )}
            >
              <div className="flex flex-col items-center gap-2 mb-2 xl:mb-4">
                <h2 className="text-2xl xl:text-4xl font-bold tracking-tight text-white">{slide.title}</h2>
                {(slide as any).inDevelopment && (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-white/10 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 backdrop-blur-sm">
                    Em Desenvolvimento
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm xl:text-base leading-relaxed">
                {slide.description}
              </p>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2.5 justify-center mt-auto pb-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                index === currentSlide ? "w-8 xl:w-10 bg-white" : "w-6 xl:w-8 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
