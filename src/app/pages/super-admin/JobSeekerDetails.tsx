import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import { ArrowLeft, UserCircle, MapPin, Briefcase, GraduationCap, FileText, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function JobSeekerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seeker, setSeeker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use mock or real sub-tables if they exist. Here we simulate applications.
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchSeekerDetails();
      fetchApplications();
    }
  }, [id]);

  async function fetchSeekerDetails() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      setSeeker(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchApplications() {
    try {
      // Assuming 'applications' table has job_id with foreign key to jobs
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, applied_at, job:job_id (title, company_name)")
        .eq("profile_id", id)
        .order("applied_at", { ascending: false })
        .limit(5);
        
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading candidate details...</div>;
  }

  if (!seeker) {
    return <div className="p-8 text-center text-gray-500">Candidate not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {seeker.avatar_url ? (
                <img src={seeker.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-gray-50" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-sm">
                  <UserCircle className="w-12 h-12 text-blue-400" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{seeker.first_name} {seeker.last_name}</h2>
                    <p className="text-gray-600 font-medium text-lg mt-1">{seeker.headline || seeker.current_title || "No title provided"}</p>
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" /> {seeker.location || "Location not specified"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    seeker.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  }`}>
                    {seeker.is_disabled ? "Disabled" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">About</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{seeker.about || "No summary provided."}</p>
            </div>

            {seeker.skills && seeker.skills.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {seeker.skills.map((skill: string, index: number) => (
                    <span key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-400" />
              Recent Applications
            </h3>
            
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No applications found.</p>
            ) : (
              <div className="space-y-4">
                {applications.map(app => (
                  <div key={app.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{app.job?.title || "Unknown Job"}</p>
                      <p className="text-sm text-gray-500">{app.job?.company_name || "Unknown Company"}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {app.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                <p className="font-medium text-gray-900">{seeker.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                <p className="font-medium text-gray-900">{seeker.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Joined Date</p>
                <p className="font-medium text-gray-900">{new Date(seeker.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Experience</p>
                  <p className="font-medium text-gray-900">
                    {seeker.experience_type === "fresher" ? "Fresher" : seeker.total_experience || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Salary</p>
                  <p className="font-medium text-gray-900">{seeker.current_salary || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notice Period</p>
                  <p className="font-medium text-gray-900">{seeker.notice_period || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <Button className="w-full" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Resume
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
