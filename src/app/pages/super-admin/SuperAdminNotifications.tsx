import { useEffect, useState, useCallback } from "react";
import { Bell, BellRing } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase, Notification } from "../../../lib/supabase";

const PAGE_SIZE = 20;

export default function SuperAdminNotifications() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("notifications").select("*", { count: "exact" });
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (userTypeFilter !== "all") query = query.eq("user_type", userTypeFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as Notification[]) ?? []);
    setTotalCount(count ?? 0);

    const { count: unread } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
    setUnreadCount(unread ?? 0);
    setLoading(false);
  }, [page, typeFilter, userTypeFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [typeFilter, userTypeFilter]);

  const columns: DataTableColumn<Notification>[] = [
    { key: "title", header: "Title" },
    { key: "message", header: "Message", render: (row) => <span className="line-clamp-1 max-w-xs">{row.message}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.type}</Badge> },
    { key: "user_type", header: "Audience", render: (row) => <Badge variant="secondary">{row.user_type}</Badge> },
    { key: "is_read", header: "Read", render: (row) => (row.is_read ? "Yes" : "No") },
    { key: "created_at", header: "Sent", render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Total Notifications" value={totalCount} icon={Bell} loading={loading} />
        <KpiCard index={1} label="Unread" value={unreadCount} icon={BellRing} loading={loading} />
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
        filters={[
          {
            key: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: "All types", value: "all" },
              { label: "Application", value: "application" },
              { label: "Message", value: "message" },
              { label: "Status change", value: "status_change" },
              { label: "Job alert", value: "job_alert" },
              { label: "Expiry warning", value: "expiry_warning" },
              { label: "Expired", value: "expired" },
              { label: "Reposted", value: "reposted" },
            ],
          },
          {
            key: "user_type",
            label: "Audience",
            value: userTypeFilter,
            onChange: setUserTypeFilter,
            options: [
              { label: "All", value: "all" },
              { label: "Recruiters", value: "recruiter" },
              { label: "Job seekers", value: "jobseeker" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "notifications",
            [
              { key: "title", header: "Title" },
              { key: "type", header: "Type" },
              { key: "user_type", header: "Audience" },
              { key: "created_at", header: "Sent" },
            ],
            rows
          )
        }
      />
    </div>
  );
}
