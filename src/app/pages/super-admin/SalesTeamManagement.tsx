import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, TrendingUp, Users, ExternalLink, ShieldAlert, Target } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface SalesMember {
  id: string;
  name: string;
  employee_id: string;
  email: string;
  designation: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  conversion_count?: number;
}

export default function SalesTeamManagement() {
  const [salesTeam, setSalesTeam] = useState<SalesMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    fetchSalesTeam();
  }, []);

  async function fetchSalesTeam() {
    try {
      const { data, error } = await supabase
        .from("sales_team")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          setDbError(true);
          return;
        }
        throw error;
      }

      // In a real scenario, we'd also aggregate conversions from recruiter_profiles 
      // where referral_email = sales_member.email
      // For now, mapping data
      setSalesTeam(data || []);
    } catch (err) {
      console.error("Failed to fetch sales team", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTeam = salesTeam.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (dbError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Team</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Database Migration Required</h2>
          <p className="mb-4">The <code>sales_team</code> table does not exist in your Supabase database yet. To enable the Sales Team and Referral tracking features, please run the provided SQL migration script in your Supabase SQL Editor.</p>
          <p className="text-sm opacity-80">Once the script is executed, refresh this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Sales Team Management</h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search sales members..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-blue-50 text-blue-600">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm text-gray-500 font-medium">Total Members</p>
               <p className="text-2xl font-bold text-gray-900">{salesTeam.length}</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-green-50 text-green-600">
               <Target className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm text-gray-500 font-medium">Active Conversions</p>
               <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-4 rounded-full bg-purple-50 text-purple-600">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm text-gray-500 font-medium">Generated Revenue</p>
               <p className="text-2xl font-bold text-gray-900">₹0</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Sales Member</th>
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Referral Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading sales team...</td></tr>
              ) : filteredTeam.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No sales members found.</td></tr>
              ) : (
                filteredTeam.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {member.employee_id}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {member.referral_code || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        !member.is_active ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}>
                        {!member.is_active ? "Inactive" : "Active"}
                      </span>
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
