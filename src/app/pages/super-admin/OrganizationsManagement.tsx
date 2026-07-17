import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, MoreVertical, Building2, ExternalLink } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface Organization {
  id: string;
  company_name: string;
  recruiter_name: string;
  email: string;
  phone: string;
  is_disabled: boolean;
  created_at: string;
  last_login_at: string;
}

export default function OrganizationsManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const { data, error } = await supabase
        .from("recruiter_profiles")
        .select("id, company_name, recruiter_name, email, phone, is_disabled, created_at, last_login_at")
        .or('is_org_admin.eq.true,org_role.eq.admin')
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error("Failed to fetch organizations", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrgs = organizations.filter(org => 
    org.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search organizations..." 
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
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Admin Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading organizations...</td></tr>
              ) : filteredOrgs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No organizations found.</td></tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{org.company_name || "Unknown Company"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{org.recruiter_name}</p>
                      <p className="text-xs text-gray-500">{org.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        org.is_disabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}>
                        {org.is_disabled ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600">
                        <ExternalLink className="w-4 h-4 mr-1" /> View
                      </Button>
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
