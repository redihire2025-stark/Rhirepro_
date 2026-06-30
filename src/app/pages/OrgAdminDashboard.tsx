import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import logoImage from "../../logo/logo.png";
import {
  LogOut, Users, Briefcase, FileText, Calendar, Award, CheckCircle,
  TrendingUp, LayoutGrid, Building2, UsersRound, Shield, ClipboardList,
  BarChart2, CreditCard, Bell as BellIcon, FileClock, Settings, Loader2,
} from "lucide-react";
import { Button } from "../components/ui/button";

interface OrgKpis {
  totalRecruiters: number;
  activeRecruiters: number;
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  totalCandidates: number;
  applicationsToday: number;
  interviewsScheduled: number;
  offersReleased: number;
  successfulHires: number;
}

const EMPTY_KPIS: OrgKpis = {
  totalRecruiters: 0, activeRecruiters: 0, totalJobs: 0, activeJobs: 0,
  closedJobs: 0, totalCandidates: 0, applicationsToday: 0,
  interviewsScheduled: 0, offersReleased: 0, successfulHires: 0,
};

// Sidebar modules — only "dashboard" is live in this phase. The rest are
// built one at a time per the implementation plan and will light up here
// as each module ships, without touching this layout.
const SIDEBAR_SECTIONS: { id: string; label: string; icon: typeof LayoutGrid; available: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, available: true },
  { id: "organization", label: "Organization", icon: Building2, available: false },
  { id: "recruiters", label: "Recruiters", icon: UsersRound, available: false },
  { id: "roles", label: "Roles & Permissions", icon: Shield, available: false },
  { id: "jobs", label: "Jobs", icon: Briefcase, available: false },
  { id: "candidates", label: "Candidates", icon: Users, available: false },
  { id: "pipeline", label: "Interview Pipeline", icon: ClipboardList, available: false },
  { id: "reports", label: "Reports", icon: BarChart2, available: false },
  { id: "subscription", label: "Subscription & Billing", icon: CreditCard, available: false },
  { id: "notifications", label: "Notifications", icon: BellIcon, available: false },
  { id: "audit", label: "Audit Logs", icon: FileClock, available: false },
  { id: "settings", label: "Settings", icon: Settings, available: false },
];

function KpiCard({ icon: Icon, label, value, loading }: { icon: typeof Users; label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#FF2B2B]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-[#FF2B2B]" />
      </div>
      <div>
        <p className="text-xs text-[#8A8A8A]">{label}</p>
        {loading ? (
          <div className="h-6 w-10 mt-1 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-[#3A1F1F]">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

export default function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user, recruiterProfile, loading: authLoading, signOut } = useAuth();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [kpis, setKpis] = useState<OrgKpis>(EMPTY_KPIS);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Org admin accounts follow the admin_org{n}@redhire.dev convention (10 companies).
  // Mirrors the same fallback used at login: the DB flag is the source of truth once the
  // org_admin_migration.sql backfill has run, but the email pattern keeps these seeded
  // accounts working even if that migration hasn't been applied yet.
  const isOrgAdminEmail = !!user?.email && /^admin_org\d+@redhire\.dev$/i.test(user.email.trim());

  // Auth guard: must be signed in AND flagged as an org admin (by DB flag or email pattern).
  // Recruiters who land here by mistake (e.g. stale link) bounce to their own dashboard.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/recruiter/signin", { replace: true });
      return;
    }
    if (recruiterProfile && !recruiterProfile.is_org_admin && !isOrgAdminEmail) {
      navigate("/recruiter/dashboard", { replace: true });
    }
  }, [authLoading, user, recruiterProfile, isOrgAdminEmail, navigate]);

  const fetchKpis = useCallback(async () => {
    if (!recruiterProfile?.id) return;
    setKpiLoading(true);
    const orgId = recruiterProfile.org_id || recruiterProfile.id;

    try {
      const { data: recruiters } = await supabase
        .from("recruiter_profiles")
        .select("id, is_disabled")
        .eq("org_id", orgId);

      const recruiterIds = (recruiters || []).map(r => r.id);
      const idsForQuery = recruiterIds.length ? recruiterIds : [recruiterProfile.id];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [jobsRes, candidatesRes, todayAppsRes, interviewsRes, offersRes, hiresRes] = await Promise.all([
        supabase.from("jobs").select("status", { count: "exact" }).in("recruiter_id", idsForQuery),
        supabase.from("applications").select("profile_id").in("recruiter_id", idsForQuery),
        supabase.from("applications").select("id", { count: "exact", head: true }).in("recruiter_id", idsForQuery).gte("applied_at", todayStart.toISOString()),
        supabase.from("applications").select("id", { count: "exact", head: true }).in("recruiter_id", idsForQuery).eq("status", "Interview Scheduled"),
        supabase.from("applications").select("id", { count: "exact", head: true }).in("recruiter_id", idsForQuery).eq("status", "Offered"),
        supabase.from("applications").select("id", { count: "exact", head: true }).in("recruiter_id", idsForQuery).eq("status", "Hired"),
      ]);

      const jobs = jobsRes.data || [];
      const uniqueCandidates = new Set((candidatesRes.data || []).map(a => a.profile_id)).size;

      setKpis({
        totalRecruiters: recruiterIds.length || 1,
        activeRecruiters: (recruiters || []).filter(r => !r.is_disabled).length || 1,
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === "Active").length,
        closedJobs: jobs.filter(j => j.status === "Closed").length,
        totalCandidates: uniqueCandidates,
        applicationsToday: todayAppsRes.count || 0,
        interviewsScheduled: interviewsRes.count || 0,
        offersReleased: offersRes.count || 0,
        successfulHires: hiresRes.count || 0,
      });
    } catch {
      // Keep zeros on failure rather than crashing the dashboard.
    } finally {
      setKpiLoading(false);
    }
  }, [recruiterProfile?.id, recruiterProfile?.org_id]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || (user && !recruiterProfile)) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8A8A8A] text-sm">Loading organization dashboard...</p>
        </div>
      </div>
    );
  }
  if (!user || (recruiterProfile && !recruiterProfile.is_org_admin && !isOrgAdminEmail)) return null;

  const orgInitials = recruiterProfile?.company_name
    ? recruiterProfile.company_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "OA";

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/recruiter/org-admin" className="flex items-center gap-3">
              <img src={logoImage} alt="RhirePro Logo" className="w-10 h-10" />
              <div>
                <div className="text-2xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
                <div className="text-xs text-[#8A8A8A]">Organization Admin</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 bg-[#3A1F1F] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {orgInitials}
              </div>
              <Button
                variant="outline"
                className="border-[#FF2B2B] text-[#FF2B2B] hover:bg-[#FF2B2B] hover:text-white rounded-full"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex gap-6">
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sticky top-20">
            <nav className="space-y-1">
              {SIDEBAR_SECTIONS.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={!item.available}
                    onClick={() => item.available && setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                      isActive
                        ? "bg-[#FF2B2B] text-white font-medium"
                        : item.available
                        ? "text-[#3A1F1F] hover:bg-[#F6F6F6]"
                        : "text-[#BABABA] cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {!item.available && (
                      <span className="text-[10px] uppercase tracking-wide bg-[#F6F6F6] text-[#BABABA] px-1.5 py-0.5 rounded-full">Soon</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {activeSection === "dashboard" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#3A1F1F]">Dashboard Overview</h1>
                <p className="text-sm text-[#8A8A8A] mt-1">
                  Organization-wide hiring snapshot{recruiterProfile?.company_name ? ` for ${recruiterProfile.company_name}` : ""}.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                <KpiCard icon={UsersRound} label="Total Recruiters" value={kpis.totalRecruiters} loading={kpiLoading} />
                <KpiCard icon={UsersRound} label="Active Recruiters" value={kpis.activeRecruiters} loading={kpiLoading} />
                <KpiCard icon={Briefcase} label="Total Jobs" value={kpis.totalJobs} loading={kpiLoading} />
                <KpiCard icon={Briefcase} label="Active Jobs" value={kpis.activeJobs} loading={kpiLoading} />
                <KpiCard icon={Briefcase} label="Closed Jobs" value={kpis.closedJobs} loading={kpiLoading} />
                <KpiCard icon={Users} label="Total Candidates" value={kpis.totalCandidates} loading={kpiLoading} />
                <KpiCard icon={FileText} label="Applications Today" value={kpis.applicationsToday} loading={kpiLoading} />
                <KpiCard icon={Calendar} label="Interviews Scheduled" value={kpis.interviewsScheduled} loading={kpiLoading} />
                <KpiCard icon={Award} label="Offers Released" value={kpis.offersReleased} loading={kpiLoading} />
                <KpiCard icon={CheckCircle} label="Successful Hires" value={kpis.successfulHires} loading={kpiLoading} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF2B2B]/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-[#FF2B2B]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#3A1F1F]">More analytics, quick widgets, and modules are next</p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    Recruiter Management, Roles &amp; Permissions, and the rest of the sidebar will unlock here as each module ships.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeSection !== "dashboard" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Loader2 className="h-6 w-6 text-[#BABABA] mx-auto mb-3" />
              <p className="text-[#8A8A8A] text-sm">This module is coming up next.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
