"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockClosedIcon as LockIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SIDEBAR_SECTIONS,
  isSidebarItemActive,
  type SidebarModuleKey,
  type SidebarNavItem,
} from "./sidebar-config";

interface SidebarNavContentProps {
  variant: "desktop" | "mobile";
  isExpanded: boolean;
  isAdmin: boolean;
  hasModule: (module: SidebarModuleKey) => boolean;
  isModuleLocked: (module: SidebarModuleKey) => boolean;
  onNavigate?: () => void;
}

function SectionLabel({
  label,
  visible,
}: {
  label: string;
  visible: boolean;
}) {
  if (!visible) {
    return <div className="my-2 mx-auto w-5 border-t border-border/30" />;
  }

  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
      {label}
    </p>
  );
}

function NavItemRow({
  item,
  isActive,
  locked,
  isExpanded,
  variant,
  onNavigate,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  locked: boolean;
  isExpanded: boolean;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const IconToRender =
    !locked && isActive && item.solidIcon ? item.solidIcon : item.icon;

  const baseClass = cn(
    "w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-150 text-left group",
    isExpanded ? "px-3" : "px-0 justify-center",
    locked
      ? "border border-dashed border-border/50 bg-muted/20 opacity-85 cursor-not-allowed my-0.5"
      : isActive
        ? "bg-primary/10 text-primary font-semibold"
        : "text-slate-700 dark:text-muted-foreground hover:text-slate-950 dark:hover:text-foreground hover:bg-muted/40",
  );

  const innerContent = (
    <>
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0",
          locked && "p-1.5 rounded-md bg-muted/30",
        )}
      >
        <IconToRender
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            locked
              ? "text-muted-foreground/70"
              : isActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        {locked && !isExpanded && (
          <div className="absolute -top-1 -right-1 bg-background rounded-full">
            <LockIcon className="h-2.5 w-2.5 text-amber-500" />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
          <span
            className={cn(
              "text-[13px] truncate",
              locked && "text-muted-foreground/80",
            )}
          >
            {item.title}
          </span>

          {locked ? (
            <div className="flex items-center gap-1 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-600 border border-amber-500/20">
              <LockIcon className="h-2.5 w-2.5" />
              <span className="text-[9px] font-bold uppercase">Bloqueado</span>
            </div>
          ) : item.badge ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {item.badge}
            </span>
          ) : null}
        </div>
      )}
    </>
  );

  const element = locked ? (
    <div aria-disabled="true" aria-label={item.title} className={baseClass}>
      {innerContent}
    </div>
  ) : (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={item.title}
      className={baseClass}
    >
      {innerContent}
    </Link>
  );

  if (variant === "desktop" && !isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger render={element} />
        <TooltipContent side="right" className="font-semibold text-xs ml-2">
          {locked ? `${item.title} (Bloqueado)` : item.title}{" "}
          {item.badge ? `(${item.badge})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return element;
}

export function SidebarNavContent({
  variant,
  isExpanded,
  isAdmin,
  hasModule,
  isModuleLocked,
  onNavigate,
}: SidebarNavContentProps) {
  const pathname = usePathname();

  return (
    <>
      {SIDEBAR_SECTIONS.map((section) => {
        const resolvedItems = section.items.flatMap((item) => {
          if (variant === "mobile" && item.desktopOnly) return [];
          if (variant === "desktop" && item.mobileOnly) return [];
          if (item.adminOnly && !isAdmin) return [];

          if (item.module) {
            if (hasModule(item.module)) {
              return [{ item, locked: false }];
            }
            if (item.alwaysShowLocked || isModuleLocked(item.module)) {
              return [{ item, locked: true }];
            }
            return [];
          }

          return [{ item, locked: false }];
        });

        if (resolvedItems.length === 0) return null;

        return (
          <div key={section.id} className="space-y-0.5">
            <SectionLabel
              label={section.label}
              visible={variant === "mobile" || isExpanded}
            />
            {resolvedItems.map(({ item, locked }) => (
              <NavItemRow
                key={item.id}
                item={item}
                isActive={!locked && isSidebarItemActive(item, pathname)}
                locked={locked}
                isExpanded={variant === "mobile" || isExpanded}
                variant={variant}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
