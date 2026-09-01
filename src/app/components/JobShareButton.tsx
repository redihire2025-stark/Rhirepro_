import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

type JobShareButtonProps = {
  jobId: string;
  title: string;
  className?: string;
  disabled?: boolean;
};

export default function JobShareButton({ jobId, title, className = "", disabled = false }: JobShareButtonProps) {
  if (disabled) return null;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/job/${jobId}`;
    return `${window.location.origin}/job/${jobId}`;
  }, [jobId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Job link copied to clipboard!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast.success("Job link copied to clipboard!");
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy link.");
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Share ${title}`}
        title="Share job link"
        onClick={handleShareClick}
        className={`h-9 w-9 rounded-full border-red-100 bg-white text-[#FF2B2B] shadow-sm hover:bg-red-50 hover:text-[#FF2B2B] transition-colors ${
          open ? "bg-red-50 text-[#FF2B2B] ring-2 ring-[#FF2B2B]/20" : ""
        }`}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-red-100 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#3A1F1F]">Share job link</p>
            {copied && <span className="text-[10px] font-semibold text-green-600">Copied!</span>}
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-[#F6F6F6] px-3 py-2 text-xs text-[#3A1F1F] outline-none select-all"
            />
            <Button
              type="button"
              size="icon"
              aria-label="Copy job link"
              onClick={copyLink}
              className="h-9 w-9 rounded-lg bg-[#FF2B2B] text-white hover:bg-[#e02525] shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <p className="mt-2 text-xs text-[#8A8A8A]">
            {copied ? "Copied to clipboard. You can paste it anywhere." : "Copy and share through any app."}
          </p>
        </div>
      )}
    </div>
  );
}
