import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MoreHorizontal, XCircle, RefreshCcw, Loader2 } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface SubscriptionRow {
  id: string;
  recruiter_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled";
  started_at: string;
  expires_at: string;
  daily_job_posts: number | null;
  recruiter_profiles: { recruiter_name: string | null; company_name: string | null; is_org_admin: boolean | null } | null;
}

const PAGE_SIZE = 15;
const STATUS_BADGE: Record<SubscriptionRow["status"], "default" | "secondary" | "destructive"> = {
  active: "default",
  expired: "secondary",
  cancelled: "destructive",
};

export default function SuperAdminSubscriptions() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("started_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("recruiter_subscriptions")
      .select("id,recruiter_id,plan_id,status,started_at,expires_at,daily_job_posts,recruiter_profiles(recruiter_name,company_name,is_org_admin)", {
        count: "exact",
      });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`plan_id.ilike.${term}`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as SubscriptionRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const cancelSubscription = async (row: SubscriptionRow) => {
    setCancelling(true);
    try {
      const { error } = await supabase.from("recruiter_subscriptions").update({ status: "cancelled" }).eq("id", row.id);
      if (error) {
        toast.error(`Failed to cancel: ${error.message}`);
        return;
      }
      logAdminAction({
        action: "subscription.cancel",
        entityType: "recruiter_subscriptions",
        entityId: row.id,
        beforeValue: { status: row.status },
        afterValue: { status: "cancelled" },
      });

      // Cancelling an org admin's plan also unwinds their team: jobs move
      // to the admin's own account, members are deactivated, and the
      // admin is demoted to a normal recruiter. See
      // org_plan_cancellation_migration.sql / org-plan-cancelled.mjs.
      if (row.recruiter_profiles?.is_org_admin) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch("/api/org-plan-cancelled", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ recruiter_id: row.recruiter_id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          toast.error(`Subscription cancelled, but the team could not be unwound: ${err.error || "unknown error"}`);
          fetchRows();
          return;
        }
        const result = await res.json().catch(() => ({ affected_members: 0 }));
        toast.success(
          result.affected_members > 0
            ? `Subscription cancelled — team unwound, ${result.affected_members} member${result.affected_members === 1 ? "" : "s"} deactivated and notified.`
            : "Subscription cancelled — organization unwound.",
        );
      } else {
        toast.success("Subscription cancelled");
      }
      fetchRows();
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const reactivateSubscription = async (row: SubscriptionRow) => {
    const { error } = await supabase.from("recruiter_subscriptions").update({ status: "active" }).eq("id", row.id);
    if (error) {
      toast.error(`Failed to reactivate: ${error.message}`);
      return;
    }
    logAdminAction({
      action: "subscription.reactivate",
      entityType: "recruiter_subscriptions",
      entityId: row.id,
      beforeValue: { status: row.status },
      afterValue: { status: "active" },
    });
    toast.success("Subscription reactivated");
    fetchRows();
  };

  const columns: DataTableColumn<SubscriptionRow>[] = [
    {
      key: "recruiter",
      header: "Recruiter",
      render: (row) => (
        <div>
          <p className="font-medium">{row.recruiter_profiles?.recruiter_name || row.recruiter_profiles?.company_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.recruiter_profiles?.company_name || "—"}</p>
        </div>
      ),
    },
    { key: "plan_id", header: "Plan", sortable: true, render: (row) => <Badge variant="outline">{row.plan_id}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: "started_at", header: "Started", sortable: true, render: (row) => new Date(row.started_at).toLocaleDateString() },
    { key: "expires_at", header: "Expires", sortable: true, render: (row) => new Date(row.expires_at).toLocaleDateString() },
  ];

  return (
    <>
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
      searchPlaceholder="Search by plan..."
      filters={[
        {
          key: "status",
          label: "Status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Expired", value: "expired" },
            { label: "Cancelled", value: "cancelled" },
          ],
        },
      ]}
      onExportCsv={() =>
        exportRowsAsCsv(
          "subscriptions",
          [
            { key: "plan_id", header: "Plan" },
            { key: "status", header: "Status" },
            { key: "started_at", header: "Started" },
            { key: "expires_at", header: "Expires" },
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
            {row.status !== "active" && (
              <DropdownMenuItem onClick={() => reactivateSubscription(row)}>
                <RefreshCcw /> Reactivate
              </DropdownMenuItem>
            )}
            {row.status === "active" && (
              <DropdownMenuItem variant="destructive" onClick={() => setCancelTarget(row)}>
                <XCircle /> Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />

    <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="size-5" /> Cancel Subscription
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2">
          {cancelTarget?.recruiter_profiles?.is_org_admin ? (
            <>
              <p>
                <strong className="text-foreground">
                  {cancelTarget?.recruiter_profiles?.recruiter_name || cancelTarget?.recruiter_profiles?.company_name}
                </strong>{" "}
                manages a team. Cancelling this plan will also:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Reassign the team's jobs to this account</li>
                <li>Deactivate every team member and email them that the org has ended</li>
                <li>Demote this account to a normal recruiter (no job posting until they get a plan)</li>
              </ul>
              <p>This is reversible for the members (deactivated, not deleted) but cannot be undone automatically.</p>
            </>
          ) : (
            <p>This marks the subscription cancelled. This cannot be undone automatically.</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(null)} disabled={cancelling}>
            Keep Active
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => cancelTarget && cancelSubscription(cancelTarget)}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Cancel Subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
