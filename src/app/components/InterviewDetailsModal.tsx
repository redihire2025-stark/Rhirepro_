import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface InterviewDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => Promise<void>;
  submitting?: boolean;
}

const MAX_MESSAGE_LENGTH = 2500;

export default function InterviewDetailsModal({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
}: InterviewDetailsModalProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setMessage("");
    }
  }, [open]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-2xl">
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Send Interview Details
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Share interview instructions, meeting details, or any important information with the candidate.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          <div>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write interview details, meeting link, instructions, or any message for the candidate..."
              maxLength={MAX_MESSAGE_LENGTH}
              className="min-h-44 resize-y rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
            />
            <p className="mt-1 text-right text-xs text-[#8A8A8A]">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
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
              onClick={handleSend}
              disabled={submitting || !message.trim()}
              className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
            >
              {submitting ? "Sending..." : "Send Details"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
