import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, MoreHorizontal } from "lucide-react";
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("recruiter_profiles")
      .select(
        "id,email,recruiter_name,company_name,industry,is_disabled,org_role,created_at,last_login_at,recruiter_subscriptions(status,plan_id,expires_at)",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`email.ilike.${term},recruiter_name.ilike.${term},company_name.ilike.${term}`);
    }
    if (statusFilter === "active") query = query.eq("is_disabled", false);
    if (statusFilter === "disabled") query = query.eq("is_disabled", true);

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
    const { error } = await supabase
      .from("recruiter_profiles")
      .update({ is_disabled: !row.is_disabled })
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
    toast.success(row.is_disabled ? "Recruiter enabled" : "Recruiter disabled");
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
