import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { sendRecruiterCandidateEmail } from "../../lib/email";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Copy,
  Check,
  Building2,
  Loader2,
  ExternalLink,
} from "lucide-react";

export interface DirectMessageCandidate {
  id?: string;
  name?: string;
  email?: string;
  headline?: string;
  avatar_url?: string;
}

interface RecruiterDirectMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: DirectMessageCandidate | null;
  onSuccess?: () => void;
}

export default function RecruiterDirectMessageModal({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: RecruiterDirectMessageModalProps) {
  const { recruiterProfile } = useAuth();
  const [resolvedEmail, setResolvedEmail] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [fetchingEmail, setFetchingEmail] = useState(false);

  useEffect(() => {
    if (!open || !candidate) {
      setResolvedEmail("");
      setSubject("");
      setBody("");
      setCopiedEmail(false);
      return;
    }

    const companyName =
      recruiterProfile?.company_name ||
      recruiterProfile?.recruiter_name ||
      "our company";
    const recruiterName =
      recruiterProfile?.recruiter_name || "The Hiring Team";

    const candidateFirstName =
      candidate.name?.split(" ")[0]?.trim() || "there";

    setSubject(`Job Opportunity at ${companyName}`);
    setBody(
      `Hi ${candidateFirstName},\n\n` +
        `I came across your profile on RhirePro and was very impressed by your experience and background. ` +
        `We currently have an exciting opportunity at ${companyName} that aligns well with your skill set.\n\n` +
        `We would love to connect with you to discuss this opportunity in more detail.\n\n` +
        `Best regards,\n` +
        `${recruiterName}\n` +
        `${companyName}`
    );

    // Resolve email
    let currentEmail = candidate.email?.trim() || "";
    if (currentEmail && !currentEmail.endsWith("@candidate.recruiter")) {
      setResolvedEmail(currentEmail);
    } else if (candidate.id) {
      setFetchingEmail(true);
      void supabase
        .from("profiles")
        .select("email")
        .eq("id", candidate.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.email) {
            setResolvedEmail(data.email.trim());
          }
        })
        .finally(() => {
          setFetchingEmail(false);
        });
    }
  }, [open, candidate, recruiterProfile]);

  const handleCopyEmail = () => {
    if (!resolvedEmail) return;
    navigator.clipboard.writeText(resolvedEmail).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success(`Copied ${resolvedEmail} to clipboard`);
    });
  };

  const handleNativeMailto = () => {
    if (!resolvedEmail) return;
    window.location.href = `mailto:${encodeURIComponent(
      resolvedEmail
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendMessage = async () => {
    if (!candidate) return;

    const emailToSend = resolvedEmail.trim();
    if (!emailToSend || !emailToSend.includes("@")) {
      toast.error("Candidate email is required to send a direct message.");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject line.");
      return;
    }

    if (!body.trim()) {
      toast.error("Please enter a message body.");
      return;
    }

    setSending(true);

    try {
      // 1. Send via RhirePro email service (Resend / backend server)
      await sendRecruiterCandidateEmail({
        recipients: [
          {
            id: candidate.id,
            email: emailToSend,
            name: candidate.name || "Candidate",
            subject: subject.trim(),
            body: body.trim(),
          },
        ],
        subject: subject.trim(),
        body: body.trim(),
        templateName: "Recruiter Direct Message",
      });

      // 2. Insert candidate in-app notification
      if (candidate.id && recruiterProfile?.id) {
        try {
          await supabase.from("notifications").insert({
            user_id: candidate.id,
            user_type: "jobseeker",
            type: "message",
            title: subject.trim(),
            message: body.trim().slice(0, 150) + "...",
            related_id: recruiterProfile.id,
            is_read: false,
          });
        } catch (notifErr) {
          console.warn("Notification insert fallback:", notifErr);
        }
      }

      toast.success(`Message sent directly to ${candidate.name || emailToSend}!`, {
        description: `Candidate will receive the email with reply-to directed to ${
          recruiterProfile?.email || "your recruiter account"
        }.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to send direct message:", err);
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const candidateInitials =
    candidate?.name
      ?.split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 bg-white rounded-3xl shadow-2xl border border-gray-100">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-[#3A1F1F] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-50 text-[#FF2B2B] flex items-center justify-center">
                <Mail className="h-4 w-4" />
              </span>
              Message Candidate
            </DialogTitle>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5"
            >
              Direct Delivery
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sender & Recruiter Context Card */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-xs text-[#5A5A5A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-100 text-[#FF2B2B] flex items-center justify-center font-bold text-[10px]">
                <Building2 className="h-3 w-3" />
              </span>
              <span>
                Sending from:{" "}
                <strong className="text-[#3A1F1F]">
                  {recruiterProfile?.company_name ||
                    recruiterProfile?.recruiter_name ||
                    "Your Company"}
                </strong>
                {recruiterProfile?.email && (
                  <span className="text-[#8A8A8A]"> ({recruiterProfile.email})</span>
                )}
              </span>
            </div>
            <span className="text-[11px] text-[#8A8A8A]">
              Replies land in your recruiter inbox
            </span>
          </div>

          {/* Candidate Recipient Pill */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#FF2B2B] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {candidate?.avatar_url ? (
                  <img
                    src={candidate.avatar_url}
                    alt={candidate.name || "Candidate"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  candidateInitials
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#3A1F1F] truncate">
                    {candidate?.name || "Candidate"}
                  </h4>
                  {candidate?.headline && (
                    <span className="text-xs text-[#8A8A8A] truncate hidden sm:inline">
                      • {candidate.headline}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#5A5A5A] truncate">
                  {fetchingEmail ? (
                    <span className="inline-flex items-center gap-1 text-[#8A8A8A]">
                      <Loader2 className="h-3 w-3 animate-spin" /> Resolving email...
                    </span>
                  ) : resolvedEmail ? (
                    <span className="text-[#3A1F1F] font-medium">{resolvedEmail}</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Email not on profile</span>
                  )}
                </div>
              </div>
            </div>

            {resolvedEmail && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyEmail}
                className="h-8 text-xs text-[#5A5A5A] hover:text-[#3A1F1F] hover:bg-gray-100 rounded-xl shrink-0"
                title="Copy candidate email address"
              >
                {copiedEmail ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Email
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label className="text-xs font-semibold text-[#3A1F1F] mb-1.5 block">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Job Opportunity at Our Company"
              className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm h-10"
            />
          </div>

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#3A1F1F]">
                Message Body
              </label>
              <span className="text-[11px] text-[#8A8A8A]">
                Candidate receives RhirePro branded message
              </span>
            </div>
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message to the candidate here..."
              className="bg-[#F6F6F6] border-gray-200 rounded-xl text-sm leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-gray-100">
          <div>
            {resolvedEmail && (
              <button
                type="button"
                onClick={handleNativeMailto}
                className="text-xs text-[#8A8A8A] hover:text-[#3A1F1F] underline flex items-center gap-1 cursor-pointer transition-colors"
                title="Or open in your desktop email app"
              >
                <ExternalLink className="h-3 w-3" /> Or open in desktop mail app
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
              className="rounded-full text-xs h-9 border-gray-200 text-[#5A5A5A] hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={sending || fetchingEmail || !resolvedEmail}
              className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full text-xs h-9 px-5 flex items-center gap-2 shadow-sm font-semibold transition-transform active:scale-95"
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
