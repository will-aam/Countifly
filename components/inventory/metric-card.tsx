// components/inventory/metric-card.tsx
import { cn } from "@/lib/utils";
import { LucideIcon, Lock, ChevronRight } from "lucide-react";

interface MetricCardProps {
  id: string;
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isBlocked?: boolean;
  blockedText?: string;
  isLive?: boolean;
  showArrow?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isBlocked,
  blockedText,
  isLive,
  showArrow,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer",
        // Altura aumentada pra 144px (tirando o aspecto fino) e padding maior
        "h-[144px] md:h-[150px] flex flex-col justify-between p-5",
        "w-full md:w-auto",
        className,
      )}
    >
      {/* Marca d'água */}
      <Icon className="absolute -bottom-4 -right-4 h-24 w-24 opacity-[0.03] text-foreground pointer-events-none transition-transform group-hover:scale-110" />

      {/* Topo */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 max-w-[85%]">
          {isLive && !isBlocked && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground truncate">
            {title}
          </span>
        </div>
        {isBlocked ? (
          <Lock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        ) : showArrow ? (
          <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-foreground/80 transition-colors shrink-0" />
        ) : null}
      </div>

      {/* Rodapé */}
      <div className="relative z-10 flex flex-col gap-1">
        {isBlocked ? (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 pr-4">
            {blockedText}
          </p>
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-black tracking-tight text-foreground truncate pr-2">
              {value}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              {subtitle}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
