import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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
  onSubmit: (message: string, meetingUrl: string, round: "L1" | "L2" | "L3" | "HR Round") => Promise<void>;
  submitting?: boolean;
  initialRound?: "L1" | "L2" | "L3" | "HR Round";
}

const MAX_MESSAGE_LENGTH = 2500;

export default function InterviewDetailsModal({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  initialRound,
}: InterviewDetailsModalProps) {
  const [message, setMessage] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [round, setRound] = useState<"L1" | "L2" | "L3" | "HR Round">(initialRound || "L1");

  const normalizeMeetingUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(withProtocol);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!open) {
      setMessage("");
      setMeetingUrl("");
      if (initialRound) {
        setRound(initialRound);
      } else {
        setRound("L1");
      }
    } else if (initialRound) {
      setRound(initialRound);
    }
  }, [open, initialRound, submitting]);

  const normalizedMeetingUrl = normalizeMeetingUrl(meetingUrl);
  const isMeetingUrlValid = Boolean(normalizedMeetingUrl);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (!isMeetingUrlValid) return;
    await onSubmit(trimmed, normalizedMeetingUrl as string, round);
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
            <label htmlFor="interview-round" className="mb-2 block text-sm font-semibold text-[#3A1F1F]">
              Round
            </label>
            <Select value={round} onValueChange={(value) => setRound(value as "L1" | "L2" | "L3" | "HR Round")}>
              <SelectTrigger id="interview-round" className="rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus:ring-[#FF2B2B]">
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
            <label htmlFor="interview-description" className="mb-2 block text-sm font-semibold text-[#3A1F1F]">
              Description
            </label>
            <Textarea
              id="interview-description"
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

          <div>
            <label htmlFor="interview-meeting-url" className="mb-2 block text-sm font-semibold text-[#3A1F1F]">
              Meeting URL
            </label>
            <Input
              id="interview-meeting-url"
              type="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet.google.com/..."
              className="rounded-xl border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
            />
            {!isMeetingUrlValid && (
              <p className="mt-1 text-xs text-red-600">Meeting URL is required (you can paste with or without `https://`).</p>
            )}
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
              disabled={submitting || !message.trim() || !isMeetingUrlValid}
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
