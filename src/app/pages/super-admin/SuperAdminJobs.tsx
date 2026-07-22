import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, MoreHorizontal, PauseCircle, PlayCircle, XCircle } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface JobRow {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  status: "Active" | "Paused" | "Closed" | "Expired";
  created_at: string;
  recruiter_profiles: { company_name: string | null; recruiter_name: string | null } | null;
  applications: { count: number }[] | null;
}

const PAGE_SIZE = 15;
const STATUS_BADGE: Record<JobRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  Active: "default",
  Paused: "secondary",
  Closed: "outline",
  Expired: "destructive",
};

export default function SuperAdminJobs() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteTarget, setDeleteTarget] = useState<JobRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("jobs")
      .select(
        "id,title,company_name,location,work_mode,employment_type,status,created_at,recruiter_profiles(company_name,recruiter_name),applications(count)",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},company_name.ilike.${term},location.ilike.${term}`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as JobRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const updateStatus = async (row: JobRow, status: JobRow["status"]) => {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update job: ${error.message}`);
      return;
    }
    logAdminAction({
      action: "job.status_change",
      entityType: "jobs",
      entityId: row.id,
      beforeValue: { status: row.status },
      afterValue: { status },
    });
    toast.success(`Job marked as ${status}`);
    fetchRows();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("jobs").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error(`Failed to delete job: ${error.message}`);
    } else {
      logAdminAction({
        action: "job.delete",
        entityType: "jobs",
        entityId: deleteTarget.id,
        beforeValue: { title: deleteTarget.title, status: deleteTarget.status },
      });
      toast.success("Job deleted");
      fetchRows();
    }
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<JobRow>[] = [
    {
      key: "title",
      header: "Job",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.recruiter_profiles?.company_name || row.company_name || "—"}
          </p>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    { key: "work_mode", header: "Work mode", render: (row) => row.work_mode || "—" },
    { key: "employment_type", header: "Type", render: (row) => row.employment_type || "—" },
    {
      key: "applications",
      header: "Applicants",
      render: (row) => row.applications?.[0]?.count ?? 0,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>,
    },
    {
      key: "created_at",
      header: "Posted",
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
        searchPlaceholder="Search by title, company, or location..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Active", value: "Active" },
              { label: "Paused", value: "Paused" },
              { label: "Closed", value: "Closed" },
              { label: "Expired", value: "Expired" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "jobs",
            [
              { key: "title", header: "Title" },
              { key: "company_name", header: "Company" },
              { key: "location", header: "Location" },
              { key: "status", header: "Status" },
              { key: "created_at", header: "Posted" },
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
              {row.status !== "Active" && (
                <DropdownMenuItem onClick={() => updateStatus(row, "Active")}>
                  <PlayCircle /> Mark Active
                </DropdownMenuItem>
              )}
              {row.status !== "Paused" && (
                <DropdownMenuItem onClick={() => updateStatus(row, "Paused")}>
                  <PauseCircle /> Pause
                </DropdownMenuItem>
              )}
              {row.status !== "Closed" && (
                <DropdownMenuItem onClick={() => updateStatus(row, "Closed")}>
                  <XCircle /> Close
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
                <Trash2 /> Delete job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes "{deleteTarget?.title}" and all of its applications. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
