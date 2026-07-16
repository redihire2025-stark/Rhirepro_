import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, Ban, CheckCircle, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function UsersManagement() {
  const [activeTab, setActiveTab] = useState<"jobseekers" | "recruiters">("jobseekers");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeTab, searchQuery]);

  async function fetchUsers() {
    setLoading(true);
    try {
      if (activeTab === "jobseekers") {
        let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
        if (searchQuery) {
          query = query.or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
        }
        const { data } = await query;
        setUsers(data || []);
      } else {
        let query = supabase.from("recruiter_profiles").select("*").order("created_at", { ascending: false }).limit(50);
        if (searchQuery) {
          query = query.or(`email.ilike.%${searchQuery}%,recruiter_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
        }
        const { data } = await query;
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleAdmin = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} super admin rights?`)) return;
    
    const table = activeTab === "jobseekers" ? "profiles" : "recruiter_profiles";
    await supabase.from(table).update({ is_super_admin: !currentStatus }).eq("id", id);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'jobseekers' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab("jobseekers")}
          >
            Job Seekers
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'recruiters' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab("recruiters")}
          >
            Recruiters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'jobseekers' ? 'candidates' : 'employers'} by name or email...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="pb-3 px-4">User Details</th>
                <th className="pb-3 px-4">{activeTab === 'recruiters' ? 'Company' : 'Location'}</th>
                <th className="pb-3 px-4">Joined Date</th>
                <th className="pb-3 px-4">Role</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {activeTab === 'jobseekers' 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name'
                            : user.recruiter_name || 'No Name'}
                        </span>
                        <span className="text-sm text-gray-500">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {activeTab === 'recruiters' ? (user.company_name || '-') : (user.location || '-')}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      {user.is_super_admin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <ShieldAlert className="w-3 h-3" /> Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          User
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, !!user.is_super_admin)}
                        >
                          {user.is_super_admin ? 'Revoke Admin' : 'Make Admin'}
                        </Button>
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
