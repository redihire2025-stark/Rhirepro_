import { useEffect, useState } from "react";
import { supabase, Profile } from "../../../lib/supabase";
import { Search, UserCircle, ExternalLink, ShieldAlert, CheckCircle } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { DataTablePagination } from "../../components/ui/data-table-pagination";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export default function JobSeekersManagement() {
  const navigate = useNavigate();
  const [jobSeekers, setJobSeekers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageIndex(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchJobSeekers();
  }, [pageIndex, pageSize, debouncedSearch]);

  async function fetchJobSeekers() {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: 'exact' });

      if (debouncedSearch) {
        query = query.or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order("created_at", { ascending: false })
        .range(from, to);
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      setJobSeekers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch job seekers", err);
      toast.error("Failed to load job seekers");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async (id: string, currentDisabled: boolean) => {
    const action = currentDisabled ? "enable" : "disable";
    if (!window.confirm(`Are you sure you want to ${action} this job seeker?`)) return;
    
    try {
      // Assumes is_disabled exists or will be added to profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ is_disabled: !currentDisabled } as any)
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success(`Job seeker ${currentDisabled ? "enabled" : "disabled"} successfully`);
      fetchJobSeekers();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} job seeker. Make sure is_disabled column exists in profiles table.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Job Seekers</h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search candidates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Experience</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading candidates...</td></tr>
              ) : jobSeekers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No candidates found.</td></tr>
              ) : (
                jobSeekers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <UserCircle className="w-6 h-6 text-blue-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.experience_type === 'fresher' ? 'Fresher' : user.total_experience || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.location || "Not specified"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}>
                        {user.is_disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-500 hover:text-indigo-600"
                          onClick={() => navigate(`/super-admin/job-seekers/${user.id}`)}
                          title="View Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={user.is_disabled ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                          onClick={() => handleToggleStatus(user.id, user.is_disabled)}
                          title={user.is_disabled ? "Enable Candidate" : "Disable Candidate"}
                        >
                          {user.is_disabled ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="border-t border-gray-100 bg-gray-50">
          <DataTablePagination 
            pageIndex={pageIndex}
            pageSize={pageSize}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            totalCount={totalCount}
          />
        </div>
      </div>
    </div>
  );
}
