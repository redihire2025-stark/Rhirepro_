import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { supabase } from "../../../lib/supabase";

interface CompanyRow {
  company_name: string;
  recruiter_count: number;
  jobs_count: number;
  applications_count: number;
  industry: string | null;
  location: string | null;
  logo_url: string | null;
  latest_created_at: string;
}

const PAGE_SIZE = 15;

export default function SuperAdminCompanies() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("recruiter_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    supabase.rpc("get_super_admin_companies").then(({ data }) => {
      setRows((data as CompanyRow[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.company_name.toLowerCase().includes(term) ||
          r.industry?.toLowerCase().includes(term) ||
          r.location?.toLowerCase().includes(term)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const av = a[sortKey as keyof CompanyRow];
      const bv = b[sortKey as keyof CompanyRow];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }, [rows, search, sortKey, sortDir]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);

  const columns: DataTableColumn<CompanyRow>[] = [
    {
      key: "company_name",
      header: "Company",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarImage src={row.logo_url ?? undefined} />
            <AvatarFallback>
              <Building2 className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.company_name}</p>
            <p className="text-xs text-muted-foreground">{row.industry || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    { key: "recruiter_count", header: "Recruiters", sortable: true },
    { key: "jobs_count", header: "Jobs", sortable: true },
    { key: "applications_count", header: "Applications", sortable: true },
    {
      key: "latest_created_at",
      header: "Latest activity",
      sortable: true,
      render: (row) => new Date(row.latest_created_at).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={pageRows}
      getRowId={(row) => row.company_name}
      loading={loading}
      page={page}
      pageSize={PAGE_SIZE}
      totalCount={filtered.length}
      onPageChange={setPage}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(key, dir) => {
        setSortKey(key);
        setSortDir(dir);
      }}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by company, industry, or location..."
      emptyMessage="No companies found."
      onExportCsv={() =>
        exportRowsAsCsv(
          "companies",
          [
            { key: "company_name", header: "Company" },
            { key: "industry", header: "Industry" },
            { key: "location", header: "Location" },
            { key: "recruiter_count", header: "Recruiters" },
            { key: "jobs_count", header: "Jobs" },
            { key: "applications_count", header: "Applications" },
          ],
          filtered
        )
      }
    />
  );
}
