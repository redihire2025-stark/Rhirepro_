import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface OfferDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string, offerLetterFile: File) => Promise<void>;
  submitting?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = [".pdf", ".doc", ".docx"];

export default function OfferDetailsModal({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
}: OfferDetailsModalProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSelectedFile(null);
      setFileError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const validateAndSelectFile = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const extensionAllowed = ALLOWED_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!extensionAllowed) {
      setFileError("Please upload a PDF, DOC, or DOCX file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("Offer letter must be 5MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setFileError("");
    setSelectedFile(file);
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleSendOffer = async () => {
    const trimmed = message.trim();
    if (!trimmed || !selectedFile) return;
    await onSubmit(trimmed, selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-2xl">
        <div className="rounded-t-2xl bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Send Offer Letter
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Upload the offer letter and share a short note with the candidate.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          <div>
            <label htmlFor="offer-message" className="mb-2 block text-sm font-semibold text-[#3A1F1F]">
              Offer message
            </label>
            <Input
              id="offer-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Enter offer details or message for candidate..."
              className="rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
              disabled={submitting}
            />
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => validateAndSelectFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex flex-col items-center text-center">
              <Upload className="mb-3 h-10 w-10 text-gray-500" />
              <p className="text-base font-semibold text-[#3A1F1F]">Upload offer letter</p>
              <p className="mt-1 text-sm text-[#8A8A8A]">PDF, DOC, or DOCX · Max 5MB</p>
              <Button
                type="button"
                onClick={handleChooseFileClick}
                className="mt-4 rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
                disabled={submitting}
              >
                Choose File
              </Button>
            </div>
            {selectedFile && (
              <p className="mt-3 text-sm font-medium text-[#3A1F1F]">
                Selected file: <span className="text-[#FF2B2B]">{selectedFile.name}</span>
              </p>
            )}
            {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-full border-gray-200 text-[#3A1F1F]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendOffer}
              disabled={submitting || !message.trim() || !selectedFile}
              className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
            >
              {submitting ? "Sending..." : "Send Offer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
