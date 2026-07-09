import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import logoImage from "../../logo/logo.png";
import {
  Users, UserX, UserCheck, Crown, Building2, Mail, Briefcase,
  BarChart2, Plus, MoreVertical, Loader2, X, CheckCircle,
  Clock, ArrowLeft, LogOut, Shield, RefreshCw, Send,
  LayoutGrid, TrendingUp, CreditCard,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgMember = {
  id: string;
  email: string;
  recruiter_name: string | null;
  org_role: string;
  is_active: boolean;
  jobs_count: number;
  applications_count: number;
  hires_count: number;
  created_at: string;
  resumes_used: number;
  keywords_used: number;
  profiles_viewed: number;
};

type OrgInvitation = {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type OrgJob = {
  id: string;
  title: string;
  status: string;
  recruiter_id: string;
  company_name: string;
  location: string | null;
  created_at: string;
  deadline: string | null;
  views: number | null;
  openings: number;
  recruiter_name: string;
};

type OrgApplication = {
  id: string;
  job_id: string;
  profile_id: string;
  recruiter_id: string;
  status: string;
  applied_at: string;
  job_title: string;
  candidate_name: string;
  recruiter_name: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(name: string | null, email: string) {
  const src = name || email;
  return src.slice(0, 2).toUpperCase();
}

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Paused: "bg-yellow-100 text-yellow-700",
  Closed: "bg-gray-100 text-gray-500",
  Expired: "bg-red-100 text-red-600",
};

const APP_STATUS_COLOR: Record<string, string> = {
  Applied: "bg-blue-100 text-blue-700",
  "Under Review": "bg-purple-100 text-purple-700",
  Shortlisted: "bg-indigo-100 text-indigo-700",
  "Interview Scheduled": "bg-yellow-100 text-yellow-700",
  "Offered": "bg-orange-100 text-orange-700",
  Joined: "bg-green-100 text-green-700",
  Hired: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-600",
  "On Hold": "bg-gray-100 text-gray-500",
};

// Memory cache to prevent reloading flicker when navigating back to OrgAdminPanel
let orgCache: {
  members: OrgMember[];
  invitations: OrgInvitation[];
  teamJobs: OrgJob[];
  teamApps: OrgApplication[];
  activeSub: any | null;
} | null = null;

export default function OrgAdminPanel() {
  const navigate = useNavigate();
  const { user, recruiterProfile, isOrgAdmin, loading: authLoading, signOut } = useAuth();

  const initialMountRef = useRef(true);

  const [activeTab, setActiveTab] = useState("overview");
  const [members, setMembers] = useState<OrgMember[]>(orgCache?.members || []);
  const [invitations, setInvitations] = useState<OrgInvitation[]>(orgCache?.invitations || []);
  const [teamJobs, setTeamJobs] = useState<OrgJob[]>(orgCache?.teamJobs || []);
  const [teamApps, setTeamApps] = useState<OrgApplication[]>(orgCache?.teamApps || []);
  const [activeSub, setActiveSub] = useState<any | null>(orgCache?.activeSub || null);
  const [dataLoading, setDataLoading] = useState(!orgCache);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Filters
  const [jobSearch, setJobSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isOrgAdmin) {
      navigate("/recruiter/dashboard", { replace: true });
    }
  }, [authLoading, user, isOrgAdmin, navigate]);

  // ── Data fetching ───────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!user || !recruiterProfile) return;
    if (!silent) setDataLoading(true);
    try {
      // Fetch active subscription
      const { data: subData } = await supabase
        .from("recruiter_subscriptions")
        .select("*")
        .eq("recruiter_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveSub(subData);

      // Members + stats via security-definer function
      const { data: membersData } = await supabase.rpc(
        "get_org_members_with_stats",
        { p_admin_id: user.id }
      );
      const membersList: OrgMember[] = membersData || [];
      setMembers(membersList);

      // Build recruiter name map
      const nameMap: Record<string, string> = {};
      membersList.forEach(m => { nameMap[m.id] = m.recruiter_name || m.email; });
      nameMap[user.id] = recruiterProfile.recruiter_name || recruiterProfile.email;

      // Pending invitations
      const { data: invData } = await supabase
        .from("recruiter_invitations")
        .select("id, invited_email, role, status, created_at, expires_at")
        .eq("org_admin_id", user.id)
        .order("created_at", { ascending: false });
      setInvitations(invData || []);

      // All team jobs
      const allIds = [user.id, ...membersList.map(m => m.id)];
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, status, recruiter_id, company_name, location, created_at, deadline, views, openings")
        .in("recruiter_id", allIds)
        .order("created_at", { ascending: false });
      const mappedJobs = (jobsData || []).map(j => ({
        ...j,
        recruiter_name: nameMap[j.recruiter_id] || "Unknown",
      }));
      setTeamJobs(mappedJobs);

      // All team applications (capped at 500)
      const { data: appsData } = await supabase
        .from("applications")
        .select(`
          id, job_id, profile_id, recruiter_id, status, applied_at,
          job:jobs!job_id(title),
          profile:profiles!profile_id(first_name, last_name, email)
        `)
        .in("recruiter_id", allIds)
        .order("applied_at", { ascending: false })
        .limit(500);

      const mappedApps = (appsData || []).map((a: any) => ({
        id: a.id,
        job_id: a.job_id,
        profile_id: a.profile_id,
        recruiter_id: a.recruiter_id,
        status: a.status,
        applied_at: a.applied_at,
        job_title: a.job?.title || "Unknown Job",
        candidate_name: a.profile
          ? `${a.profile.first_name || ""} ${a.profile.last_name || ""}`.trim() || a.profile.email
          : "Unknown",
        recruiter_name: nameMap[a.recruiter_id] || "Unknown",
      }));
      setTeamApps(mappedApps);

      // Cache the loaded data
      orgCache = {
        members: membersList,
        invitations: invData || [],
        teamJobs: mappedJobs,
        teamApps: mappedApps,
        activeSub: subData,
      };
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, [user, recruiterProfile]);

  useEffect(() => {
    if (user && recruiterProfile && isOrgAdmin) {
      loadData(!!orgCache);
    }
  }, [user, recruiterProfile, isOrgAdmin, loadData]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (user && recruiterProfile && isOrgAdmin) {
      loadData(true);
    }
  }, [activeTab, user, recruiterProfile, isOrgAdmin, loadData]);

  // ── Invite handler ──────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user || !recruiterProfile) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      const activeCount = members.filter(m => m.is_active).length;
      const maxSeats = recruiterProfile.max_seats || 5;
      if (activeCount >= maxSeats) {
        setInviteError(`Seat limit reached (${maxSeats} seats). Upgrade your plan to add more.`);
        return;
      }
      const pending = invitations.find(
        i => i.invited_email === inviteEmail.trim().toLowerCase() && i.status === "pending"
      );
      if (pending) {
        setInviteError("A pending invitation already exists for this email.");
        return;
      }

      const adminDomain = recruiterProfile.email?.split("@")[1]?.toLowerCase();
      const inviteDomain = inviteEmail.trim().split("@")[1]?.toLowerCase();
      if (!adminDomain || !inviteDomain || adminDomain !== inviteDomain) {
        setInviteError(`You can only invite members with a matching email domain (@${adminDomain || ""}).`);
        return;
      }

      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_admin_id: user.id,
          company_name: recruiterProfile.company_name || "",
          invited_email: inviteEmail.trim().toLowerCase(),
          invited_by_name:
            recruiterProfile.recruiter_name || recruiterProfile.company_name || "Admin",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send invitation" }));
        throw new Error(err.error || "Failed to send invitation");
      }

      setInviteSuccess(true);
      setInviteEmail("");
      await loadData();
      setTimeout(() => {
        setInviteSuccess(false);
        setInviteOpen(false);
      }, 2500);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Member actions ──────────────────────────────────────────

  const handleMemberAction = async (
    memberId: string,
    action: "deactivate" | "activate" | "remove"
  ) => {
    setActionLoading(memberId);
    try {
      if (action === "deactivate") {
        await supabase.from("recruiter_profiles").update({ is_active: false }).eq("id", memberId);
      } else if (action === "activate") {
        await supabase.from("recruiter_profiles").update({ is_active: true }).eq("id", memberId);
      } else if (action === "remove") {
        await supabase
          .from("recruiter_profiles")
          .update({ org_admin_id: null, org_role: "admin" })
          .eq("id", memberId);
      }
      await loadData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (inviteId: string) => {
    await supabase
      .from("recruiter_invitations")
      .update({ status: "revoked" })
      .eq("id", inviteId);
    await loadData();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // ── Derived stats ───────────────────────────────────────────

  const activeCount = members.filter(m => m.is_active).length;
  const maxSeats = recruiterProfile?.max_seats || 5;
  const seatPct = Math.min((activeCount / maxSeats) * 100, 100);
  const pendingInvitations = invitations.filter(i => i.status === "pending");
  const companyInitials = (recruiterProfile?.company_name || "RC")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const filteredJobs = teamJobs.filter(j =>
    !jobSearch ||
    j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.recruiter_name.toLowerCase().includes(jobSearch.toLowerCase())
  );
  const filteredApps = teamApps.filter(a =>
    appStatusFilter === "all" || a.status === appStatusFilter
  );

  // Overview tab KPIs — derived from data already fetched for the other tabs, no extra queries.
  const todayStr = new Date().toDateString();
  const overviewKpis = {
    totalRecruiters: members.length,
    activeRecruiters: activeCount,
    totalJobs: teamJobs.length,
    activeJobs: teamJobs.filter(j => j.status === "Active").length,
    closedJobs: teamJobs.filter(j => j.status === "Closed").length,
    totalCandidates: new Set(teamApps.map(a => a.profile_id)).size,
    applicationsToday: teamApps.filter(a => new Date(a.applied_at).toDateString() === todayStr).length,
    interviewsScheduled: teamApps.filter(a => a.status === "Interview Scheduled").length,
    offersReleased: teamApps.filter(a => a.status === "Offered").length,
    successfulHires: teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length,
  };

  // ── Render ──────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/recruiter/dashboard" className="flex items-center gap-3">
                <img src={logoImage} alt="RhirePro" className="w-10 h-10" />
                <div>
                  <div className="text-2xl font-bold text-[#3A1F1F]">
                    Rhire<span className="text-[#FF2B2B]">Pro</span>
                  </div>
                  <div className="text-xs text-[#8A8A8A]">Recruiter</div>
                </div>
              </Link>
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
                <Shield className="h-4 w-4 text-[#FF2B2B]" />
                <span className="text-sm font-semibold text-[#3A1F1F]">Team Admin Panel</span>
                <span className="text-xs text-[#8A8A8A]">— {recruiterProfile?.company_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/recruiter/dashboard">
                <Button variant="ghost" size="sm" className="text-[#8A8A8A] hover:text-[#3A1F1F] rounded-full">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent">
                  <div className="w-8 h-8 bg-[#FF2B2B] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {companyInitials}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-[#3A1F1F]">
                      {recruiterProfile?.company_name || "Company"}
                    </p>
                    <p className="text-xs text-[#8A8A8A]">{recruiterProfile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon={<Users className="h-5 w-5 text-[#FF2B2B]" />} label="Team Members" value={`${activeCount} active`} sub={`${members.length} total`} onClick={() => setActiveTab("team")} />
          <SummaryCard icon={<Shield className="h-5 w-5 text-blue-500" />} label="Sub-Users" value={`${activeCount} / ${maxSeats}`} sub={`${maxSeats - activeCount} remaining`} onClick={() => setActiveTab("team")} />
          <SummaryCard icon={<Briefcase className="h-5 w-5 text-green-500" />} label="Total Jobs" value={String(teamJobs.length)} sub={`${teamJobs.filter(j => j.status === "Active").length} active`} onClick={() => setActiveTab("jobs")} />
          <SummaryCard icon={<BarChart2 className="h-5 w-5 text-purple-500" />} label="Total Applications" value={String(teamApps.length)} sub={`${teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length} hired`} onClick={() => setActiveTab("applications")} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white rounded-xl p-1 shadow-sm mb-6 w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1.5" /> Team
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Briefcase className="h-4 w-4 mr-1.5" /> All Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-1.5" /> All Applications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <BarChart2 className="h-4 w-4 mr-1.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="subscription_usage" className="rounded-lg text-sm data-[state=active]:bg-[#FF2B2B] data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-1.5" /> Subscription Usage
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview">
            {dataLoading ? <LoadingCard /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                  <AnalyticsCard label="Total Recruiters" value={overviewKpis.totalRecruiters} color="text-[#3A1F1F]" onClick={() => setActiveTab("team")} />
                  <AnalyticsCard label="Active Recruiters" value={overviewKpis.activeRecruiters} color="text-green-600" onClick={() => setActiveTab("team")} />
                  <AnalyticsCard label="Total Jobs" value={overviewKpis.totalJobs} color="text-[#3A1F1F]" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Active Jobs" value={overviewKpis.activeJobs} color="text-green-600" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Closed Jobs" value={overviewKpis.closedJobs} color="text-gray-500" onClick={() => setActiveTab("jobs")} />
                  <AnalyticsCard label="Total Candidates" value={overviewKpis.totalCandidates} color="text-[#3A1F1F]" onClick={() => setActiveTab("team")} />
                  <AnalyticsCard label="Applications Today" value={overviewKpis.applicationsToday} color="text-blue-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Interviews Scheduled" value={overviewKpis.interviewsScheduled} color="text-yellow-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Offers Released" value={overviewKpis.offersReleased} color="text-orange-600" onClick={() => setActiveTab("applications")} />
                  <AnalyticsCard label="Successful Hires" value={overviewKpis.successfulHires} color="text-green-600" onClick={() => setActiveTab("applications")} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF2B2B]/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-[#FF2B2B]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#3A1F1F]">Organization-wide hiring snapshot</p>
                    <p className="text-xs text-[#8A8A8A] mt-0.5">
                      Switch to Team, All Jobs, All Applications, or Analytics above for the full breakdown.
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Team Tab ── */}
          <TabsContent value="team">
            {/* Seat bar */}
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#3A1F1F]">Sub User Used</h3>
                  <p className="text-sm text-[#8A8A8A] mt-0.5">
                    {activeCount} of {maxSeats} seats used
                    {maxSeats - activeCount > 0 && ` · ${maxSeats - activeCount} available`}
                  </p>
                </div>
                <Button
                  onClick={() => { setInviteOpen(true); setInviteError(""); setInviteSuccess(false); }}
                  className="bg-[#FF2B2B] hover:bg-[#e02525] rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Invite Member
                </Button>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-[#FF2B2B] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${seatPct}%` }}
                />
              </div>
            </div>

            {/* Members table */}
            {dataLoading ? (
              <LoadingCard />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-[#3A1F1F]">
                    Team Members <span className="text-[#8A8A8A] font-normal">({members.length})</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={loadData} className="text-[#8A8A8A]">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Member</th>
                        <th className="text-left px-6 py-3">Role</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Jobs</th>
                        <th className="text-left px-6 py-3">Applications</th>
                        <th className="text-left px-6 py-3">Hires</th>
                        <th className="text-left px-6 py-3">Joined</th>
                        <th className="text-right px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials(member.recruiter_name, member.email)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#3A1F1F]">
                                  {member.recruiter_name || "(No name)"}
                                </p>
                                <p className="text-xs text-[#8A8A8A]">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {member.org_role === "admin" ? (
                              <Badge className="bg-[#FF2B2B] text-white text-xs gap-1">
                                <Crown className="h-3 w-3" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Member</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`text-xs ${member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                              variant="secondary"
                            >
                              {member.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F] font-medium">{member.jobs_count}</td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F] font-medium">{member.applications_count}</td>
                          <td className="px-6 py-4 text-sm text-green-600 font-medium">{member.hires_count}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(member.created_at)}</td>
                          <td className="px-6 py-4 text-right">
                            {member.id === user?.id ? (
                              <span className="text-xs text-[#8A8A8A] italic">You</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={actionLoading === member.id}
                                  >
                                    {actionLoading === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.is_active ? (
                                    <DropdownMenuItem
                                      onClick={() => handleMemberAction(member.id, "deactivate")}
                                      className="text-orange-600"
                                    >
                                      <UserX className="h-4 w-4 mr-2" /> Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleMemberAction(member.id, "activate")}
                                      className="text-green-600"
                                    >
                                      <UserCheck className="h-4 w-4 mr-2" /> Activate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleMemberAction(member.id, "remove")}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" /> Remove from Org
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                            No team members yet. Invite someone to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-[#3A1F1F]">
                    Pending Invitations <span className="text-[#8A8A8A] font-normal">({pendingInvitations.length})</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Email</th>
                        <th className="text-left px-6 py-3">Role</th>
                        <th className="text-left px-6 py-3">Sent</th>
                        <th className="text-left px-6 py-3">Expires</th>
                        <th className="text-right px-6 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingInvitations.map(inv => (
                        <tr key={inv.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4 text-sm text-[#3A1F1F]">{inv.invited_email}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="text-xs capitalize">{inv.role}</Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(inv.created_at)}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {fmtDate(inv.expires_at)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 text-xs h-7"
                              onClick={() => handleRevokeInvitation(inv.id)}
                            >
                              Revoke
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── All Jobs Tab ── */}
          <TabsContent value="jobs">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                <h3 className="font-semibold text-[#3A1F1F] whitespace-nowrap">
                  All Jobs <span className="text-[#8A8A8A] font-normal">({filteredJobs.length})</span>
                </h3>
                <Input
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  placeholder="Search by title or member…"
                  className="max-w-xs rounded-xl bg-[#F6F6F6] border-gray-200"
                />
              </div>
              {dataLoading ? <LoadingCard /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Job Title</th>
                        <th className="text-left px-6 py-3">Posted By</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Location</th>
                        <th className="text-left px-6 py-3">Views</th>
                        <th className="text-left px-6 py-3">Posted</th>
                        <th className="text-left px-6 py-3">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredJobs.map(job => (
                        <tr key={job.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-[#3A1F1F]">{job.title}</p>
                            <p className="text-xs text-[#8A8A8A]">{job.company_name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F]">{job.recruiter_name}</td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`text-xs ${STATUS_COLOR[job.status] || "bg-gray-100 text-gray-500"}`}
                              variant="secondary"
                            >
                              {job.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#8A8A8A]">{job.location || "—"}</td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F]">{job.views ?? 0}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(job.created_at)}</td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">
                            {job.deadline ? fmtDate(job.deadline) : "—"}
                          </td>
                        </tr>
                      ))}
                      {filteredJobs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                            No jobs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── All Applications Tab ── */}
          <TabsContent value="applications">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-semibold text-[#3A1F1F] whitespace-nowrap">
                  All Applications <span className="text-[#8A8A8A] font-normal">({filteredApps.length})</span>
                </h3>
                <select
                  value={appStatusFilter}
                  onChange={e => setAppStatusFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-[#F6F6F6] text-[#3A1F1F] outline-none"
                >
                  <option value="all">All statuses</option>
                  {["Applied", "Under Review", "Shortlisted", "Interview Scheduled",
                    "Offered", "Joined", "Hired", "Rejected", "On Hold"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
              </div>
              {dataLoading ? <LoadingCard /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Candidate</th>
                        <th className="text-left px-6 py-3">Job</th>
                        <th className="text-left px-6 py-3">Posted By</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3">Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredApps.map(app => (
                        <tr key={app.id} className="hover:bg-[#FFF8F8] transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-[#3A1F1F]">{app.candidate_name}</td>
                          <td className="px-6 py-4 text-sm text-[#3A1F1F]">{app.job_title}</td>
                          <td className="px-6 py-4 text-sm text-[#8A8A8A]">{app.recruiter_name}</td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`text-xs ${APP_STATUS_COLOR[app.status] || "bg-gray-100 text-gray-500"}`}
                              variant="secondary"
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#8A8A8A]">{fmtDate(app.applied_at)}</td>
                        </tr>
                      ))}
                      {filteredApps.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[#8A8A8A] text-sm">
                            No applications found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics">
            {dataLoading ? <LoadingCard /> : (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <AnalyticsCard label="Active Jobs" value={teamJobs.filter(j => j.status === "Active").length} color="text-green-600" />
                  <AnalyticsCard label="Total Applications" value={teamApps.length} color="text-blue-600" />
                  <AnalyticsCard label="Total Hires" value={teamApps.filter(a => ["Hired", "Joined"].includes(a.status)).length} color="text-purple-600" />
                  <AnalyticsCard label="Active Members" value={activeCount} color="text-[#FF2B2B]" />
                </div>

                {/* Per-member breakdown */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#3A1F1F]">Member Performance</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Member</th>
                          <th className="text-left px-6 py-3">Jobs Posted</th>
                          <th className="text-left px-6 py-3">Applications</th>
                          <th className="text-left px-6 py-3">Hires</th>
                          <th className="text-left px-6 py-3">Hire Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {members.map(m => {
                          const hireRate = m.applications_count > 0
                            ? ((m.hires_count / m.applications_count) * 100).toFixed(1)
                            : "0.0";
                          return (
                            <tr key={m.id} className="hover:bg-[#FFF8F8] transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold">
                                    {initials(m.recruiter_name, m.email)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[#3A1F1F]">
                                      {m.recruiter_name || "(No name)"}
                                      {m.id === user?.id && <span className="ml-1 text-xs text-[#8A8A8A]">(You)</span>}
                                    </p>
                                    <p className="text-xs text-[#8A8A8A]">{m.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-semibold text-[#3A1F1F]">{m.jobs_count}</span>
                                <div className="mt-1 w-24 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-green-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min((m.jobs_count / (Math.max(...members.map(x => x.jobs_count)) || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-semibold text-[#3A1F1F]">{m.applications_count}</span>
                                <div className="mt-1 w-24 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-400 h-1.5 rounded-full"
                                    style={{ width: `${Math.min((m.applications_count / (Math.max(...members.map(x => x.applications_count)) || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-green-600 font-semibold">{m.hires_count}</td>
                              <td className="px-6 py-4">
                                <span className={`text-sm font-semibold ${Number(hireRate) > 20 ? "text-green-600" : "text-[#8A8A8A]"}`}>
                                  {hireRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Subscription Usage Tab ── */}
          <TabsContent value="subscription_usage">
            {dataLoading ? <LoadingCard /> : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs text-[#8A8A8A] font-medium mb-2">Current Plan</p>
                    <p className="text-2xl font-bold text-[#FF2B2B] capitalize">
                      {activeSub ? activeSub.plan_id.replace(/[_-]/g, " ") : "Free Trial"}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs text-[#8A8A8A] font-medium mb-2">Expires On</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {activeSub ? fmtDate(activeSub.expires_at) : "N/A"}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs text-[#8A8A8A] font-medium mb-2">Total Profiles Viewed</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.profiles_viewed || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs text-[#8A8A8A] font-medium mb-2">Total Resumes Watched</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.resumes_used || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs text-[#8A8A8A] font-medium mb-2">Total Search Keywords</p>
                    <p className="text-2xl font-bold text-[#3A1F1F]">
                      {members.reduce((acc, m) => acc + (m.keywords_used || 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Per-member usage breakdown */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#3A1F1F]">Recruiter Usage Statistics</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F6F6F6] text-xs text-[#8A8A8A] font-medium uppercase tracking-wide">
                          <th className="text-left px-6 py-3">Recruiter Name</th>
                          <th className="text-left px-6 py-3">Jobs Posted</th>
                          <th className="text-left px-6 py-3">Profiles Viewed</th>
                          <th className="text-left px-6 py-3">Resumes Watched</th>
                          <th className="text-left px-6 py-3">Search Keywords Used</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {members.map(m => (
                          <tr key={m.id} className="hover:bg-[#FFF8F8] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#FF2B2B] text-white flex items-center justify-center text-xs font-bold">
                                  {initials(m.recruiter_name, m.email)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#3A1F1F]">
                                    {m.recruiter_name || "(No name)"}
                                    {m.id === user?.id && <span className="ml-1 text-xs text-[#8A8A8A]">(You)</span>}
                                  </p>
                                  <p className="text-xs text-[#8A8A8A]">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.jobs_count}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.profiles_viewed || 0}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.resumes_used || 0}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-[#3A1F1F]">
                              {m.keywords_used || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3A1F1F]">
              <Send className="h-5 w-5 text-[#FF2B2B]" /> Invite Team Member
            </DialogTitle>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-[#3A1F1F]">Invitation Sent!</p>
              <p className="text-sm text-[#8A8A8A] mt-1">
                An invite email has been sent to <strong>{inviteEmail || "the recipient"}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-[#8A8A8A] mb-4">
                  The invitee will receive an email with a secure link to join{" "}
                  <strong>{recruiterProfile?.company_name}</strong> as a team member.
                </p>
                <label className="text-sm font-medium text-[#3A1F1F] block mb-1.5">
                  Email address
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(""); }}
                  placeholder="colleague@company.com"
                  className="rounded-xl bg-[#F6F6F6] border-gray-200"
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
                {inviteError && (
                  <p className="text-red-500 text-xs mt-2">{inviteError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8A8A8A] bg-[#F6F6F6] rounded-xl p-3">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>
                  Seats: {activeCount + pendingInvitations.length} of {maxSeats} used
                  {maxSeats - activeCount - pendingInvitations.length <= 0 && (
                    <span className="text-red-500 font-medium ml-1">— Seat limit reached</span>
                  )}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => { setInviteOpen(false); setInviteEmail(""); setInviteError(""); }}
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full"
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                >
                  {inviteLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Invite</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, sub, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${onClick ? "hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.98]" : ""
        }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#F6F6F6] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs text-[#8A8A8A] font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#3A1F1F]">{value}</p>
      <p className="text-xs text-[#8A8A8A] mt-0.5">{sub}</p>
    </div>
  );
}

function AnalyticsCard({
  label, value, color, onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${onClick ? "hover:shadow-md cursor-pointer transition-all duration-200 active:scale-[0.98]" : ""
        }`}
    >
      <p className="text-xs text-[#8A8A8A] font-medium mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl p-12 flex items-center justify-center shadow-sm">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-[#FF2B2B] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#8A8A8A]">Loading…</p>
      </div>
    </div>
  );
}
