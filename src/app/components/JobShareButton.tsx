import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui/button";

type JobShareButtonProps = {
  jobId: string;
  title: string;
  className?: string;
};

export default function JobShareButton({ jobId, title, className = "relative" }: JobShareButtonProps) {
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
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
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
    <div ref={containerRef} className={className} onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Share ${title}`}
        title="Share job"
        onClick={() => setOpen((value) => !value)}
        className="h-9 w-9 rounded-full border-red-100 bg-white text-[#FF2B2B] shadow-sm hover:bg-red-50 hover:text-[#FF2B2B]"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-red-100 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-[#3A1F1F]">Share job link</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-[#F6F6F6] px-3 py-2 text-xs text-[#3A1F1F] outline-none"
            />
            <Button
              type="button"
              size="icon"
              aria-label="Copy job link"
              onClick={copyLink}
              className="h-9 w-9 rounded-lg bg-[#FF2B2B] text-white hover:bg-[#e02525]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[#8A8A8A]">
            {copied ? "Copied. You can paste it anywhere." : "Copy and share through WhatsApp, email, or any app."}
          </p>
        </div>
      )}
    </div>
  );
}
