import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Building2, Users, Briefcase, CreditCard, Activity, Calendar, ExternalLink, Shield, BarChart2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for things we don't have schema for easily accessible right now
  const mockData = {
    teamSize: Math.floor(Math.random() * 50) + 1,
    activeJobs: Math.floor(Math.random() * 10),
    totalJobs: Math.floor(Math.random() * 50) + 10,
    plan: "Pro",
    billingCycle: "Monthly",
    amount: "$99.00",
  };

  useEffect(() => {
    if (id) {
      fetchOrganizationDetails();
    }
  }, [id]);

  async function fetchOrganizationDetails() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      setOrg(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load organization details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading organization details...</div>;
  }

  if (!org) {
    return <div className="p-8 text-center text-gray-500">Organization not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Organization Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{org.company_name || "Unknown Company"}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                Admin: {org.recruiter_name} &bull; {org.email}
              </p>
              <div className="mt-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  org.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                }`}>
                  {org.is_disabled ? "Suspended" : "Active"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-100">
            <div>
              <p className="text-sm text-gray-500 mb-1">Joined Date</p>
              <p className="font-semibold text-gray-900">{new Date(org.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Login</p>
              <p className="font-semibold text-gray-900">{org.last_login_at ? new Date(org.last_login_at).toLocaleDateString() : "Never"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Phone</p>
              <p className="font-semibold text-gray-900">{org.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Company Website</p>
              <a href="#" className="font-semibold text-indigo-600 flex items-center gap-1 hover:underline">
                View Site <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
            
            {/* Top Row Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-3 text-gray-500">
                  <Users className="w-5 h-5 text-red-500" /> 
                  <span className="text-sm font-medium whitespace-nowrap">Team Members</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">1 active</div>
                <div className="text-sm text-gray-400">1 total</div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-3 text-gray-500">
                  <Shield className="w-5 h-5 text-blue-500" /> 
                  <span className="text-sm font-medium whitespace-nowrap">Sub-Users</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">1 / 10</div>
                <div className="text-sm text-gray-400">9 remaining</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-3 text-gray-500">
                  <Briefcase className="w-5 h-5 text-green-500" /> 
                  <span className="text-sm font-medium whitespace-nowrap">Total Jobs</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">27</div>
                <div className="text-sm text-gray-400">5 active</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-3 text-gray-500">
                  <BarChart2 className="w-5 h-5 text-purple-500" /> 
                  <span className="text-sm font-medium whitespace-nowrap">Total Apps</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">500</div>
                <div className="text-sm text-gray-400">0 hired</div>
              </div>
            </div>

            {/* Bottom Grid Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Total Recruiters</div>
                <div className="text-2xl font-bold text-gray-900">1</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Active Recruiters</div>
                <div className="text-2xl font-bold text-green-600">1</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Total Jobs</div>
                <div className="text-2xl font-bold text-gray-900">27</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Active Jobs</div>
                <div className="text-2xl font-bold text-green-600">5</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Closed Jobs</div>
                <div className="text-2xl font-bold text-gray-700">2</div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Total Candidates</div>
                <div className="text-2xl font-bold text-gray-900">500</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Applications Today</div>
                <div className="text-2xl font-bold text-blue-600">0</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Interviews Scheduled</div>
                <div className="text-2xl font-bold text-orange-500">2</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Offers Released</div>
                <div className="text-2xl font-bold text-red-500">0</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center">
                <div className="text-xs text-gray-500 mb-2">Successful Hires</div>
                <div className="text-2xl font-bold text-green-600">0</div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              Subscription & Billing
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Current Plan</span>
                <span className="font-semibold text-gray-900">{mockData.plan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Billing Cycle</span>
                <span className="font-semibold text-gray-900">{mockData.billingCycle}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">{mockData.amount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Next Invoice</span>
                <span className="font-semibold text-gray-900">Oct 1, 2026</span>
              </div>
            </div>
            
            <Button className="w-full mt-6" variant="outline">Manage Subscription</Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Recent Activity
            </h3>
            
            <div className="space-y-4">
              <div className="relative pl-4 border-l-2 border-indigo-200 pb-4">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500"></div>
                <p className="text-sm font-medium text-gray-900">Logged in</p>
                <p className="text-xs text-gray-500 mt-0.5">Today at 10:30 AM</p>
              </div>
              <div className="relative pl-4 border-l-2 border-indigo-200 pb-4">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500"></div>
                <p className="text-sm font-medium text-gray-900">Posted a new job</p>
                <p className="text-xs text-gray-500 mt-0.5">Yesterday at 2:15 PM</p>
              </div>
              <div className="relative pl-4 border-l-2 border-transparent">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500"></div>
                <p className="text-sm font-medium text-gray-900">Upgraded to Pro Plan</p>
                <p className="text-xs text-gray-500 mt-0.5">Aug 15, 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
