import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Users, Briefcase, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

export default function Overview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecruiters: 0,
    activeJobs: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [{ count: usersCount }, { count: recruitersCount }, { count: jobsCount }] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("recruiter_profiles").select("*", { count: "exact", head: true }),
          supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "Active")
        ]);

        // Mock revenue for now as it would require complex aggregations
        const totalRevenue = 125000;

        setStats({
          totalUsers: usersCount || 0,
          totalRecruiters: recruitersCount || 0,
          activeJobs: jobsCount || 0,
          totalRevenue
        });
      } catch (err) {
        console.error("Failed to fetch super admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading overview stats...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Candidates" value={stats.totalUsers.toLocaleString()} icon={<Users className="w-6 h-6 text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Total Employers" value={stats.totalRecruiters.toLocaleString()} icon={<Briefcase className="w-6 h-6 text-green-600" />} color="bg-green-50" />
        <StatCard title="Active Jobs" value={stats.activeJobs.toLocaleString()} icon={<TrendingUp className="w-6 h-6 text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<CreditCard className="w-6 h-6 text-purple-600" />} color="bg-purple-50" />
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-yellow-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-gray-900">Pending Actions</h2>
        </div>
        <p className="text-gray-500 text-sm">No critical system alerts or pending verifications at this time.</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
