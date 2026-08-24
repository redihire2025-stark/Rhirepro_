import { useState } from "react";
import { useNavigate } from "react-router";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

export function DeleteAccountCard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const closeDialog = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setError("");
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/delete-own-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete account" }));
        throw new Error(err.error || "Failed to delete account");
      }
      await signOut();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-red-100">
      <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2 mb-1">
        <AlertTriangle className="h-5 w-5" /> Danger Zone
      </h3>
      <p className="text-sm text-[#8A8A8A] mb-4">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <Button
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white rounded-full"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" /> Delete Account
      </Button>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3A1F1F] flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" /> Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-[#8A8A8A]">
              This permanently deletes your account and all of your data — profile, applications,
              and job postings included. This cannot be undone.
            </p>
            <div>
              <label className="block text-sm text-[#3A1F1F] mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="rounded-xl"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => closeDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              onClick={handleDelete}
              disabled={loading || confirmText !== "DELETE"}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete My Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
