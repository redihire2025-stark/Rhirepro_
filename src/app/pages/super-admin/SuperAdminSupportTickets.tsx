import { useEffect, useState, useCallback, FormEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DataTable, DataTableColumn } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
  requester_type: "recruiter" | "jobseeker" | "other" | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

const PAGE_SIZE = 15;
const STATUS_BADGE: Record<TicketRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

export default function SuperAdminSupportTickets() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [statusFilter]);

  const updateStatus = async (row: TicketRow, status: TicketRow["status"]) => {
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
    { key: "created_at", header: "Created", render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
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
                  For requests that come in outside the app (email, phone) — no public intake form exists yet.
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
    </div>
  );
}
