import { useEffect, useState } from "react";
import { Building2, Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";
import { sendNewsletterBroadcast } from "../../../lib/newsletterBroadcast";

interface OrgAdminRow {
  id: string;
  email: string;
  recruiter_name: string | null;
  company_name: string | null;
  member_count: number;
}

export default function SuperAdminOrgAdmins() {
  const [rows, setRows] = useState<OrgAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // A separate, operational-update composer — deliberately not folded into
  // the Newsletter page. These are recruiter-side notices (seat limits,
  // plan changes, platform updates for team owners), not marketing content,
  // so they shouldn't share a page — or an audience — with newsletter
  // broadcasts to subscribers.
  const [composerTarget, setComposerTarget] = useState<OrgAdminRow | "all" | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "idle"; message: string }>({ type: "idle", message: "" });

  useEffect(() => {
    supabase.rpc("get_super_admin_org_admins").then(({ data, error }) => {
      if (error) console.warn("get_super_admin_org_admins:", error.message);
      setRows((data as OrgAdminRow[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      r.email.toLowerCase().includes(term) ||
      r.recruiter_name?.toLowerCase().includes(term) ||
      r.company_name?.toLowerCase().includes(term)
    );
  });

  const withTeams = rows.filter((r) => r.member_count > 0).length;

  const openComposer = (target: OrgAdminRow | "all") => {
    setComposerTarget(target);
    setSubject("");
    setMessage("");
    setFeedback({ type: "idle", message: "" });
  };

  const closeComposer = () => setComposerTarget(null);

  const handleSend = async () => {
    if (!composerTarget) return;
    if (!subject.trim()) {
      setFeedback({ type: "error", message: "Please enter a subject line." });
      return;
    }
    if (!message.trim()) {
      setFeedback({ type: "error", message: "Please write a message." });
      return;
    }

    const recipients = composerTarget === "all" ? rows.map((r) => r.email) : [composerTarget.email];
    if (recipients.length === 0) {
      setFeedback({ type: "error", message: "No organisation admins to send to." });
      return;
    }

    setSending(true);
    const contentHtml = message
      .trim()
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    const result = await sendNewsletterBroadcast({
      subject: subject.trim(),
      contentHtml,
      recipients,
      audienceLabel: "org admin",
    });
    setSending(false);

    if (result.success) {
      setFeedback({ type: "success", message: result.message });
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  const columns: DataTableColumn<OrgAdminRow>[] = [
    {
      key: "recruiter_name",
      header: "Admin",
      render: (row) => (
        <div>
          <p className="font-medium">{row.recruiter_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "company_name",
      header: "Company",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5 text-muted-foreground" />
          {row.company_name || "—"}
        </div>
      ),
    },
    {
      key: "member_count",
      header: "Team Size",
      render: (row) =>
        row.member_count > 0 ? (
          <Badge variant="secondary">{row.member_count} member{row.member_count === 1 ? "" : "s"}</Badge>
        ) : (
          <span className="text-muted-foreground">No members yet</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every recruiter who manages a team. Message all of them at once, or just one —
          for operational updates (seat limits, plan changes, platform notices), not marketing.
        </p>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => openComposer("all")} disabled={rows.length === 0}>
          <Send className="size-3.5" /> Message All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Organisation Admins" value={rows.length} icon={Building2} loading={loading} />
        <KpiCard index={1} label="With Team Members" value={withTeams} icon={Building2} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        loading={loading}
        page={1}
        pageSize={filtered.length || 1}
        totalCount={filtered.length}
        onPageChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or company..."
        emptyMessage="No organisation admins found."
        rowActions={(row) => (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openComposer(row)}>
            <Mail className="size-3.5" /> Email
          </Button>
        )}
        onExportCsv={() =>
          exportRowsAsCsv(
            "organisation-admins",
            [
              { key: "email", header: "Email" },
              { key: "recruiter_name", header: "Name" },
              { key: "company_name", header: "Company" },
              { key: "member_count", header: "Team Size" },
            ],
            filtered
          )
        }
      />

      <Dialog open={!!composerTarget} onOpenChange={(open) => !open && closeComposer()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {composerTarget === "all"
                ? `Message All Organisation Admins (${rows.length})`
                : composerTarget
                  ? `Message ${composerTarget.recruiter_name || composerTarget.email}`
                  : ""}
            </DialogTitle>
            <DialogDescription>
              Sent as a plain operational email, not a newsletter template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Your team's seat limit is changing" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} placeholder="Write your update..." />
            </div>
            {feedback.message && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {feedback.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={closeComposer} disabled={sending}>
              Close
            </Button>
            <Button className="flex-1 gap-1.5" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
