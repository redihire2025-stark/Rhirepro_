import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, Edit, Trash2, Eye, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function JobsManagement() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchJobs();
  }, [searchQuery, statusFilter]);

  async function fetchJobs() {
    setLoading(true);
    try {
      let query = supabase
        .from("jobs")
        .select("id, title, company_name, location, status, created_at, recruiter_id")
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
      }
      
      if (statusFilter !== "All") {
        query = query.eq("status", statusFilter);
      }
      
      const { data } = await query;
      setJobs(data || []);
    } catch (err) {
      console.error("Error fetching jobs", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job listing? This action cannot be undone.")) return;
    
    await supabase.from("jobs").delete().eq("id", id);
    fetchJobs();
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Paused" : "Active";
    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
    
    await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
    fetchJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Jobs Management</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search jobs by title or company..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Closed">Closed</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="pb-3 px-4">Job Title</th>
                <th className="pb-3 px-4">Company</th>
                <th className="pb-3 px-4">Location</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Posted Date</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading jobs...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No jobs found.</td></tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {job.title}
                        <a href={`/job/${job.id}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{job.company_name}</td>
                    <td className="py-4 px-4 text-gray-600">{job.location || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${job.status === 'Active' ? 'bg-green-100 text-green-800' : 
                          job.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(job.id, job.status)}
                        >
                          {job.status === 'Active' ? 'Pause' : 'Activate'}
                        </Button>
                        <button 
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          onClick={() => handleDeleteJob(job.id)}
                          title="Delete Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
