import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, ExternalLink, ShieldAlert, Users } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface Recruiter {
  id: string;
  recruiter_name: string;
  company_name: string;
  email: string;
  is_org_admin: boolean;
  is_disabled: boolean;
  created_at: string;
  last_login_at: string;
}

export default function RecruitersManagement() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRecruiters();
  }, []);

  async function fetchRecruiters() {
    try {
      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("id, recruiter_name, company_name, email, is_org_admin, is_disabled, created_at, last_login_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setRecruiters(data || []);
    } catch (err) {
      console.error("Failed to fetch recruiters", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecruiters = recruiters.filter(r => 
    r.recruiter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Recruiters</h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search recruiters..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Recruiter Name</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading recruiters...</td></tr>
              ) : filteredRecruiters.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No recruiters found.</td></tr>
              ) : (
                filteredRecruiters.map((recruiter) => (
                  <tr key={recruiter.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{recruiter.recruiter_name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{recruiter.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {recruiter.company_name || "Independent"}
                    </td>
                    <td className="px-6 py-4">
                      {recruiter.is_org_admin ? (
                        <span className="text-indigo-600 font-medium">Admin</span>
                      ) : (
                        <span className="text-gray-500">Member</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        recruiter.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}>
                        {recruiter.is_disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <ShieldAlert className="w-4 h-4" />
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
