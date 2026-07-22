import { useEffect, useState, useCallback } from "react";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface EmailLogRow {
  id: string;
  recipient_email: string;
  email_type: "otp" | "reset_otp" | "invite" | "other";
  subject: string | null;
  status: "sent" | "failed";
  error_message: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function SuperAdminEmails() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sentToday, setSentToday] = useState(0);
  const [failedToday, setFailedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("email_logs").select("*", { count: "exact" });
    if (search.trim()) query = query.ilike("recipient_email", `%${search.trim()}%`);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as EmailLogRow[]) ?? []);
    setTotalCount(count ?? 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [sentRes, failedRes] = await Promise.all([
      supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", todayStart.toISOString()),
      supabase.from("email_logs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", todayStart.toISOString()),
    ]);
    setSentToday(sentRes.count ?? 0);
    setFailedToday(failedRes.count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const columns: DataTableColumn<EmailLogRow>[] = [
    { key: "recipient_email", header: "Recipient" },
    { key: "email_type", header: "Type", render: (row) => <Badge variant="outline">{row.email_type}</Badge> },
    { key: "subject", header: "Subject", render: (row) => row.subject || "—" },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status === "sent" ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90 gap-1">
            <CheckCircle2 className="size-3" /> Sent
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="size-3" /> Failed
          </Badge>
        ),
    },
    { key: "created_at", header: "Sent at", render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard index={0} label="Sent Today" value={sentToday} icon={Mail} loading={loading} />
        <KpiCard index={1} label="Failed Today" value={failedToday} icon={XCircle} loading={loading} />
        <KpiCard index={2} label="Total Logged" value={totalCount} icon={Mail} loading={loading} />
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
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by recipient..."
        emptyMessage="No emails logged yet — this fills in as OTPs and invites are sent."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Sent", value: "sent" },
              { label: "Failed", value: "failed" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "email-logs",
            [
              { key: "recipient_email", header: "Recipient" },
              { key: "email_type", header: "Type" },
              { key: "status", header: "Status" },
              { key: "created_at", header: "Sent at" },
            ],
            rows
          )
        }
      />
    </div>
  );
}
