import { useEffect, useState, useCallback } from "react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";

interface AuditLogRow {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function SuperAdminAuditLogs() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("admin_audit_log").select("*", { count: "exact" });
    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`action.ilike.${term},entity_type.ilike.${term},actor_email.ilike.${term}`);
    }
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as AuditLogRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [search]);

  const columns: DataTableColumn<AuditLogRow>[] = [
    { key: "actor_email", header: "Admin", render: (row) => row.actor_email || "—" },
    { key: "action", header: "Action", render: (row) => <Badge variant="outline">{row.action}</Badge> },
    { key: "entity_type", header: "Entity" },
    {
      key: "change",
      header: "Change",
      render: (row) =>
        row.before_value || row.after_value ? (
          <span className="text-xs text-muted-foreground font-mono">
            {JSON.stringify(row.before_value)} → {JSON.stringify(row.after_value)}
          </span>
        ) : (
          "—"
        ),
    },
    { key: "created_at", header: "When", render: (row) => new Date(row.created_at).toLocaleString() },
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
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by admin, action, or entity..."
      emptyMessage="No admin actions logged yet — every disable/status-change/delete going forward is recorded here."
      onExportCsv={() =>
        exportRowsAsCsv(
          "audit-log",
          [
            { key: "actor_email", header: "Admin" },
            { key: "action", header: "Action" },
            { key: "entity_type", header: "Entity" },
            { key: "created_at", header: "When" },
          ],
          rows
        )
      }
    />
  );
}
