import { useEffect, useState, useCallback, FormEvent } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Ban, CheckCircle2 } from "lucide-react";
import { DataTable, DataTableColumn } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { supabase, SuperAdmin } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";
import { useSuperAdminAuth } from "../../../lib/super-admin-auth-context";

export default function SuperAdminAdminTeam() {
  const { user: currentUser } = useSuperAdminAuth();
  const [rows, setRows] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("super_admins").select("*").order("created_at", { ascending: true });
    setRows((data as SuperAdmin[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const toggleActive = async (row: SuperAdmin) => {
    if (row.id === currentUser?.id) {
      toast.error("You can't deactivate your own account.");
      return;
    }
    const { error } = await supabase.from("super_admins").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }
    logAdminAction({
      action: row.is_active ? "admin.deactivate" : "admin.activate",
      entityType: "super_admins",
      entityId: row.id,
      beforeValue: { is_active: row.is_active },
      afterValue: { is_active: !row.is_active },
    });
    toast.success(row.is_active ? "Admin deactivated" : "Admin activated");
    fetchRows();
  };

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const fullName = String(form.get("full_name") || "");
    const role = String(form.get("role") || "admin");

    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/super-admin-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ email, full_name: fullName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to invite admin");
        setSubmitting(false);
        return;
      }
      logAdminAction({ action: "admin.invite", entityType: "super_admins", afterValue: { email, role } });
      toast.success(`Admin invited — temp password emailed to ${email}`);
      setDialogOpen(false);
      fetchRows();
    } catch {
      toast.error("Something went wrong");
    }
    setSubmitting(false);
  };

  const columns: DataTableColumn<SuperAdmin>[] = [
    { key: "email", header: "Email" },
    { key: "full_name", header: "Name", render: (row) => row.full_name || "—" },
    { key: "role", header: "Role", render: (row) => <Badge variant="outline">{row.role}</Badge> },
    {
      key: "is_active",
      header: "Status",
      render: (row) =>
        row.is_active ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
    { key: "last_login_at", header: "Last login", render: (row) => (row.last_login_at ? new Date(row.last_login_at).toLocaleString() : "Never") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" /> Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite a Super Admin</DialogTitle>
                <DialogDescription>
                  A real Supabase Auth account is created immediately with a temporary password
                  emailed to them.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select name="role" defaultValue="admin">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Inviting…" : "Send invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        page={1}
        pageSize={rows.length || 1}
        totalCount={rows.length}
        onPageChange={() => {}}
        emptyMessage="No admins found."
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleActive(row)} disabled={row.id === currentUser?.id}>
                {row.is_active ? (
                  <>
                    <Ban /> Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle2 /> Activate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
    </div>
  );
}
