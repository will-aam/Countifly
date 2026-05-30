// components/inventory/mobile-carousel.tsx
"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

export function MobileCarousel({ children }: { children: React.ReactNode[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollPosition = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollPosition / width);
    setCurrentIndex(newIndex);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Pista de rolagem ocupa 100% da tela */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory w-full scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children.map((child, index) => (
          // O slot ocupa a tela toda (w-full), mas o px-4 afasta o card das bordas.
          // Assim eles NUNCA ficam colados durante o arraste!
          <div key={index} className="w-full flex-none snap-center px-4">
            {child}
          </div>
        ))}
      </div>

      {/* Os Pontinhos Indicadores (Dots) */}
      <div className="flex justify-center gap-2 items-center h-2">
        {children.map((_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-full transition-all duration-300",
              currentIndex === index
                ? "w-5 h-1.5 bg-foreground/80"
                : "w-1.5 h-1.5 bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
