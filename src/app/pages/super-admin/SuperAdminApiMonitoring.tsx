import { useEffect, useState, useCallback } from "react";
import { Radio, CheckCircle2, XCircle, Timer } from "lucide-react";
import { DataTable, DataTableColumn } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface ApiLogRow {
  id: string;
  function_name: string;
  status_code: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function SuperAdminApiMonitoring() {
  const [rows, setRows] = useState<ApiLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [errorCount24h, setErrorCount24h] = useState(0);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [functionFilter, setFunctionFilter] = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("api_request_logs").select("*", { count: "exact" });
    if (functionFilter !== "all") query = query.eq("function_name", functionFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as ApiLogRow[]) ?? []);
    setTotalCount(count ?? 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: errCount } = await supabase
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .gte("status_code", 400)
      .gte("created_at", since);
    setErrorCount24h(errCount ?? 0);

    const { data: recent } = await supabase
      .from("api_request_logs")
      .select("duration_ms")
      .gte("created_at", since)
      .not("duration_ms", "is", null)
      .limit(500);
    if (recent && recent.length > 0) {
      const avg = recent.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / recent.length;
      setAvgDuration(Math.round(avg));
    }
    setLoading(false);
  }, [page, functionFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [functionFilter]);

  const columns: DataTableColumn<ApiLogRow>[] = [
    { key: "function_name", header: "Function" },
    {
      key: "status_code",
      header: "Status",
      render: (row) =>
        row.status_code < 400 ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90 gap-1">
            <CheckCircle2 className="size-3" /> {row.status_code}
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="size-3" /> {row.status_code}
          </Badge>
        ),
    },
    { key: "duration_ms", header: "Duration", render: (row) => (row.duration_ms != null ? `${row.duration_ms}ms` : "—") },
    { key: "error_message", header: "Error", render: (row) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{row.error_message || "—"}</span> },
    { key: "created_at", header: "When", render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Covers the Netlify Functions this app actually has: login, email/OTP, and invites. Requests
        are logged as they happen going forward.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard index={0} label="Requests Logged" value={totalCount} icon={Radio} loading={loading} />
        <KpiCard index={1} label="Errors (24h)" value={errorCount24h} icon={XCircle} loading={loading} />
        <KpiCard index={2} label="Avg. Duration (24h)" value={avgDuration != null ? `${avgDuration}ms` : "—"} icon={Timer} loading={loading} />
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
        emptyMessage="No requests logged yet."
        filters={[
          {
            key: "function",
            label: "Function",
            value: functionFilter,
            onChange: setFunctionFilter,
            options: [
              { label: "All functions", value: "all" },
              { label: "/api/super-admin-login", value: "/api/super-admin-login" },
              { label: "/api/send-otp", value: "/api/send-otp" },
              { label: "/api/send-invite", value: "/api/send-invite" },
              { label: "/api/super-admin-invite", value: "/api/super-admin-invite" },
            ],
          },
        ]}
      />
    </div>
  );
}
