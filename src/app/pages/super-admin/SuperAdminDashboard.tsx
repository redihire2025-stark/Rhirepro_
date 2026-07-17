import { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router";
import { useAuth } from "../../../lib/auth-context";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  CreditCard,
  Activity,
  LogOut,
  Menu,
  X,
  UserCheck
} from "lucide-react";
import logoImage from "../../../logo/logo.png";

import Overview from "./Overview";
import OrganizationsManagement from "./OrganizationsManagement";
import OrganizationDetails from "./OrganizationDetails";
import JobSeekersManagement from "./JobSeekersManagement";
import JobSeekerDetails from "./JobSeekerDetails";
import RecruitersManagement from "./RecruitersManagement";
import RecruiterDetails from "./RecruiterDetails";
import SalesTeamManagement from "./SalesTeamManagement";
import BillingManagement from "./BillingManagement";
import PlatformMonitoring from "./PlatformMonitoring";
// Keeping jobs management if they still want it separate from organizations
import JobsManagement from "./JobsManagement";

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
    { name: "Dashboard", path: "/super-admin", icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { name: "Organizations", path: "/super-admin/organizations", icon: <Building2 className="w-5 h-5" /> },
    { name: "Job Seekers", path: "/super-admin/job-seekers", icon: <UserCheck className="w-5 h-5" /> },
    { name: "Recruiters", path: "/super-admin/recruiters", icon: <Users className="w-5 h-5" /> },
    { name: "Sales Team", path: "/super-admin/sales-team", icon: <TrendingUp className="w-5 h-5" /> },
    { name: "Revenue", path: "/super-admin/billing", icon: <CreditCard className="w-5 h-5" /> },
    { name: "Monitoring", path: "/super-admin/monitoring", icon: <Activity className="w-5 h-5" /> },
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
            
            <Route path="organizations" element={<OrganizationsManagement />} />
            <Route path="organizations/:id" element={<OrganizationDetails />} />
            
            <Route path="job-seekers" element={<JobSeekersManagement />} />
            <Route path="job-seekers/:id" element={<JobSeekerDetails />} />
            
            <Route path="recruiters" element={<RecruitersManagement />} />
            <Route path="recruiters/:id" element={<RecruiterDetails />} />
            
            <Route path="sales-team/*" element={<SalesTeamManagement />} />
            <Route path="billing/*" element={<BillingManagement />} />
            <Route path="monitoring/*" element={<PlatformMonitoring />} />
            {/* Keeping old routes just in case */}
            <Route path="jobs/*" element={<JobsManagement />} />
            <Route path="*" element={<Navigate to="/super-admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
