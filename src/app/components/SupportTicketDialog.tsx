import { useRef, useState } from "react";
import { LifeBuoy, Loader2, Paperclip, X, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "../../lib/supabase";

// Kept in sync with CATEGORIES in netlify/functions/create-support-ticket.mjs.
const CATEGORY_OPTIONS = [
  { value: "account", label: "Account & Login" },
  { value: "payment", label: "Payments & Billing" },
  { value: "job_posting", label: "Job Postings" },
  { value: "application", label: "Applications" },
  { value: "technical", label: "Technical Issue" },
  { value: "other", label: "Something else" },
];

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export interface SupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled and locked when the user is signed in; editable for a guest/pre-signin submission. */
  email?: string;
  userId?: string | null;
  userType: "jobseeker" | "recruiter" | "guest";
}

export function SupportTicketDialog({ open, onOpenChange, email: defaultEmail, userId, userType }: SupportTicketDialogProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emailLocked = Boolean(defaultEmail);

  const reset = () => {
    setEmail(defaultEmail || "");
    setCategory("");
    setDescription("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setError("");
    setSuccess(false);
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please attach an image file.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot must be smaller than 5 MB.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!category) {
      setError("Please select what this is about.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please describe the issue in a bit more detail.");
      return;
    }

    setSubmitting(true);
    try {
      const screenshot_base64 = screenshotFile ? await fileToBase64(screenshotFile) : undefined;

      // Signed-in users pass their own access token so the ticket links to
      // their account; a guest (pre-signin) submission has none, and that's fine.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/create-support-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          user_id: userId || null,
          user_type: userType,
          category,
          description: description.trim(),
          screenshot_base64,
          screenshot_filename: screenshotFile?.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to submit ticket" }));
        throw new Error(err.error || "Failed to submit ticket");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        {success ? (
          <div className="py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#3A1F1F]">Ticket submitted</h3>
            <p className="text-sm text-[#8A8A8A] mt-1">
              Our support team will get back to you at <strong>{email}</strong> once it's resolved.
            </p>
            <Button className="mt-5 rounded-full bg-[#FF2B2B] hover:bg-[#e02525]" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#3A1F1F] flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-[#FF2B2B]" /> Raise a Support Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Email address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailLocked}
                  placeholder="you@example.com"
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl disabled:opacity-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">What's this about? *</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#F6F6F6] border-gray-200 rounded-xl">
                    <SelectValue placeholder="Select an issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Describe the issue *</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what happened, what you expected, and any steps to reproduce it..."
                  className="bg-[#F6F6F6] border-gray-200 rounded-xl min-h-[110px]"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#3A1F1F]">Screenshot (optional)</label>
                {screenshotPreview ? (
                  <div className="relative inline-block">
                    <img src={screenshotPreview} alt="Screenshot preview" className="h-24 rounded-lg border border-gray-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                      className="absolute -right-2 -top-2 rounded-full bg-white shadow p-1 text-[#8A8A8A] hover:text-[#FF2B2B]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-[#3A1F1F]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" /> Attach a screenshot
                  </Button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-full bg-[#FF2B2B] hover:bg-[#e02525] text-white"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Ticket
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
