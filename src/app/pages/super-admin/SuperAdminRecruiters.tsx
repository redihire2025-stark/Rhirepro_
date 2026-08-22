import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, MoreHorizontal, ShieldCheck, ShieldX } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface RecruiterRow {
  id: string;
  email: string;
  recruiter_name: string | null;
  company_name: string | null;
  industry: string | null;
  is_disabled: boolean;
  verification_status: string | null;
  rejection_reason: string | null;
  org_role: string | null;
  created_at: string;
  last_login_at: string | null;
  recruiter_subscriptions: { status: string; plan_id: string; expires_at: string }[] | null;
}

const PAGE_SIZE = 15;

export default function SuperAdminRecruiters() {
  const [rows, setRows] = useState<RecruiterRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<RecruiterRow | null>(null);

  /**
   * Email the recruiter about an account decision. The endpoint requires the
   * caller's Supabase access token and verifies it belongs to an active super
   * admin, and it resolves the recipient from recruiter_profiles by id — the
   * address is never taken from the browser.
   *
   * Returns whether the mail went out. Never throws: the decision itself has
   * already been written, so a mail failure must be reported, not rolled back.
   */
  const sendStatusEmail = async (recruiterId: string, action: string, reason?: string | null) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return false;

      const res = await fetch("/api/recruiter-status-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recruiter_id: recruiterId, action, reason: reason ?? null }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        console.warn("Status email failed:", detail);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Status email failed:", err);
      return false;
    }
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    // Reads through the SECURITY DEFINER function because `authenticated` no
    // longer holds SELECT on recruiter_profiles.email. It returns SETOF
    // recruiter_profiles, so the embed and filters below still resolve.
    let query = supabase
      .rpc("admin_recruiter_profiles", {}, { count: "exact" })
      .select(
        "id,email,recruiter_name,company_name,industry,is_disabled,verification_status,rejection_reason,org_role,created_at,last_login_at,recruiter_subscriptions(status,plan_id,expires_at)"
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`email.ilike.${term},recruiter_name.ilike.${term},company_name.ilike.${term}`);
    }
    if (statusFilter === "active") query = query.eq("is_disabled", false);
    if (statusFilter === "disabled") query = query.eq("is_disabled", true);
    if (statusFilter === "pending") query = query.eq("verification_status", "Pending");
    if (statusFilter === "verified") query = query.eq("verification_status", "Verified");
    if (statusFilter === "rejected") query = query.eq("verification_status", "Rejected");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as RecruiterRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const toggleDisabled = async (row: RecruiterRow) => {
    const disabling = !row.is_disabled;
    let reason: string | null = null;
    if (disabling) {
      const entered = window.prompt(
        `Disable ${row.recruiter_name || row.email}?

Optionally add a reason — it is included in the email they receive:`,
        "",
      );
      if (entered === null) return; // cancelled
      reason = entered.trim() || null;
    }

    const { error } = await supabase
      .from("recruiter_profiles")
      .update({ is_disabled: disabling })
      .eq("id", row.id);
    if (error) {
      toast.error(`Failed to update recruiter: ${error.message}`);
      return;
    }
    logAdminAction({
      action: row.is_disabled ? "recruiter.enable" : "recruiter.disable",
      entityType: "recruiter_profiles",
      entityId: row.id,
      beforeValue: { is_disabled: row.is_disabled },
      afterValue: { is_disabled: !row.is_disabled },
    });
    const emailed = await sendStatusEmail(row.id, disabling ? "disabled" : "enabled", reason);
    toast.success(
      `${disabling ? "Recruiter disabled" : "Recruiter enabled"}${emailed ? " — email sent" : " (email not sent)"}`,
    );
    fetchRows();
  };

  /**
   * Approve or decline a recruiter application. recruiter_profiles
   * .verification_status defaults to 'Pending', and both sign-in paths refuse
   * anything that is not 'Verified', so this is what actually lets a new
   * recruiter in. The "Super admins update recruiter_profiles" RLS policy
   * permits writing to another recruiter's row.
   */
  const setVerification = async (row: RecruiterRow, approve: boolean) => {
    let reason: string | null = null;
    if (!approve) {
      const entered = window.prompt(
        `Decline ${row.recruiter_name || row.email}?

Summarise why. This is emailed to them and shown when they try to sign in:`,
        "",
      );
      if (entered === null) return; // cancelled
      reason = entered.trim() || null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const patch = approve
      ? {
          verification_status: "Verified",
          verified_at: now,
          verified_by: user?.id ?? null,
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
        }
      : {
          verification_status: "Rejected",
          rejection_reason: reason,
          rejected_at: now,
          rejected_by: user?.id ?? null,
        };

    const { error } = await supabase.from("recruiter_profiles").update(patch).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update approval: ${error.message}`);
      return;
    }

    logAdminAction({
      action: approve ? "recruiter.approve" : "recruiter.reject",
      entityType: "recruiter_profiles",
      entityId: row.id,
      beforeValue: { verification_status: row.verification_status },
      afterValue: { verification_status: approve ? "Verified" : "Rejected", rejection_reason: reason },
    });

    // Best-effort in-app notification; never block the approval on it.
    supabase
      .from("notifications")
      .insert({
        user_id: row.id,
        user_type: "recruiter",
        title: approve ? "Account approved" : "Account application declined",
        message: approve
          ? "Your recruiter account has been approved. You can now sign in."
          : reason
            ? `Your account application was declined: ${reason}`
            : "Your account application was declined. Please contact support.",
        type: "status_change",
        is_read: false,
      })
      .then(({ error: notifyErr }) => {
        if (notifyErr) console.warn("Approval notification failed:", notifyErr.message);
      });

    const emailed = await sendStatusEmail(row.id, approve ? "approved" : "declined", reason);
    toast.success(
      `${approve ? "Recruiter approved" : "Recruiter declined"}${emailed ? " — email sent" : " (email not sent)"}`,
    );
    fetchRows();
  };

  const columns: DataTableColumn<RecruiterRow>[] = [
    {
      key: "recruiter_name",
      header: "Recruiter",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.recruiter_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: "company_name", header: "Company", render: (row) => row.company_name || "—" },
    { key: "industry", header: "Industry", render: (row) => row.industry || "—" },
    {
      key: "plan",
      header: "Plan",
      render: (row) => {
        const active = row.recruiter_subscriptions?.find((s) => s.status === "active");
        return active ? <Badge variant="secondary">{active.plan_id}</Badge> : <span className="text-muted-foreground">Free</span>;
      },
    },
    {
      key: "verification_status",
      header: "Approval",
      sortable: true,
      render: (row) => {
        if (row.verification_status === "Verified") {
          return <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Approved</Badge>;
        }
        if (row.verification_status === "Rejected") {
          return (
            <Badge variant="destructive" title={row.rejection_reason || undefined}>
              Declined
            </Badge>
          );
        }
        return <Badge className="bg-amber-500 hover:bg-amber-500/90">Awaiting approval</Badge>;
      },
    },
    {
      key: "is_disabled",
      header: "Status",
      sortable: true,
      render: (row) =>
        row.is_disabled ? (
          <Badge variant="destructive">Disabled</Badge>
        ) : (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Active</Badge>
        ),
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or company..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Awaiting approval", value: "pending" },
              { label: "Approved", value: "verified" },
              { label: "Declined", value: "rejected" },
              { label: "Active", value: "active" },
              { label: "Disabled", value: "disabled" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "recruiters",
            [
              { key: "email", header: "Email" },
              { key: "recruiter_name", header: "Name" },
              { key: "company_name", header: "Company" },
              { key: "verification_status", header: "Approval" },
              { key: "is_disabled", header: "Disabled" },
              { key: "created_at", header: "Joined" },
            ],
            rows
          )
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelected(row)}>View details</DropdownMenuItem>
              {row.verification_status !== "Verified" && (
                <DropdownMenuItem onClick={() => setVerification(row, true)}>
                  <ShieldCheck /> Approve account
                </DropdownMenuItem>
              )}
              {row.verification_status !== "Rejected" && (
                <DropdownMenuItem onClick={() => setVerification(row, false)}>
                  <ShieldX /> Decline account
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => toggleDisabled(row)}>
                {row.is_disabled ? (
                  <>
                    <CheckCircle2 /> Enable account
                  </>
                ) : (
                  <>
                    <Ban /> Disable account
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.recruiter_name || selected.email}</SheetTitle>
                <SheetDescription>{selected.email}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company</span>
                  <span>{selected.company_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry</span>
                  <span>{selected.industry || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Org role</span>
                  <span>{selected.org_role || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{selected.is_disabled ? "Disabled" : "Active"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last login</span>
                  <span>{selected.last_login_at ? new Date(selected.last_login_at).toLocaleString() : "Never"}</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
