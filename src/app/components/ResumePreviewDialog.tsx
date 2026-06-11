import { useEffect, useMemo, useState, useRef } from "react";
import { Download, ExternalLink, FileText, Loader2, Maximize2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

// Singleton promise for loading pdfjs — prevents race conditions when multiple dialogs load simultaneously
let _pdfjsDialogLoadPromise: Promise<any> | null = null;
function ensurePdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);
  if (!_pdfjsDialogLoadPromise) {
    _pdfjsDialogLoadPromise = new Promise<any>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.min.js";
      s.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.worker.min.js";
        }
        resolve(lib);
      };
      s.onerror = () => {
        _pdfjsDialogLoadPromise = null;
        reject(new Error("Failed to load pdfjs from CDN"));
      };
      document.head.appendChild(s);
    });
  }
  return _pdfjsDialogLoadPromise;
}
// Start preloading pdfjs immediately
void ensurePdfJs();

type ResumePreviewKind = "pdf" | "office" | "image" | "unsupported";

export function getResumePreviewKind(url: string): ResumePreviewKind {
  const cleanPath = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.split("#")[0].split("?")[0].toLowerCase();
    }
  })();

  if (cleanPath.endsWith(".pdf")) return "pdf";
  if (
    cleanPath.endsWith(".doc") ||
    cleanPath.endsWith(".docx") ||
    cleanPath.endsWith(".xls") ||
    cleanPath.endsWith(".xlsx") ||
    cleanPath.endsWith(".ppt") ||
    cleanPath.endsWith(".pptx") ||
    cleanPath.endsWith(".rtf") ||
    cleanPath.endsWith(".odt")
  ) return "office";
  if (
    cleanPath.endsWith(".png") ||
    cleanPath.endsWith(".jpg") ||
    cleanPath.endsWith(".jpeg") ||
    cleanPath.endsWith(".gif") ||
    cleanPath.endsWith(".webp")
  ) {
    return "image";
  }
  return "unsupported";
}

export function getStorageObjectFromUrl(url: string): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const objectPath = parsed.pathname.slice(markerIndex + marker.length);
    const parts = objectPath.split("/").filter(Boolean);
    if (parts.length < 3) return null;

    const accessPrefix = parts[0];
    if (!["public", "sign", "authenticated"].includes(accessPrefix)) return null;

    const bucket = parts[1];
    const path = decodeURIComponent(parts.slice(2).join("/"));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

export function buildPreviewUrl(url: string): string | null {
  const kind = getResumePreviewKind(url);
  if (kind === "pdf") return url;
  if (kind === "office") return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  if (kind === "image") return url;
  return null;
}

export default function ResumePreviewDialog({
  resume,
  onClose,
}: {
  resume: { url: string; candidateName: string } | null;
  onClose: () => void;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const kind = useMemo(() => resume ? getResumePreviewKind(resume.url) : "unsupported", [resume]);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      setResolvedUrl(null);
      setError("");
      if (!resume?.url) return;

      const storageObject = getStorageObjectFromUrl(resume.url);
      if (!storageObject) {
        setResolvedUrl(resume.url);
        return;
      }

      setLoading(true);
      const { data, error: signedUrlError } = await supabase.storage
        .from(storageObject.bucket)
        .createSignedUrl(storageObject.path, 10 * 60);

      if (cancelled) return;

      if (signedUrlError || !data?.signedUrl) {
        setError(signedUrlError?.message || "Resume file could not be opened.");
        setResolvedUrl(null);
      } else {
        setResolvedUrl(data.signedUrl);
      }
      setLoading(false);
    }

    void resolveUrl();
    return () => { cancelled = true; };
  }, [resume]);

  const previewUrl = resolvedUrl ? buildPreviewUrl(resolvedUrl) : null;
  const downloadUrl = resolvedUrl || resume?.url || "";
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);
  const [pdfRenderFailed, setPdfRenderFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;
    async function renderPdf() {
      if (!previewUrl || kind !== "pdf" || !pdfContainerRef.current) return;
      setPdfRenderFailed(false);
      setRenderingPdf(true);
      try {
        // Fetch PDF data and load pdfjs library in parallel for speed
        const [fetchRes, pdfjs] = await Promise.all([
          fetch(previewUrl),
          ensurePdfJs(),
        ]);
        if (cancelled || !pdfContainerRef.current) return;
        const arrayBuffer = await fetchRes.arrayBuffer();
        if (cancelled || !pdfContainerRef.current) return;
        loadingTask = (pdfjs as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled || !pdfContainerRef.current?.isConnected) return;
        const numPages = pdf.numPages;
        const container = pdfContainerRef.current;
        
        // clear previous using removeChild to avoid stale reference issues
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
        // measure
        const containerStyle = getComputedStyle(container);
        const paddingY = parseFloat(containerStyle.paddingTop || "0") + parseFloat(containerStyle.paddingBottom || "0");
        const paddingX = parseFloat(containerStyle.paddingLeft || "0") + parseFloat(containerStyle.paddingRight || "0");
        const containerWidth = Math.max(100, container.clientWidth - paddingX);
        const containerHeight = Math.max(100, container.clientHeight - paddingY);

        const firstPage = await pdf.getPage(1);
        if (cancelled || !pdfContainerRef.current?.isConnected) return;
        const vp = firstPage.getViewport({ scale: 1 });
        const scaleToFitWidth = containerWidth / vp.width;
        const scaleToFitAllPages = containerHeight / (vp.height * numPages);
        const scale = Math.min(scaleToFitWidth, Math.max(0.3, scaleToFitAllPages));

        // create wrapper for pages so we can scale the whole group to fit without scroll
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "flex-start";
        wrapper.style.width = "100%";
        wrapper.style.transformOrigin = "top left";

        for (let i = 1; i <= numPages; i++) {
          if (cancelled || !pdfContainerRef.current?.isConnected) return;
          const page = await pdf.getPage(i);
          if (cancelled || !pdfContainerRef.current?.isConnected) return;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "mb-3 shadow-sm rounded-sm bg-white";
          const ctx = canvas.getContext("2d");
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled || !pdfContainerRef.current?.isConnected) return;
          wrapper.appendChild(canvas);
        }
        if (pdfContainerRef.current?.isConnected) {
          pdfContainerRef.current.appendChild(wrapper);

          // After pages rendered, ensure the whole wrapper fits the container height by scaling
          const totalHeight = wrapper.scrollHeight;
          if (totalHeight > containerHeight) {
            const scaleAll = containerHeight / totalHeight;
            wrapper.style.transform = `scale(${scaleAll})`;
            // center after scale
            wrapper.style.width = `${containerWidth / scaleAll}px`;
          }
        }
      } catch (err) {
        console.error("PDF render error", err);
        if (!cancelled) setPdfRenderFailed(true);
      } finally {
        if (!cancelled) setRenderingPdf(false);
      }
    }
    void renderPdf();
    return () => {
      cancelled = true;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch (e) {
          console.warn("Failed to destroy PDF loading task:", e);
        }
      }
    };
  }, [previewUrl, kind]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!resume && document.fullscreenElement) {
      document.exitFullscreen().catch(() => null);
    }
  }, [resume]);

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await fullscreenRef.current.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen failed", err);
    }
  };

  return (
    <Dialog open={!!resume} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden">
        <div ref={fullscreenRef} className="bg-[#F6F6F6]">
          <DialogHeader className="px-5 py-4 border-b border-gray-100">
          <DialogTitle className="text-base text-[#3A1F1F]">Resume Preview{resume?.candidateName ? ` - ${resume.candidateName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="bg-[#F6F6F6]">
          {loading ? (
            <div className="h-[45vh] flex flex-col items-center justify-center text-center px-6">
              <Loader2 className="h-9 w-9 text-[#FF2B2B] animate-spin mb-3" />
              <p className="text-sm text-[#5A5A5A]">Preparing resume preview...</p>
            </div>
          ) : previewUrl ? (
            kind === "image" ? (
              <div className="w-full h-[72vh] overflow-hidden flex items-center justify-center bg-white p-4">
                <img
                  src={previewUrl}
                  alt="Resume preview"
                  className="max-w-full max-h-full object-contain shadow-sm rounded-md"
                />
              </div>
            ) : (
              kind === "pdf" ? (
                !pdfRenderFailed ? (
                  <div ref={pdfContainerRef} className="w-full h-[72vh] bg-white p-4 overflow-hidden flex flex-col items-center justify-center">
                    {renderingPdf && (
                      <div className="text-center">
                        <div className="w-9 h-9 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-[#5A5A5A]">Preparing resume preview...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <iframe
                    src={previewUrl}
                    title="Resume preview"
                    className="w-full h-[72vh] bg-white overflow-hidden"
                    style={{ border: "none" }}
                    scrolling="no"
                  />
                )
              ) : kind === "office" ? (
              <iframe
                src={previewUrl}
                title="Resume preview"
                className="w-full h-[72vh] bg-white"
                style={{ border: "none" }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            ) : (
              <iframe
                src={previewUrl}
                title="Resume preview"
                className="w-full h-[72vh] bg-white overflow-hidden"
                style={{ border: "none" }}
                scrolling="no"
              />
            )
            )
          ) : (
            <div className="h-[45vh] flex flex-col items-center justify-center text-center px-6">
              <FileText className="h-10 w-10 text-[#FF2B2B] mb-3" />
              <p className="text-sm font-medium text-[#3A1F1F]">{error || "Preview is not available for this file."}</p>
              <p className="text-xs text-[#8A8A8A] mt-1">Make sure the `resumes` storage bucket exists and the file is still present.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
          {previewUrl && (
            <Button variant="outline" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-[#3A1F1F] text-sm hover:bg-[#F6F6F6] transition-colors" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
              {isFullscreen ? "Exit Full Screen" : "View Full Screen"}
            </Button>
          )}
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF2B2B] text-white text-sm rounded-full hover:bg-[#e02525] transition-colors">
              <Download className="h-4 w-4" /> Download Resume
            </a>
          )}
          {kind === "office" && downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-[#3A1F1F] text-sm rounded-full hover:bg-[#F6F6F6] transition-colors">
              <ExternalLink className="h-4 w-4" /> Open File
            </a>
          )}
          {kind === "unsupported" && downloadUrl && (
            <Button variant="outline" className="rounded-full" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
