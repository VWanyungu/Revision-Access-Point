import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ArrowLeft, CaretDown, CaretUp, DownloadSimple, ListChecks, Minus, Plus } from "@phosphor-icons/react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { InkButton, QuietButton } from "@/components/pay/PayKit";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerPageProps {
  url: string;
  title?: string;
  onBack: () => void;
  onModelAnswers?: () => void;
}

const BASE_WIDTH = 720;
const iconBtn =
  "flex size-10 items-center justify-center rounded-full bg-field text-ink transition-[transform,background-color,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-field-strong active:scale-95 disabled:opacity-40 disabled:pointer-events-none";

/** Renders its page only once it is near the screen, so a long paper opens fast. */
const LazyPage = ({ index, width, rotation, onVisible, register }: {
  index: number; width: number; rotation: number;
  onVisible: (page: number) => void; register: (i: number, el: HTMLDivElement | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(index === 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(index, el);
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "1200px 0px" });
    const midObs = new IntersectionObserver(([e]) => e.isIntersecting && onVisible(index + 1), { rootMargin: "-45% 0px -45% 0px" });
    nearObs.observe(el); midObs.observe(el);
    return () => { nearObs.disconnect(); midObs.disconnect(); register(index, null); };
  }, [index, onVisible, register]);

  return (
    <div
      ref={ref}
      style={{ width, minHeight: near ? undefined : width * 1.3 }}
      className="mb-4 max-w-full scroll-mt-44 overflow-hidden border border-line bg-white"
    >
      {near ? (
        <Page pageNumber={index + 1} width={width} rotate={rotation} renderTextLayer renderAnnotationLayer
          loading={<div style={{ height: width * 1.3 }} className="animate-pulse" />} />
      ) : (
        <div className="flex flex-col gap-3 p-10" aria-hidden>
          {[40, 100, 90, 100, 60, 95].map((w, i) => (
            <div key={i} style={{ width: `${w}%` }} className="h-2.5 rounded-full bg-field" />
          ))}
        </div>
      )}
    </div>
  );
};

export default function PdfViewerPage({ url, title, onBack, onModelAnswers }: PdfViewerPageProps) {
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [scale, setScale] = useState(1);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const register = useRef((i: number, el: HTMLDivElement | null) => { pageEls.current[i] = el; }).current;
  const [vw, setVw] = useState(typeof window === "undefined" ? 1024 : window.innerWidth);

  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // 100% is a comfortable 720px on desktop and the full width (minus gutters) on phones.
  const width = Math.round(Math.min(BASE_WIDTH, vw - 32) * scale);
  const goTo = (n: number) => pageEls.current[n - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const heading = title || "Paper";

  if (!url) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center gap-4 px-5 font-geist">
        <h1 className="font-literata text-xl">No paper selected</h1>
        <p className="text-base text-ink-muted">Pick a paper from your unit and it will open here.</p>
        <QuietButton tone="soft" onClick={onBack}>Back to resources</QuietButton>
      </div>
    );
  }

  const pager = (
    <div className="flex items-center gap-2">
      <button className={iconBtn} aria-label="Previous page" disabled={current <= 1} onClick={() => goTo(current - 1)}><CaretUp size={18} /></button>
      <span className="min-w-[3.5rem] text-center font-geist-mono text-sm tabular-nums">{current} / {numPages || "–"}</span>
      <button className={iconBtn} aria-label="Next page" disabled={current >= numPages} onClick={() => goTo(current + 1)}><CaretDown size={18} /></button>
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-field pb-28 font-geist text-ink md:pb-16">
      {/* Floating bar: same width and styling as the main navbar, 12px beneath it. The wrapper ignores the pointer so only the pill is clickable. */}
      <div className="pointer-events-none sticky top-[72px] z-40 px-3 pt-3 md:top-[76px] md:px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-1 rounded-full bg-surface/85 p-1.5 text-ink shadow-[0_8px_30px_-14px_rgba(14,21,37,0.18)] ring-1 ring-line backdrop-blur-xl">
          <button onClick={onBack} aria-label="Back" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-field"><ArrowLeft size={18} /></button>
          <p className="min-w-0 flex-1 truncate px-1 text-base font-medium">
            {heading} <span className="ml-1 hidden font-geist-mono text-sm font-normal text-ink-muted lg:inline">{numPages} pages</span>
          </p>
          <div className="hidden items-center gap-1 md:flex [&_button]:!size-9">
            {pager}
            <span className="mx-1 h-5 w-px bg-line" />
            <button className={iconBtn} aria-label="Zoom out" disabled={scale <= 0.5} onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}><Minus size={16} /></button>
            <span className="min-w-[2.75rem] text-center font-geist-mono text-sm tabular-nums">{Math.round(scale * 100)}%</span>
            <button className={iconBtn} aria-label="Zoom in" disabled={scale >= 2} onClick={() => setScale((s) => Math.min(2, +(s + 0.25).toFixed(2)))}><Plus size={16} /></button>
          </div>
          <a className={`${iconBtn} !size-9`} href={url} target="_blank" rel="noreferrer" aria-label="Download"><DownloadSimple size={18} /></a>
          {onModelAnswers && (
            <button onClick={onModelAnswers} className="hidden h-9 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-ink-fg transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink-hover active:scale-[0.98] md:flex">
              <ListChecks size={16} /> Model answers
            </button>
          )}
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col items-center px-4 pt-6 md:pt-10">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => { setNumPages(n); setCurrent(1); }}
          loading={<p className="py-20 text-sm text-ink-muted" role="status">Opening the paper…</p>}
          error={<p className="py-20 text-base text-danger" role="alert">We couldn’t open this paper. Try again, or use Download.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <LazyPage key={i} index={i} width={width} rotation={0} onVisible={setCurrent} register={register} />
          ))}
        </Document>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-surface px-5 pb-6 pt-4 md:hidden">
        {pager}
        {onModelAnswers && <InkButton className="ml-auto" onClick={onModelAnswers}><ListChecks size={18} /> Model answers</InkButton>}
      </div>
    </div>
  );
}
