import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Mail } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface OrgAdminRow {
  id: string;
  email: string;
  recruiter_name: string | null;
  company_name: string | null;
  member_count: number;
}

export default function SuperAdminOrgAdmins() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrgAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.rpc("get_super_admin_org_admins").then(({ data, error }) => {
      if (error) console.warn("get_super_admin_org_admins:", error.message);
      setRows((data as OrgAdminRow[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      r.email.toLowerCase().includes(term) ||
      r.recruiter_name?.toLowerCase().includes(term) ||
      r.company_name?.toLowerCase().includes(term)
    );
  });

  const withTeams = rows.filter((r) => r.member_count > 0).length;

  const columns: DataTableColumn<OrgAdminRow>[] = [
    {
      key: "recruiter_name",
      header: "Admin",
      render: (row) => (
        <div>
          <p className="font-medium">{row.recruiter_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "company_name",
      header: "Company",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5 text-muted-foreground" />
          {row.company_name || "—"}
        </div>
      ),
    },
    {
      key: "member_count",
      header: "Team Size",
      render: (row) =>
        row.member_count > 0 ? (
          <Badge variant="secondary">{row.member_count} member{row.member_count === 1 ? "" : "s"}</Badge>
        ) : (
          <span className="text-muted-foreground">No members yet</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Organisation Admins" value={rows.length} icon={Building2} loading={loading} />
        <KpiCard index={1} label="With Team Members" value={withTeams} icon={Building2} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        loading={loading}
        page={1}
        pageSize={filtered.length || 1}
        totalCount={filtered.length}
        onPageChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or company..."
        emptyMessage="No organisation admins found."
        rowActions={() => (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/super-admin/newsletter")}>
            <Mail className="size-3.5" /> Email
          </Button>
        )}
        onExportCsv={() =>
          exportRowsAsCsv(
            "organisation-admins",
            [
              { key: "email", header: "Email" },
              { key: "recruiter_name", header: "Name" },
              { key: "company_name", header: "Company" },
              { key: "member_count", header: "Team Size" },
            ],
            filtered
          )
        }
      />
    </div>
  );
}
