import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { CreditCard, Search, Tag, Plus, Check, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DataTablePagination } from "../../components/ui/data-table-pagination";
import { toast } from "sonner";

export default function BillingManagement() {
  const [activeTab, setActiveTab] = useState<"transactions" | "promocodes">("transactions");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Reset pagination on tab change
  useEffect(() => {
    setPageIndex(0);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, pageIndex, pageSize]);

  async function fetchData() {
    setLoading(true);
    try {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      if (activeTab === "transactions") {
        const { data, count, error } = await supabase
          .from("payment_transactions")
          .select("*, recruiter:recruiter_profiles(company_name, email)", { count: 'exact' })
          .order("created_at", { ascending: false })
          .range(from, to);
          
        if (error) throw error;
        setTransactions(data || []);
        setTotalCount(count || 0);
      } else {
        const { data, count, error } = await supabase
          .from("promo_codes")
          .select("*", { count: 'exact' })
          .order("created_at", { ascending: false })
          .range(from, to);
          
        if (error) throw error;
        setPromoCodes(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error(`Error fetching ${activeTab}`, err);
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePromoStatus = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this promo code?`)) return;
    
    try {
      const { error } = await supabase.from("promo_codes").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      toast.success(`Promo code ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update promo code");
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promo code?")) return;
    
    try {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promo code deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete promo code");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab("transactions")}
          >
            <CreditCard className="w-4 h-4" /> Transactions
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'promocodes' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab("promocodes")}
          >
            <Tag className="w-4 h-4" /> Promo Codes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">₹1,25,000</p>
          <p className="text-xs text-green-600 mt-1">+12% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Active Plans</p>
          <p className="text-2xl font-bold text-gray-900">45</p>
          <p className="text-xs text-gray-500 mt-1">12 Upcoming Renewals</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Expired Plans</p>
          <p className="text-2xl font-bold text-gray-900">8</p>
          <p className="text-xs text-red-500 mt-1">Requires follow-up</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Failed Payments</p>
          <p className="text-2xl font-bold text-gray-900">2</p>
          <p className="text-xs text-gray-500 mt-1">In last 30 days</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-6 pb-0">
          {activeTab === "transactions" ? (
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
            </div>
          ) : (
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Manage Promo Codes</h2>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5" onClick={() => alert("Feature coming soon")}>
                <Plus className="w-4 h-4" /> New Code
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === "transactions" ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr className="text-sm font-semibold text-gray-600">
                  <th className="py-3 px-4">Transaction ID / Date</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No transactions found.</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{tx.transaction_ref || tx.id.slice(0, 8)}</span>
                          <span className="text-sm text-gray-500">{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{tx.recruiter?.company_name || "Unknown"}</span>
                          <span className="text-sm text-gray-500">{tx.recruiter?.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900">
                        ₹{tx.final_amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${tx.status === 'success' ? 'bg-green-100 text-green-800' : 
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}
                        `}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr className="text-sm font-semibold text-gray-600">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading promo codes...</td></tr>
                ) : promoCodes.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">No promo codes found.</td></tr>
                ) : (
                  promoCodes.map((code) => (
                    <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-gray-900">{code.code}</td>
                      <td className="py-4 px-4 text-gray-600">
                        {code.discount_type === 'percentage' ? `${code.discount_value}%` : `₹${code.discount_value}`}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {code.used_count} / {code.max_uses || '∞'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${code.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        `}>
                          {code.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {code.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mr-2"
                          onClick={() => handleTogglePromoStatus(code.id, code.is_active)}
                        >
                          {code.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDeletePromo(code.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
