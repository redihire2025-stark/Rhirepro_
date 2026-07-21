import { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { IndianRupee, Receipt, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../../components/ui/chart";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface RevenuePoint {
  day: string;
  revenue: number;
  transaction_count: number;
}

interface PlanRevenue {
  plan_id: string;
  revenue: number;
  transaction_count: number;
}

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
};

const planChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
};

function formatDay(day: string) {
  return new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function SuperAdminRevenue() {
  const [timeseries, setTimeseries] = useState<RevenuePoint[]>([]);
  const [byPlan, setByPlan] = useState<PlanRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.rpc("get_super_admin_revenue_timeseries", { p_days: 30 }),
      supabase.rpc("get_super_admin_revenue_by_plan"),
    ]).then(([tsRes, planRes]) => {
      if (tsRes.data) setTimeseries(tsRes.data as RevenuePoint[]);
      if (planRes.data) setByPlan(planRes.data as PlanRevenue[]);
      setLoading(false);
    });
  }, []);

  const totalRevenue = timeseries.reduce((sum, p) => sum + Number(p.revenue), 0);
  const totalTransactions = timeseries.reduce((sum, p) => sum + Number(p.transaction_count), 0);
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard index={0} label="Revenue (30d)" value={formatCurrency(totalRevenue)} icon={IndianRupee} loading={loading} />
        <KpiCard index={1} label="Transactions (30d)" value={totalTransactions} icon={Receipt} loading={loading} />
        <KpiCard index={2} label="Avg. Transaction" value={formatCurrency(avgTicket)} icon={TrendingUp} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
            <AreaChart data={timeseries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `₹${v}`} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} isAnimationActive />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={planChartConfig} className="h-[280px] w-full">
            <BarChart data={byPlan} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <YAxis dataKey="plan_id" type="category" tickLine={false} axisLine={false} width={110} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} isAnimationActive />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
