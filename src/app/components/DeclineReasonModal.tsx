import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/**
 * Captures why a candidate is being turned down.
 *
 * Declines used to be a bare status write with nothing recorded, so neither the
 * candidate nor a colleague picking the pipeline up later could tell what the
 * decision was based on. The note is stored on the application and included in
 * the notification the candidate receives.
 *
 * The reason is required rather than optional: an empty note here is the same
 * situation the change was meant to fix.
 */

const MAX_REASON_LENGTH = 500;
const MIN_REASON_LENGTH = 10;

interface DeclineReasonModalProps {
  open: boolean;
  /** Candidate name, for the dialog copy. */
  candidateName?: string | null;
  /** The outcome being applied — drives the wording. */
  outcome: "Not Shortlisted" | "Rejected" | "Interview Rejected" | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void> | void;
  submitting?: boolean;
}

export default function DeclineReasonModal({
  open,
  candidateName,
  outcome,
  onOpenChange,
  onSubmit,
  submitting = false,
}: DeclineReasonModalProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LENGTH;
  const showError = touched && tooShort;

  const heading =
    outcome === "Not Shortlisted" ? "Not shortlisting this candidate" : "Rejecting this candidate";

  const handleSubmit = async () => {
    setTouched(true);
    if (tooShort || submitting) return;
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#3A1F1F]">
            <AlertTriangle className="h-5 w-5 text-[#FF2B2B]" />
            {heading}
          </DialogTitle>
          <DialogDescription>
            {candidateName ? `${candidateName} will be notified.` : "The candidate will be notified."}{" "}
            Add a short note explaining the decision — it is shown to them and kept on the application.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="block text-sm font-medium text-[#3A1F1F] mb-1.5">
            Reason <span className="text-[#FF2B2B]">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
            onBlur={() => setTouched(true)}
            rows={4}
            autoFocus
            placeholder="e.g. Looking for more hands-on experience with distributed systems for this role."
            className={`bg-[#F6F6F6] rounded-xl resize-none ${showError ? "border-[#FF2B2B]" : "border-gray-200"}`}
          />
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs ${showError ? "text-[#FF2B2B]" : "text-transparent"}`}>
              Please give at least {MIN_REASON_LENGTH} characters.
            </span>
            <span className="text-xs text-[#8A8A8A]">
              {trimmed.length}/{MAX_REASON_LENGTH}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full"
            disabled={submitting}
            onClick={() => { void handleSubmit(); }}
          >
            {submitting ? "Saving..." : "Confirm and notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
