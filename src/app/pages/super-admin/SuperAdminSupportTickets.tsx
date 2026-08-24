import { useEffect, useState, useCallback, FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Ticket, Inbox, CheckCircle2, Paperclip, Loader2 } from "lucide-react";
import { DataTable, DataTableColumn } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { KpiCard } from "../../components/super-admin/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "../../components/ui/dialog";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface TicketRow {
  id: string;
  subject: string;
  description: string | null;
  requester_email: string | null;
  requester_type: "recruiter" | "jobseeker" | "guest" | "other" | null;
  category: string | null;
  screenshot_path: string | null;
  resolution_summary: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, string> = {
  account: "Account & Login",
  payment: "Payments & Billing",
  job_posting: "Job Postings",
  application: "Applications",
  technical: "Technical Issue",
  other: "Something else",
};

export default function SuperAdminSupportTickets() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Marking a ticket resolved goes through this dialog (and the
  // resolve-support-ticket function) instead of a plain status update — that's
  // what emails the submitter the optional summary.
  const [resolvingTicket, setResolvingTicket] = useState<TicketRow | null>(null);
  const [resolveSummary, setResolveSummary] = useState("");
  const [resolving, setResolving] = useState(false);
  const [loadingScreenshotId, setLoadingScreenshotId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("support_tickets").select("*", { count: "exact" });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as TicketRow[]) ?? []);
    setTotalCount(count ?? 0);

    const [{ count: open }, { count: resolved }] = await Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    ]);
    setOpenCount(open ?? 0);
    setResolvedCount(resolved ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [statusFilter]);

  const updateStatus = async (row: TicketRow, status: TicketRow["status"]) => {
    if (status === "resolved") {
      setResolveSummary("");
      setResolvingTicket(row);
      return;
    }
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update ticket: ${error.message}`);
      return;
    }
    logAdminAction({
      action: "support_ticket.status_change",
      entityType: "support_tickets",
      entityId: row.id,
      beforeValue: { status: row.status },
      afterValue: { status },
    });
    toast.success(`Ticket marked ${status}`);
    fetchRows();
  };

  const handleResolve = async () => {
    if (!resolvingTicket) return;
    setResolving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/resolve-support-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticket_id: resolvingTicket.id, summary: resolveSummary.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to resolve ticket" }));
        throw new Error(err.error || "Failed to resolve ticket");
      }
      logAdminAction({
        action: "support_ticket.status_change",
        entityType: "support_tickets",
        entityId: resolvingTicket.id,
        beforeValue: { status: resolvingTicket.status },
        afterValue: { status: "resolved" },
      });
      toast.success(
        resolvingTicket.requester_email
          ? "Ticket resolved — the submitter has been emailed."
          : "Ticket resolved."
      );
      setResolvingTicket(null);
      fetchRows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve ticket");
    } finally {
      setResolving(false);
    }
  };

  const handleViewScreenshot = async (row: TicketRow) => {
    if (!row.screenshot_path) return;
    setLoadingScreenshotId(row.id);
    try {
      const { data, error } = await supabase.storage
        .from("support-attachments")
        .createSignedUrl(row.screenshot_path, 300);
      if (error || !data?.signedUrl) throw error || new Error("Could not load screenshot");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not load screenshot");
    } finally {
      setLoadingScreenshotId(null);
    }
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    const payload = {
      subject: String(form.get("subject") || ""),
      description: String(form.get("description") || ""),
      requester_email: String(form.get("requester_email") || "") || null,
      requester_type: (form.get("requester_type") as string) || "other",
      priority: (form.get("priority") as string) || "normal",
      category: (form.get("category") as string) || "other",
    };
    const { error } = await supabase.from("support_tickets").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(`Failed to create ticket: ${error.message}`);
      return;
    }
    toast.success("Ticket created");
    setDialogOpen(false);
    fetchRows();
  };

  const columns: DataTableColumn<TicketRow>[] = [
    { key: "subject", header: "Subject" },
    { key: "requester_email", header: "Requester", render: (row) => row.requester_email || "—" },
    {
      key: "category",
      header: "Category",
      render: (row) => (row.category ? <Badge variant="outline">{CATEGORY_LABELS[row.category] || row.category}</Badge> : "—"),
    },
    { key: "priority", header: "Priority", render: (row) => <Badge variant="outline">{row.priority}</Badge> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Select value={row.status} onValueChange={(v) => updateStatus(row, v as TicketRow["status"])}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "screenshot_path",
      header: "Attachment",
      render: (row) =>
        row.screenshot_path ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={loadingScreenshotId === row.id}
            onClick={() => handleViewScreenshot(row)}
          >
            {loadingScreenshotId === row.id ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
            View
          </Button>
        ) : (
          "—"
        ),
    },
    { key: "created_at", header: "Created", render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard index={0} label="Total Tickets" value={totalCount} icon={Ticket} loading={loading} />
        <KpiCard index={1} label="Open" value={openCount} icon={Inbox} loading={loading} />
        <KpiCard index={2} label="Resolved" value={resolvedCount} icon={CheckCircle2} loading={loading} />
      </div>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Log a support ticket</DialogTitle>
                <DialogDescription>
                  For requests that come in outside the app (email, phone) — recruiters and job
                  seekers can also raise one themselves from inside the app or the sign-in page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={4} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="requester_email">Requester email</Label>
                  <Input id="requester_email" name="requester_email" type="email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Requester type</Label>
                    <Select name="requester_type" defaultValue="other">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="jobseeker">Job seeker</SelectItem>
                        <SelectItem value="guest">Guest (pre-signin)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create ticket"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        emptyMessage="No tickets yet."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Open", value: "open" },
              { label: "In progress", value: "in_progress" },
              { label: "Resolved", value: "resolved" },
              { label: "Closed", value: "closed" },
            ],
          },
        ]}
      />

      {/* Resolve dialog — this is what triggers the email to the submitter */}
      <Dialog open={!!resolvingTicket} onOpenChange={(v) => !v && setResolvingTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              {resolvingTicket?.requester_email
                ? `${resolvingTicket.requester_email} will be emailed once this is marked resolved.`
                : "This ticket has no requester email, so no notification will be sent."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="resolve-summary">Summary (optional)</Label>
            <Textarea
              id="resolve-summary"
              value={resolveSummary}
              onChange={(e) => setResolveSummary(e.target.value)}
              placeholder="What was done to resolve this — included in the email if the requester has an address on file."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingTicket(null)} disabled={resolving}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={resolving}>
              {resolving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Resolving…</> : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
