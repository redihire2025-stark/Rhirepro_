import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MoreHorizontal, XCircle, RefreshCcw } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
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
  recruiter_profiles: { recruiter_name: string | null; company_name: string | null; email: string } | null;
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
      .select("id,recruiter_id,plan_id,status,started_at,expires_at,daily_job_posts,recruiter_profiles(recruiter_name,company_name,email)", {
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

  const cancelSubscription = async (row: SubscriptionRow) => {
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
    toast.success("Subscription cancelled");
    fetchRows();
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
          <p className="font-medium">{row.recruiter_profiles?.recruiter_name || row.recruiter_profiles?.email}</p>
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
              <DropdownMenuItem variant="destructive" onClick={() => cancelSubscription(row)}>
                <XCircle /> Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
