import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface InterviewFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (round: "L1" | "L2" | "L3" | "HR Round", feedback: string, nextRoundDiscussion: string) => Promise<void>;
  submitting?: boolean;
  initialRound?: "L1" | "L2" | "L3" | "HR Round";
}

export default function InterviewFeedbackModal({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  initialRound = "L1",
}: InterviewFeedbackModalProps) {
  const [round, setRound] = useState<"L1" | "L2" | "L3" | "HR Round">(initialRound);
  const [feedback, setFeedback] = useState("");
  const [nextRoundDiscussion, setNextRoundDiscussion] = useState("");

  useEffect(() => {
    if (!open) {
      setFeedback("");
      setNextRoundDiscussion("");
      return;
    }
    setRound(initialRound);
  }, [initialRound, open]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    await onSubmit(round, feedback.trim(), nextRoundDiscussion.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-xl">
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add Interview Feedback</DialogTitle>
            <DialogDescription className="text-white/80">
              Add round-wise feedback and notes for next-round discussion.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 px-6 pb-6 pt-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3A1F1F]">Round</label>
            <Select value={round} onValueChange={(value) => setRound(value as "L1" | "L2" | "L3" | "HR Round")}>
              <SelectTrigger className="rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus:ring-[#FF2B2B]">
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L1">L1</SelectItem>
                <SelectItem value="L2">L2</SelectItem>
                <SelectItem value="L3">L3</SelectItem>
                <SelectItem value="HR Round">HR Round</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3A1F1F]">Feedback</label>
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Add interview feedback for this round..."
              className="min-h-28 resize-y rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#3A1F1F]">Next-Round Discussion</label>
            <Textarea
              value={nextRoundDiscussion}
              onChange={(event) => setNextRoundDiscussion(event.target.value)}
              placeholder="Add points for the next round discussion (optional)..."
              className="min-h-24 resize-y rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
            />
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
              onClick={handleSubmit}
              disabled={submitting || !feedback.trim()}
              className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
            >
              {submitting ? "Saving..." : "Save Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

