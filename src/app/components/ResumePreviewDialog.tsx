import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

type ResumePreviewKind = "pdf" | "office" | "unsupported";

function getResumePreviewKind(url: string): ResumePreviewKind {
  const cleanPath = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.split("?")[0].toLowerCase();
    }
  })();

  if (cleanPath.endsWith(".pdf")) return "pdf";
  if (cleanPath.endsWith(".doc") || cleanPath.endsWith(".docx")) return "office";
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

function buildPreviewUrl(url: string): string | null {
  const kind = getResumePreviewKind(url);
  if (kind === "pdf") return url;
  if (kind === "office") return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
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

  return (
    <Dialog open={!!resume} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden">
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
            <iframe
              src={previewUrl}
              title="Resume preview"
              className="w-full h-[72vh] bg-white"
            />
          ) : (
            <div className="h-[45vh] flex flex-col items-center justify-center text-center px-6">
              <FileText className="h-10 w-10 text-[#FF2B2B] mb-3" />
              <p className="text-sm font-medium text-[#3A1F1F]">{error || "Preview is not available for this file."}</p>
              <p className="text-xs text-[#8A8A8A] mt-1">Make sure the `resumes` storage bucket exists and the file is still present.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
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
      </DialogContent>
    </Dialog>
  );
}
