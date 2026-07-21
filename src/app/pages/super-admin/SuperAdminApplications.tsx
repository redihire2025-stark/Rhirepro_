import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MoreHorizontal, FileText } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
import { supabase, Application, ApplicationStatusHistory } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface ApplicationRow {
  id: string;
  status: Application["status"];
  cover_letter: string | null;
  resume_url: string | null;
  applied_at: string;
  jobs: { title: string } | null;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
  recruiter_profiles: { company_name: string | null } | null;
}

const PAGE_SIZE = 15;

const STATUS_OPTIONS: Application["status"][] = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Interview Selected",
  "Interview Rejected",
  "Offered",
  "Joined",
  "Rejected",
  "On Hold",
  "New",
  "Reviewed",
  "Screening",
  "Hired",
];

export default function SuperAdminApplications() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("applied_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("applications")
      .select(
        "id,status,cover_letter,resume_url,applied_at,jobs(title),profiles(first_name,last_name,email),recruiter_profiles(company_name)",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`profiles.first_name.ilike.${term},profiles.email.ilike.${term},jobs.title.ilike.${term}`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as ApplicationRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }
    supabase
      .from("application_status_history")
      .select("*")
      .eq("application_id", selected.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setHistory((data as ApplicationStatusHistory[]) ?? []));
  }, [selected]);

  const updateStatus = async (row: ApplicationRow, status: Application["status"]) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update application: ${error.message}`);
      return;
    }
    logAdminAction({
      action: "application.status_change",
      entityType: "applications",
      entityId: row.id,
      beforeValue: { status: row.status },
      afterValue: { status },
    });
    toast.success(`Status changed to ${status}`);
    fetchRows();
  };

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      key: "candidate",
      header: "Candidate",
      render: (row) => (
        <div>
          <p className="font-medium">
            {[row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(" ") ||
              row.profiles?.email ||
              "—"}
          </p>
          <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
        </div>
      ),
    },
    { key: "job", header: "Job", render: (row) => row.jobs?.title || "—" },
    {
      key: "company",
      header: "Company",
      render: (row) => row.recruiter_profiles?.company_name || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Select value={row.status} onValueChange={(value) => updateStatus(row, value as Application["status"])}>
          <SelectTrigger className="w-[170px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "applied_at",
      header: "Applied",
      sortable: true,
      render: (row) => new Date(row.applied_at).toLocaleDateString(),
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
        searchPlaceholder="Search by candidate name, email, or job title..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [{ label: "All statuses", value: "all" }, ...STATUS_OPTIONS.map((s) => ({ label: s, value: s }))],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "applications",
            [
              { key: "status", header: "Status" },
              { key: "applied_at", header: "Applied" },
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
              <DropdownMenuItem onClick={() => setSelected(row)}>
                <FileText /> View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {[selected.profiles?.first_name, selected.profiles?.last_name].filter(Boolean).join(" ") ||
                    selected.profiles?.email}
                </SheetTitle>
                <SheetDescription>
                  Applied to {selected.jobs?.title || "a job"} at{" "}
                  {selected.recruiter_profiles?.company_name || "—"}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4 text-sm overflow-y-auto">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current status</span>
                  <Badge>{selected.status}</Badge>
                </div>
                {selected.resume_url && (
                  <a
                    href={selected.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline text-sm"
                  >
                    View resume
                  </a>
                )}
                {selected.cover_letter && (
                  <div>
                    <p className="text-muted-foreground mb-1">Cover letter</p>
                    <p className="whitespace-pre-wrap text-sm">{selected.cover_letter}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-2">Status history</p>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No history yet.</p>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between text-xs border-b border-border/60 pb-1.5">
                          <span>
                            {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(h.changed_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
