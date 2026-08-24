import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface JobSeekerRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  experience_type: string | null;
  is_disabled: boolean;
  created_at: string;
  applications: { count: number }[] | null;
}

const PAGE_SIZE = 15;

export default function SuperAdminJobSeekers() {
  const [rows, setRows] = useState<JobSeekerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<JobSeekerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobSeekerRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select(
        "id,email,first_name,last_name,location,experience_type,is_disabled,created_at,applications(count)",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
    }
    if (statusFilter === "active") query = query.eq("is_disabled", false);
    if (statusFilter === "disabled") query = query.eq("is_disabled", true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order(sortKey, { ascending: sortDir === "asc" }).range(from, to);

    const { data, count } = await query;
    setRows((data as unknown as JobSeekerRow[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const toggleDisabled = async (row: JobSeekerRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_disabled: !row.is_disabled })
      .eq("id", row.id);
    if (error) {
      toast.error(`Failed to update job seeker: ${error.message}`);
      return;
    }
    logAdminAction({
      action: row.is_disabled ? "jobseeker.enable" : "jobseeker.disable",
      entityType: "profiles",
      entityId: row.id,
      beforeValue: { is_disabled: row.is_disabled },
      afterValue: { is_disabled: !row.is_disabled },
    });
    toast.success(row.is_disabled ? "Job seeker enabled" : "Job seeker disabled");
    fetchRows();
  };

  /**
   * Permanently deletes the account (auth user + cascaded profiles row) —
   * not a status toggle, no way back. Same admin-delete-user function used
   * for recruiters; it works for any account type and refuses to touch a
   * super admin regardless. Requires typing the exact email to confirm.
   */
  const handleDeleteAccount = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin-delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ user_id: deleteTarget.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete account" }));
        throw new Error(err.error || "Failed to delete account");
      }
      logAdminAction({
        action: "jobseeker.delete",
        entityType: "profiles",
        entityId: deleteTarget.id,
        beforeValue: { email: deleteTarget.email },
        afterValue: null,
      });
      toast.success(`${deleteTarget.email} has been permanently deleted.`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      fetchRows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<JobSeekerRow>[] = [
    {
      key: "first_name",
      header: "Job Seeker",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">
            {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
          </p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    {
      key: "experience_type",
      header: "Experience",
      render: (row) => (row.experience_type ? <Badge variant="outline">{row.experience_type}</Badge> : "—"),
    },
    {
      key: "applications",
      header: "Applications",
      render: (row) => row.applications?.[0]?.count ?? 0,
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
        searchPlaceholder="Search by name or email..."
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
            "job-seekers",
            [
              { key: "email", header: "Email" },
              { key: "first_name", header: "First name" },
              { key: "last_name", header: "Last name" },
              { key: "location", header: "Location" },
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setDeleteConfirmText(""); setDeleteTarget(row); }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 /> Delete account
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
                <SheetTitle>
                  {[selected.first_name, selected.last_name].filter(Boolean).join(" ") || selected.email}
                </SheetTitle>
                <SheetDescription>{selected.email}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{selected.location || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span>{selected.experience_type || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span>{selected.applications?.[0]?.count ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{selected.is_disabled ? "Disabled" : "Active"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" /> Delete Job Seeker Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              This permanently deletes{" "}
              <strong className="text-foreground">
                {[deleteTarget?.first_name, deleteTarget?.last_name].filter(Boolean).join(" ") || deleteTarget?.email}
              </strong>
              's account — profile, applications, everything. This cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Type <strong>{deleteTarget?.email}</strong> to confirm
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget?.email || ""}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== deleteTarget?.email}
            >
              {deleting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
