"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const paginateItems = <T,>(
  items: T[],
  firstPageSize = 26,
  pageSize = 34,
) => {
  if (items.length === 0) return [[]] as T[][];
  const pages: T[][] = [items.slice(0, firstPageSize)];
  for (let offset = firstPageSize; offset < items.length; offset += pageSize) {
    pages.push(items.slice(offset, offset + pageSize));
  }
  return pages;
};

interface PaginatedReportPreviewProps {
  pages: ReactNode[];
  orientation?: "portrait" | "landscape";
}

export const PaginatedReportPreview = forwardRef<
  HTMLDivElement,
  PaginatedReportPreviewProps
>(({ pages, orientation = "portrait" }, ref) => {
  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const pageHeight = orientation === "landscape" ? "210mm" : "297mm";
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const attachPagesRef = useCallback(
    (node: HTMLDivElement | null) => {
      pagesRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  useEffect(() => {
    const container = pagesRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePages = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const index = Number(
          visiblePages[0]?.target.getAttribute("data-page-index"),
        );
        if (Number.isInteger(index)) setCurrentPage(index);
      },
      { threshold: [0.1, 0.25, 0.5, 0.75] },
    );
    container
      .querySelectorAll("[data-page-index]")
      .forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [pages.length]);

  const goToPage = (index: number) => {
    const target = pagesRef.current?.querySelector<HTMLElement>(
      `[data-page-index="${index}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex min-h-full min-w-0 flex-col items-center gap-6 bg-gray-100 p-4 dark:bg-gray-900">
      <div
        ref={attachPagesRef}
        className="report-document-pages"
        data-orientation={orientation}
        style={
          {
            "--report-page-width": pageWidth,
            "--report-page-height": pageHeight,
          } as React.CSSProperties
        }
      >
        {pages.map((page, index) => (
          <div
            key={index}
            className="report-page-sheet"
            data-orientation={orientation}
            data-page-index={index}
          >
            {page}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ir para a página anterior"
            title="Página anterior"
            onClick={() => goToPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="report-floating-navigation fixed right-4 top-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40 sm:right-6 sm:top-6"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <div className="report-floating-navigation fixed bottom-5 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6">
            <span className="rounded-full border bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur">
              {currentPage + 1} / {pages.length}
            </span>
            <button
              type="button"
              aria-label="Ir para a próxima página"
              title="Próxima página"
              onClick={() =>
                goToPage(Math.min(pages.length - 1, currentPage + 1))
              }
              disabled={currentPage >= pages.length - 1}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
});

PaginatedReportPreview.displayName = "PaginatedReportPreview";

interface ReportPageFrameProps {
  title: string;
  scope?: string;
  logoSrc: string;
  showLogo: boolean;
  showHeader: boolean;
  pageNumber: number;
  pageCount: number;
  children: ReactNode;
  signature?: ReactNode;
  orientation?: "portrait" | "landscape";
}

export function ReportPageFrame({
  title,
  scope,
  logoSrc,
  showLogo,
  showHeader,
  pageNumber,
  pageCount,
  children,
  signature,
  orientation = "portrait",
}: ReportPageFrameProps) {
  return (
    <article
      data-orientation={orientation}
      className="report-page-content flex flex-col bg-white p-[10mm] text-black"
    >
      {showHeader && (
        <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div className="flex min-w-0 items-start gap-4">
            {showLogo && (
              <img
                src={logoSrc}
                alt="Logo"
                className="h-16 max-w-[120px] shrink-0 object-contain"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-2xl font-bold uppercase tracking-tight text-blue-900">
                {title}
              </h1>
              {scope && (
                <p className="mt-1 text-lg font-medium uppercase text-gray-700">
                  {scope}
                </p>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="min-h-0 flex-1">{children}</div>
      {signature}
      <footer className="mt-auto pt-3 text-right text-[9px] text-gray-500">
        Página {pageNumber} de {pageCount}
      </footer>
    </article>
  );
}

export function ReportSignature({ showCpfLine }: { showCpfLine: boolean }) {
  return (
    <section className="mt-6 break-inside-avoid pt-4">
      <div className="flex justify-between gap-10 px-4">
        {["Conferente / Responsável", "Gestor de Loja / Auditoria"].map(
          (label) => (
            <div key={label} className="flex-1 text-center">
              <div className="mb-2 h-1 border-b-2 border-black" />
              <p className="text-[10px] font-bold uppercase tracking-wider">
                {label}
              </p>
              {showCpfLine && (
                <p className="mt-4 text-[10px] text-gray-600">
                  CPF: __________________________
                </p>
              )}
            </div>
          ),
        )}
      </div>
      <div className="mt-6 text-center text-[9px] font-medium text-gray-700">
        Relatório gerado via Countifly - Gestão Inteligente de Estoque
      </div>
      <div className="mt-1 text-center text-[9px] text-gray-500">
        Data: {new Date().toLocaleDateString("pt-BR")} às{" "}
        {new Date().toLocaleTimeString("pt-BR")}
      </div>
      <img
        src="/report-logo-footer.png"
        alt="Logo Countifly"
        className="mx-auto mt-3 h-10 object-contain opacity-50"
      />
    </section>
  );
}
