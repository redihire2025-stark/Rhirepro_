import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Users, Briefcase, Calendar, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function RecruiterDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchRecruiterDetails();
      fetchRecruiterJobs();
    }
  }, [id]);

  async function fetchRecruiterDetails() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      setRecruiter(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load recruiter details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecruiterJobs() {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .eq("recruiter_id", id)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading recruiter details...</div>;
  }

  if (!recruiter) {
    return <div className="p-8 text-center text-gray-500">Recruiter not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Recruiter Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{recruiter.recruiter_name || "Unknown"}</h2>
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" /> {recruiter.company_name || "Independent"}
                </p>
                <div className="mt-3 flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    recruiter.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  }`}>
                    {recruiter.is_disabled ? "Disabled" : "Active"}
                  </span>
                  {recruiter.is_org_admin && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      Org Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-y border-gray-100">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-semibold text-gray-900">{recruiter.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-semibold text-gray-900">{recruiter.phone || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Joined Date</p>
                  <p className="font-semibold text-gray-900">{new Date(recruiter.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-semibold text-gray-900">{recruiter.last_login_at ? new Date(recruiter.last_login_at).toLocaleDateString() : "Never"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" />
                Recent Jobs
              </h3>
              <Button variant="outline" size="sm">View All Jobs</Button>
            </div>
            
            {jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No jobs posted yet.</p>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <div key={job.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">Posted on {new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                      ${job.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        job.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
            
            <div className="space-y-4">
              <div className="relative pl-4 border-l-2 border-teal-200 pb-4">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500"></div>
                <p className="text-sm font-medium text-gray-900">Logged in</p>
                <p className="text-xs text-gray-500 mt-0.5">Today at 10:30 AM</p>
              </div>
              <div className="relative pl-4 border-l-2 border-teal-200 pb-4">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500"></div>
                <p className="text-sm font-medium text-gray-900">Posted a new job</p>
                <p className="text-xs text-gray-500 mt-0.5">Yesterday at 2:15 PM</p>
              </div>
              <div className="relative pl-4 border-l-2 border-transparent">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500"></div>
                <p className="text-sm font-medium text-gray-900">Account created</p>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(recruiter.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
