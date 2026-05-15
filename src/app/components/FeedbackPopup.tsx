import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Send, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type FeedbackUserType = "guest" | "jobseeker" | "recruiter";

const FIRST_POPUP_DELAY_MS = 20 * 60 * 1000;
const SECOND_POPUP_DELAY_MS = 20 * 60 * 1000;
const REPEAT_POPUP_DELAY_MS = 60 * 60 * 1000;

interface FeedbackPopupProps {
  userId?: string | null;
  userType: FeedbackUserType;
  userEmail?: string | null;
  autoOpenKey: string;
}

export default function FeedbackPopup({
  userId,
  userType,
  userEmail,
  autoOpenKey,
}: FeedbackPopupProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const reopenTimerRef = useRef<number | null>(null);

  const isSignedIn = Boolean(userId) && userType !== "guest";
  const activeRating = hoveredRating || rating;
  const submittedStorageKey = `rhirepro-feedback-submitted-${autoOpenKey}-${userId || userType}`;
  const dismissedCountStorageKey = `rhirepro-feedback-dismissed-count-${autoOpenKey}-${userId || userType}`;

  const prompt = useMemo(() => {
    if (userType === "recruiter") {
      return "How was your hiring experience with RhirePro?";
    }
    if (userType === "jobseeker") {
      return "How was your job search experience with RhirePro?";
    }
    return "Tell us how RhirePro felt today.";
  }, [userType]);

  const clearReopenTimer = () => {
    if (reopenTimerRef.current) {
      window.clearTimeout(reopenTimerRef.current);
      reopenTimerRef.current = null;
    }
  };

  const hasSubmittedFeedback = () => localStorage.getItem(submittedStorageKey) === "true";
  const getDismissedCount = () => Number(localStorage.getItem(dismissedCountStorageKey) || "0");

  const getNextDelay = () => {
    const dismissedCount = getDismissedCount();
    if (dismissedCount === 0) return FIRST_POPUP_DELAY_MS;
    if (dismissedCount === 1) return SECOND_POPUP_DELAY_MS;
    return REPEAT_POPUP_DELAY_MS;
  };

  const schedulePopup = (delay: number) => {
    clearReopenTimer();
    if (hasSubmittedFeedback()) return;

    reopenTimerRef.current = window.setTimeout(() => {
      if (!hasSubmittedFeedback()) {
        setOpen(true);
      }
    }, delay);
  };

  useEffect(() => {
    schedulePopup(getNextDelay());
    return clearReopenTimer;
  }, [submittedStorageKey, dismissedCountStorageKey]);

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setStatus("idle");
    setMessage("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      clearReopenTimer();
      return;
    }
    if (!nextOpen && status === "success") {
      resetForm();
      return;
    }
    const nextDismissedCount = getDismissedCount() + 1;
    localStorage.setItem(dismissedCountStorageKey, String(nextDismissedCount));
    schedulePopup(getNextDelay());
  };

  const handleSubmit = async () => {
    if (!isSignedIn) {
      navigate("/signin?redirect=feedback");
      return;
    }

    if (rating === 0) {
      setStatus("error");
      setMessage("Please choose a star rating before sending feedback.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const { error } = await supabase
      .from("feedback")
      .upsert(
        {
          user_id: userId,
          user_type: userType,
          user_email: userEmail || null,
          rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      setStatus("error");
      setMessage("We could not send your feedback right now. Please try again.");
      return;
    }

    setStatus("success");
    setMessage("Thank you. Your feedback helps us improve RhirePro.");
    localStorage.setItem(submittedStorageKey, "true");
    localStorage.removeItem(dismissedCountStorageKey);
    clearReopenTimer();
    window.setTimeout(() => setOpen(false), 1200);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl bg-white p-0 shadow-2xl [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:text-white [&>button]:focus:ring-white/60 [&>button]:focus:ring-offset-0">
          <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-t-2xl px-6 py-5 relative">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Share your feedback
              </DialogTitle>
              <DialogDescription className="text-white/75">
                {prompt}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5">
            {!isSignedIn && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#3A1F1F]">
                Please sign in before sending a rating or comment.
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-semibold text-[#3A1F1F]">Your rating</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
                  >
                    <Star
                      className={`h-8 w-8 ${value <= activeRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-comment" className="mb-2 block text-sm font-semibold text-[#3A1F1F]">
                Comments
              </label>
              <Textarea
                id="feedback-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Write what worked well or what we should improve..."
                className="min-h-28 resize-none rounded-lg border-gray-200 bg-[#F6F6F6] text-[#3A1F1F] focus-visible:ring-[#FF2B2B]"
                maxLength={600}
              />
              <p className="mt-1 text-right text-xs text-[#8A8A8A]">{comment.length}/600</p>
            </div>

            {message && (
              <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
                {message}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-full border-gray-200 text-[#3A1F1F]"
              >
                Maybe later
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="rounded-full bg-[#FF2B2B] text-white hover:bg-[#e02525]"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSignedIn ? "Send feedback" : "Sign in to send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
