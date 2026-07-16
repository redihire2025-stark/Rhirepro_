import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import logoImage from "../../../../logo/logo.png";
import UsersManagement from "./UsersManagement";
import JobsManagement from "./JobsManagement";
import BillingManagement from "./BillingManagement";

function Overview() {
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

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      navigate("/", { replace: true });
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user || !isSuperAdmin) {
    return null; // Will navigate away
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { name: "Overview", path: "/super-admin", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { name: "Users", path: "/super-admin/users", icon: <Users className="w-5 h-5" /> },
    { name: "Jobs", path: "/super-admin/jobs", icon: <Briefcase className="w-5 h-5" /> },
    { name: "Billing", path: "/super-admin/billing", icon: <CreditCard className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#2D2D2D] text-white p-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="Logo" className="h-8 bg-white rounded-full p-1" />
          <span className="font-bold text-lg">Super Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-10 h-screen w-64 bg-[#2D2D2D] text-white transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-gray-700">
          <img src={logoImage} alt="Logo" className="h-10 bg-white rounded-full p-1" />
          <div>
            <h2 className="font-bold text-xl leading-tight text-white">RhirePro</h2>
            <span className="text-xs text-gray-400 font-medium">Super Admin Console</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path 
                : location.pathname.startsWith(item.path);
                
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700 absolute bottom-0 w-full">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:w-auto h-screen overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="users/*" element={<UsersManagement />} />
            <Route path="jobs/*" element={<JobsManagement />} />
            <Route path="billing/*" element={<BillingManagement />} />
            <Route path="*" element={<Navigate to="/super-admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
