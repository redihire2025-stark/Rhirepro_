import { useEffect, useState, useCallback } from "react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";

interface TransactionRow {
  id: string;
  plan_id: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  status: "pending" | "success" | "failed" | "expired";
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
  completed_at: string | null;
  recruiter_profiles: { recruiter_name: string | null; company_name: string | null; email: string } | null;
}

const PAGE_SIZE = 15;
const STATUS_BADGE: Record<TransactionRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  failed: "destructive",
  expired: "outline",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function SuperAdminTransactions() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("payment_transactions")
      .select(
        "id,plan_id,amount,discount_amount,final_amount,status,payment_method,transaction_ref,created_at,completed_at,recruiter_profiles(recruiter_name,company_name,email)",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`plan_id.ilike.${term},transaction_ref.ilike.${term}`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as TransactionRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const columns: DataTableColumn<TransactionRow>[] = [
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
    { key: "plan_id", header: "Plan", render: (row) => <Badge variant="outline">{row.plan_id}</Badge> },
    { key: "final_amount", header: "Amount", sortable: true, render: (row) => formatCurrency(row.final_amount) },
    { key: "payment_method", header: "Method", render: (row) => row.payment_method || "—" },
    { key: "status", header: "Status", sortable: true, render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: "created_at", header: "Date", sortable: true, render: (row) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Read-only ledger. Refunds and chargebacks must go through the payment gateway directly — this view
        doesn't fabricate a refund action that wouldn't actually move money.
      </p>
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
        searchPlaceholder="Search by plan or transaction ref..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Success", value: "success" },
              { label: "Pending", value: "pending" },
              { label: "Failed", value: "failed" },
              { label: "Expired", value: "expired" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "transactions",
            [
              { key: "plan_id", header: "Plan" },
              { key: "final_amount", header: "Amount" },
              { key: "status", header: "Status" },
              { key: "payment_method", header: "Method" },
              { key: "created_at", header: "Date" },
            ],
            rows
          )
        }
      />
    </div>
  );
}
