// components/inventory/mobile-carousel.tsx
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

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
          <div key={index} className="w-full flex-none snap-center px-4">
            {child}
          </div>
        ))}
      </div>

      {/* Expanding Dot Pagination (Pílula com Framer Motion puro) */}
      <div className="flex justify-center items-center gap-2 h-4">
        {children.map((_, index) => (
          <motion.div
            key={index}
            // O Framer Motion anima automaticamente a largura e a cor
            animate={{
              width: currentIndex === index ? 30 : 10,
              backgroundColor:
                currentIndex === index ? "#0044ff" : "rgba(0, 68, 255, 0.3)",
            }}
            transition={{
              type: "spring",
              stiffness: 400, // Mola mais firme, responde instantaneamente ao dedo
              damping: 25, // Evita tremedeira
            }}
            className="h-2.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
