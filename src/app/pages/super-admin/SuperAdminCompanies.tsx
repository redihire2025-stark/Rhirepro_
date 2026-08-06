import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  FileText
} from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

export interface CompanyRow {
  company_name: string;
  verification_status: "Pending" | "Verified" | "Rejected";
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  recruiter_count: number;
  jobs_count: number;
  applications_count: number;
  industry: string | null;
  location: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  gst: string | null;
  subscription_plan: string | null;
  payment_status: string | null;
  latest_created_at: string;
}

const PAGE_SIZE = 15;

export default function SuperAdminCompanies() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Verified" | "Rejected">("All");
  const [sortKey, setSortKey] = useState("verification_status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Modals state
  const [verifyTarget, setVerifyTarget] = useState<CompanyRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CompanyRow | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [detailCompany, setDetailCompany] = useState<CompanyRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_super_admin_companies");
    if (!error && data) {
      setRows(data as CompanyRow[]);
    } else {
      // Fallback direct query if RPC needs fallback
      const { data: profiles } = await supabase.from("recruiter_profiles").select("*");
      if (profiles) {
        const aggregated: Record<string, CompanyRow> = {};
        for (const p of profiles) {
          const cName = p.company_name?.trim() || "Unaffiliated";
          if (!aggregated[cName]) {
            aggregated[cName] = {
              company_name: cName,
              verification_status: p.verification_status || "Pending",
              rejection_reason: p.rejection_reason || null,
              rejected_at: p.rejected_at || null,
              rejected_by: p.rejected_by || null,
              verified_at: p.verified_at || null,
              verified_by: p.verified_by || null,
              recruiter_count: 1,
              jobs_count: 0,
              applications_count: 0,
              industry: p.industry || null,
              location: p.location || null,
              logo_url: p.logo_url || null,
              email: p.email || null,
              phone: p.phone || null,
              website: p.website || null,
              address: p.location || null,
              gst: p.cin || null,
              subscription_plan: "Free Trial",
              payment_status: "Active",
              latest_created_at: p.created_at,
            };
          } else {
            aggregated[cName].recruiter_count += 1;
            if (new Date(p.created_at) > new Date(aggregated[cName].latest_created_at)) {
              aggregated[cName].latest_created_at = p.created_at;
            }
          }
        }
        setRows(Object.values(aggregated));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Compute status counts
  const counts = useMemo(() => {
    const all = rows.length;
    const pending = rows.filter((r) => r.verification_status === "Pending").length;
    const verified = rows.filter((r) => r.verification_status === "Verified").length;
    const rejected = rows.filter((r) => r.verification_status === "Rejected").length;
    return { all, pending, verified, rejected };
  }, [rows]);

  // Filter & Sort
  const filtered = useMemo(() => {
    let result = rows;

    // Filter by status tab
    if (statusFilter !== "All") {
      result = result.filter((r) => r.verification_status === statusFilter);
    }

    // Filter by search query
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.company_name.toLowerCase().includes(term) ||
          r.industry?.toLowerCase().includes(term) ||
          r.location?.toLowerCase().includes(term) ||
          r.email?.toLowerCase().includes(term)
      );
    }

    // Sort
    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      if (sortKey === "verification_status") {
        // Order: Pending (0) -> Verified (1) -> Rejected (2)
        const rank = { Pending: 0, Verified: 1, Rejected: 2 };
        const rankA = rank[a.verification_status] ?? 3;
        const rankB = rank[b.verification_status] ?? 3;
        if (rankA !== rankB) return (rankA - rankB) * dir;
        return (new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime());
      }
      if (sortKey === "latest_created_at" || sortKey === "created_at") {
        return (new Date(a.latest_created_at).getTime() - new Date(b.latest_created_at).getTime()) * dir;
      }
      const av = a[sortKey as keyof CompanyRow];
      const bv = b[sortKey as keyof CompanyRow];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }, [rows, statusFilter, search, sortKey, sortDir]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, statusFilter]);

  // Actions
  const handleVerifyConfirm = async () => {
    if (!verifyTarget) return;
    setActionLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const adminId = userRes.user?.id || null;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("recruiter_profiles")
        .update({
          verification_status: "Verified",
          verified_at: now,
          verified_by: adminId,
          rejection_reason: null,
        })
        .ilike("company_name", verifyTarget.company_name);

      if (error) {
        console.error("Failed to verify company:", error);
      } else {
        await logAdminAction({
          action: `Admin verified ${verifyTarget.company_name}`,
          entityType: "company",
          entityId: verifyTarget.company_name,
          afterValue: { verification_status: "Verified", verified_at: now },
        });

        // Update local state instantly
        setRows((prev) =>
          prev.map((r) =>
            r.company_name === verifyTarget.company_name
              ? {
                  ...r,
                  verification_status: "Verified",
                  verified_at: now,
                  verified_by: adminId,
                  rejection_reason: null,
                }
              : r
          )
        );
      }
    } finally {
      setActionLoading(false);
      setVerifyTarget(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      const reason = rejectionReasonInput.trim() || "Company verification rejected by administrator.";
      const { data: userRes } = await supabase.auth.getUser();
      const adminId = userRes.user?.id || null;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("recruiter_profiles")
        .update({
          verification_status: "Rejected",
          rejection_reason: reason,
          rejected_at: now,
          rejected_by: adminId,
        })
        .ilike("company_name", rejectTarget.company_name);

      if (error) {
        console.error("Failed to reject company:", error);
      } else {
        await logAdminAction({
          action: `Admin rejected ${rejectTarget.company_name} - Reason: ${reason}`,
          entityType: "company",
          entityId: rejectTarget.company_name,
          afterValue: { verification_status: "Rejected", rejection_reason: reason, rejected_at: now },
        });

        // Update local state instantly
        setRows((prev) =>
          prev.map((r) =>
            r.company_name === rejectTarget.company_name
              ? {
                  ...r,
                  verification_status: "Rejected",
                  rejection_reason: reason,
                  rejected_at: now,
                  rejected_by: adminId,
                }
              : r
          )
        );
      }
    } finally {
      setActionLoading(false);
      setRejectTarget(null);
      setRejectionReasonInput("");
    }
  };

  const renderBadge = (status: "Pending" | "Verified" | "Rejected") => {
    switch (status) {
      case "Pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1.5 font-medium px-2.5 py-1">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Verification
          </Badge>
        );
      case "Verified":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5 font-medium px-2.5 py-1">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Verified
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 gap-1.5 font-medium px-2.5 py-1">
            <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: DataTableColumn<CompanyRow>[] = [
    {
      key: "serial",
      header: "#",
      render: (row) => {
        const idx = pageRows.indexOf(row);
        const serialNum = (page - 1) * PAGE_SIZE + (idx >= 0 ? idx : 0) + 1;
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {serialNum}
          </span>
        );
      },
    },
    {
      key: "company_name",
      header: "Company",
      sortable: true,
      render: (row) => (
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setDetailCompany(row)}
        >
          <Avatar className="size-9 border border-border">
            <AvatarImage src={row.logo_url ?? undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <Building2 className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium group-hover:text-primary transition-colors">
              {row.company_name}
            </p>
            <p className="text-xs text-muted-foreground">{row.industry || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Verification Status",
      sortable: true,
      render: (row) => renderBadge(row.verification_status),
    },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    { key: "recruiter_count", header: "Recruiters", sortable: true },
    { key: "jobs_count", header: "Jobs", sortable: true },
    { key: "applications_count", header: "Applications", sortable: true },
    {
      key: "latest_created_at",
      header: "Latest Activity",
      sortable: true,
      render: (row) => new Date(row.latest_created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.verification_status === "Pending" ? (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 px-2.5 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  setVerifyTarget(row);
                }}
              >
                <CheckCircle2 className="size-3.5" />
                Verify
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 gap-1 h-8 px-2.5 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectTarget(row);
                  setRejectionReasonInput("");
                }}
              >
                <XCircle className="size-3.5" />
                Reject
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setDetailCompany(row);
              }}
            >
              <Eye className="size-3.5 text-muted-foreground" />
              View
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={statusFilter === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("All")}
            className="rounded-full gap-1.5 text-xs h-8"
          >
            All
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground font-semibold">
              {counts.all}
            </span>
          </Button>

          <Button
            variant={statusFilter === "Pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Pending")}
            className={`rounded-full gap-1.5 text-xs h-8 ${
              statusFilter === "Pending"
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
            }`}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            Pending
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold dark:bg-amber-900 dark:text-amber-200">
              {counts.pending}
            </span>
          </Button>

          <Button
            variant={statusFilter === "Verified" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Verified")}
            className={`rounded-full gap-1.5 text-xs h-8 ${
              statusFilter === "Verified"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="size-3 text-emerald-600" />
            Verified
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold dark:bg-emerald-900 dark:text-emerald-200">
              {counts.verified}
            </span>
          </Button>

          <Button
            variant={statusFilter === "Rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Rejected")}
            className={`rounded-full gap-1.5 text-xs h-8 ${
              statusFilter === "Rejected"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
            }`}
          >
            <XCircle className="size-3 text-rose-600" />
            Rejected
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold dark:bg-rose-900 dark:text-rose-200">
              {counts.rejected}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Showing <strong className="text-foreground">{filtered.length}</strong> companies
          </span>
        </div>
      </div>

      {/* Main Table */}
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
              { key: "verification_status", header: "Verification Status" },
              { key: "industry", header: "Industry" },
              { key: "location", header: "Location" },
              { key: "recruiter_count", header: "Recruiters" },
              { key: "jobs_count", header: "Jobs" },
              { key: "applications_count", header: "Applications" },
              { key: "rejection_reason", header: "Rejection Reason" },
            ],
            filtered
          )
        }
      />

      {/* Verify Confirmation Modal */}
      <Dialog open={!!verifyTarget} onOpenChange={(open) => !open && setVerifyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mb-2">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Verify this company?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              You are about to verify <strong className="text-foreground">{verifyTarget?.company_name}</strong>.
              The company will become active and recruiters can use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setVerifyTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleVerifyConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mb-2">
              <XCircle className="size-6 text-rose-600 dark:text-rose-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Reason for rejection
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Please state why <strong className="text-foreground">{rejectTarget?.company_name}</strong> is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Enter rejection reason (e.g., Fake company documentation, invalid GST details, violates platform terms)..."
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Rejecting..." : "Reject Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Details View Modal */}
      <Dialog open={!!detailCompany} onOpenChange={(open) => !open && setDetailCompany(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 pb-2">
              <Avatar className="size-12 border border-border">
                <AvatarImage src={detailCompany?.logo_url ?? undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <Building2 className="size-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {detailCompany?.company_name}
                </DialogTitle>
                <div className="pt-1">
                  {detailCompany && renderBadge(detailCompany.verification_status)}
                </div>
              </div>
            </div>
          </DialogHeader>

          {detailCompany && (
            <div className="space-y-6 pt-2">
              {/* Status Notice if Rejected */}
              {detailCompany.verification_status === "Rejected" && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 rounded-lg text-rose-900 dark:text-rose-200 text-sm">
                  <p className="font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="size-4" /> Rejection Details
                  </p>
                  <p className="mt-1 text-xs">{detailCompany.rejection_reason || "No reason specified."}</p>
                  {detailCompany.rejected_at && (
                    <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                      Rejected on {new Date(detailCompany.rejected_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Company Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3.5" /> Registration Date
                  </span>
                  <p className="font-medium">
                    {new Date(detailCompany.latest_created_at).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="size-3.5" /> GST / CIN
                  </span>
                  <p className="font-medium">{detailCompany.gst || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3.5" /> Contact Email
                  </span>
                  <p className="font-medium text-xs break-all">{detailCompany.email || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3.5" /> Phone
                  </span>
                  <p className="font-medium">{detailCompany.phone || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3.5" /> Website
                  </span>
                  {detailCompany.website ? (
                    <a
                      href={detailCompany.website.startsWith("http") ? detailCompany.website : `https://${detailCompany.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-xs text-primary hover:underline"
                    >
                      {detailCompany.website}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3.5" /> Address
                  </span>
                  <p className="font-medium">{detailCompany.address || detailCompany.location || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="size-3.5" /> Subscription Plan
                  </span>
                  <p className="font-medium">{detailCompany.subscription_plan || "Free Trial"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Payment Status
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {detailCompany.payment_status || "Active"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3.5" /> Recruiter Count
                  </span>
                  <p className="font-medium">{detailCompany.recruiter_count}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="size-3.5" /> Job Count
                  </span>
                  <p className="font-medium">{detailCompany.jobs_count}</p>
                </div>
              </div>

              {/* Verification History Log */}
              <div className="border-t border-border pt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Verification History
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Account Created</span>
                    <span>{new Date(detailCompany.latest_created_at).toLocaleString()}</span>
                  </div>

                  {detailCompany.verified_at && (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Company Verified</span>
                      <span>{new Date(detailCompany.verified_at).toLocaleString()}</span>
                    </div>
                  )}

                  {detailCompany.rejected_at && (
                    <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-medium">
                      <span>Company Rejected</span>
                      <span>{new Date(detailCompany.rejected_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDetailCompany(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
