import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Building2, Briefcase, Users, MapPin, TrendingUp, Eye,
  CheckCircle, Share2, Printer, Globe, Calendar,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { supabase } from "../../lib/supabase";

interface Company {
  recruiter_name: string | null;
  company_name: string | null;
  logo_url: string | null;
  industry: string | null;
  location: string | null;
  tagline: string | null;
  website: string | null;
}

interface Job {
  id: string;
  title: string;
  status: string;
  employment_type: string | null;
  location: string | null;
  views: number;
  openings: number;
  created_at: string;
  skills: string[] | null;
}

interface AppRecord {
  status: string;
  job_id: string;
}

export default function PublicReport() {
  const { recruiterId } = useParams<{ recruiterId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!recruiterId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [compRes, jobsRes, appsRes] = await Promise.all([
          supabase
            .from("recruiter_profiles")
            .select("recruiter_name, company_name, logo_url, industry, location, tagline, website")
            .eq("id", recruiterId)
            .single(),
          supabase
            .from("jobs")
            .select("id, title, status, employment_type, location, views, openings, created_at, skills")
            .eq("recruiter_id", recruiterId),
          supabase
            .from("applications")
            .select("status, job_id")
            .eq("recruiter_id", recruiterId),
        ]);

        if (compRes.error || !compRes.data) {
          setError(
            "This report is not publicly accessible. The recruiter may need to enable public access in their Supabase settings."
          );
          return;
        }
        setCompany(compRes.data as Company);
        setJobs((jobsRes.data || []) as Job[]);
        setApps((appsRes.data || []) as AppRecord[]);
      } catch {
        setError("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [recruiterId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF2B2B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A5A]">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-10 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-[#FF2B2B]" />
          </div>
          <h2 className="text-xl font-bold text-[#3A1F1F] mb-2">Report Unavailable</h2>
          <p className="text-[#8A8A8A] text-sm mb-6">{error}</p>
          <Link to="/">
            <Button className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full px-6">
              Back to RhirePro
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────
  const totalApps = apps.length;
  const activeJobs = jobs.filter(j => j.status === "Active").length;
  const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);

  const statusCounts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const funnelStages = [
    { label: "Applied",             count: totalApps,                              color: "bg-gray-400" },
    { label: "Reviewed",            count: statusCounts["Reviewed"] || 0,          color: "bg-blue-400" },
    { label: "Shortlisted",         count: statusCounts["Shortlisted"] || 0,       color: "bg-green-400" },
    { label: "Interview Scheduled", count: statusCounts["Interview Scheduled"] || 0, color: "bg-purple-400" },
    { label: "Offered",             count: statusCounts["Offered"] || 0,           color: "bg-yellow-400" },
  ];

  const jobsWithStats = jobs.map(j => {
    const jobApps = apps.filter(a => a.job_id === j.id);
    return {
      ...j,
      appCount:    jobApps.length,
      shortlisted: jobApps.filter(a => a.status === "Shortlisted").length,
      offered:     jobApps.filter(a => a.status === "Offered").length,
      ctr:         j.views > 0 ? `${((jobApps.length / j.views) * 100).toFixed(1)}%` : "—",
    };
  }).sort((a, b) => b.appCount - a.appCount);

  const companyName = company.company_name || company.recruiter_name || "Company";
  const reportDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const statusRows: { label: string; color: string }[] = [
    { label: "New",                color: "bg-gray-100 text-gray-700" },
    { label: "Reviewed",           color: "bg-blue-100 text-blue-700" },
    { label: "Shortlisted",        color: "bg-green-100 text-green-700" },
    { label: "Interview Scheduled",color: "bg-purple-100 text-purple-700" },
    { label: "Offered",            color: "bg-yellow-100 text-yellow-700" },
    { label: "Rejected",           color: "bg-red-100 text-red-700" },
  ].filter(s => (statusCounts[s.label] || 0) > 0);

  return (
    <div className="min-h-screen bg-[#F6F6F6] print:bg-white">

      {/* ── Top bar (hidden when printing) ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <Link to="/" className="text-xl font-bold text-[#3A1F1F] select-none">
            Red<span className="text-[#FF2B2B]">Hire</span>
            <span className="text-xs font-normal text-[#8A8A8A] ml-2 hidden sm:inline">· Public Hiring Report</span>
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`border-gray-200 rounded-full text-xs transition-all ${copied ? "border-green-400 text-green-600" : ""}`}
              onClick={copyLink}
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              {copied ? "Link copied!" : "Share"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 rounded-full text-xs"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 print:px-0 print:py-4">

        {/* ── Company header ── */}
        <div className="bg-gradient-to-r from-[#3A1F1F] to-[#FF2B2B] rounded-2xl p-8 mb-6 text-white print:rounded-none">
          <div className="flex items-center gap-5 flex-wrap">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={companyName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 flex-shrink-0 bg-white/10"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-10 w-10 text-white/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{companyName}</h1>
              {company.tagline && <p className="text-white/75 text-sm mt-1">{company.tagline}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/65">
                {company.industry && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />{company.industry}
                  </span>
                )}
                {company.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />{company.location}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-white/50 mb-0.5">Report generated</p>
              <p className="text-sm font-semibold text-white flex items-center gap-1 justify-end">
                <Calendar className="h-3.5 w-3.5" />{reportDate}
              </p>
            </div>
          </div>
        </div>

        {/* ── Key metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Jobs",         value: jobs.length,               icon: Briefcase,    color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Active Jobs",        value: activeJobs,                icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50" },
            { label: "Total Applications", value: totalApps,                 icon: Users,        color: "text-[#FF2B2B]",  bg: "bg-red-50" },
            { label: "Total Job Views",    value: totalViews.toLocaleString(), icon: Eye,        color: "text-purple-600", bg: "bg-purple-50" },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3`}>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div className="text-2xl font-bold text-[#3A1F1F]">{m.value}</div>
              <div className="text-xs text-[#8A8A8A] mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── Funnel + Status breakdown ── */}
        {totalApps > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">

            {/* Hiring Funnel */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-[#3A1F1F] mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#FF2B2B]" /> Hiring Funnel
              </h2>
              <div className="space-y-3">
                {funnelStages.map((stage, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#5A5A5A]">{stage.label}</span>
                      <span className="font-semibold text-[#3A1F1F]">{stage.count}</span>
                    </div>
                    <div className="h-8 bg-gray-50 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-lg flex items-center px-3 text-white text-xs font-medium transition-all`}
                        style={{
                          width: funnelStages[0].count > 0
                            ? `${Math.max(6, (stage.count / funnelStages[0].count) * 100)}%`
                            : "6%",
                        }}
                      >
                        {funnelStages[0].count > 0
                          ? `${((stage.count / funnelStages[0].count) * 100).toFixed(0)}%`
                          : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-[#3A1F1F] mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#FF2B2B]" /> Applications by Status
              </h2>
              <div className="space-y-3">
                {statusRows.map((s, i) => {
                  const count = statusCounts[s.label] || 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Badge className={`text-xs w-36 justify-center flex-shrink-0 ${s.color}`}>{s.label}</Badge>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF2B2B] rounded-full"
                          style={{ width: `${totalApps > 0 ? (count / totalApps) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#3A1F1F] w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Job performance table ── */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-[#3A1F1F] mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#FF2B2B]" /> Job Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-[#8A8A8A] font-medium">Job Title</th>
                    <th className="text-left py-3 px-2 text-[#8A8A8A] font-medium hidden md:table-cell">Location</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Status</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Views</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium">Applied</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium hidden sm:table-cell">CTR</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium hidden sm:table-cell">Shortlisted</th>
                    <th className="text-center py-3 px-2 text-[#8A8A8A] font-medium hidden sm:table-cell">Offered</th>
                    <th className="text-left py-3 px-2 text-[#8A8A8A] font-medium hidden lg:table-cell">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsWithStats.map((job, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-[#F6F6F6] transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-medium text-[#3A1F1F]">{job.title}</p>
                        {job.employment_type && (
                          <p className="text-xs text-[#8A8A8A]">{job.employment_type}</p>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-[#5A5A5A] hidden md:table-cell">{job.location || "—"}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={job.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center text-[#5A5A5A]">{(job.views || 0).toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-semibold text-[#3A1F1F]">{job.appCount}</td>
                      <td className="py-3 px-2 text-center text-blue-600 font-medium hidden sm:table-cell">{job.ctr}</td>
                      <td className="py-3 px-2 text-center text-green-600 font-semibold hidden sm:table-cell">{job.shortlisted}</td>
                      <td className="py-3 px-2 text-center text-yellow-600 font-semibold hidden sm:table-cell">{job.offered}</td>
                      <td className="py-3 px-2 text-xs text-[#8A8A8A] hidden lg:table-cell">
                        {new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center py-6 border-t border-gray-200 print:pt-4">
          <p className="text-sm text-[#8A8A8A]">
            Powered by{" "}
            <Link to="/" className="text-[#FF2B2B] font-semibold hover:underline print:no-underline">
              RhirePro
            </Link>{" "}
            · Report generated on {new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
          </p>
          <p className="text-xs text-[#AAAAAA] mt-1">
            This is a public report. Share the URL to give anyone read-only access.
          </p>
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
