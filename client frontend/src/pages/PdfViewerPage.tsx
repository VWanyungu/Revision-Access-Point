import { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

// Set up the PDF.js worker - using jsDelivr for better CORS support
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

interface PdfViewerPageProps {
  url: string;
  onBack: () => void;
}

export default function PdfViewerPage({ url, onBack }: PdfViewerPageProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setCurrentPage(1);
  }

  // Handle scroll to detect which page is visible
  const handleScroll = useCallback(() => {
    if (!containerRef.current || numPages === 0) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Find the page that's most visible
    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (pageEl) {
        const pageTop = pageEl.offsetTop - container.offsetTop;
        const pageCenter = pageTop + pageEl.offsetHeight / 2;
        const scrollCenter = scrollTop + containerHeight / 2;

        if (Math.abs(pageCenter - scrollCenter) < pageEl.offsetHeight / 2) {
          if (currentPage !== i + 1) {
            setCurrentPage(i + 1);
          }
          break;
        }
      }
    }
  }, [numPages, currentPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      pageRefs.current[currentPage - 2]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
      pageRefs.current[currentPage]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <>
      {url ? (
        <div className="flex flex-col h-[calc(100vh-5rem)]">
          {/* Custom Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBack}>Back</Button>

              <Button className="hidden md:flex" variant="outline" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="hidden md:block text-sm">
                {currentPage} / {numPages}
              </span>
              <Button className="hidden md:flex" variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="hidden md:block text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 3.0}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={rotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* PDF Viewer - Continuous Scroll */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto bg-muted/10 flex flex-col items-center py-4"
            onScroll={handleScroll}
          >
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-full">
                  <div className="text-destructive">Failed to load PDF</div>
                </div>
              }
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  ref={(el) => { pageRefs.current[index] = el; }}
                  className="mb-4"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    rotate={rotation}
                    className="shadow-lg"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    width={Math.min(scale * 612, containerRef.current?.clientWidth ? containerRef.current.clientWidth - 48 : 800)}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
          <FileText className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">No document selected</p>
          <Button variant="outline" onClick={onBack}>Go Back</Button>
        </div>
      )}
    </>
  );
}
