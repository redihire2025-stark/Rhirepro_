import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  UsersRound,
  UserRound,
  Briefcase,
  FileStack,
  Trophy,
  IndianRupee,
  CreditCard,
  RefreshCw,
  Radio,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../../components/ui/chart";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { ActivityFeed } from "../../components/super-admin/ActivityFeed";
import { supabase } from "../../../lib/supabase";

interface DashboardKpis {
  total_recruiters: number;
  total_jobseekers: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_hires: number;
  total_revenue: number;
  active_subscriptions: number;
  new_recruiters_7d: number;
  new_jobseekers_7d: number;
  new_applications_7d: number;
}

interface SignupPoint {
  day: string;
  recruiters: number;
  jobseekers: number;
}

interface ApplicationPoint {
  day: string;
  applications: number;
  hires: number;
}

interface FunnelPoint {
  status: string;
  count: number;
}

const signupsChartConfig: ChartConfig = {
  recruiters: { label: "Recruiters", color: "var(--chart-1)" },
  jobseekers: { label: "Job Seekers", color: "var(--chart-2)" },
};

const applicationsChartConfig: ChartConfig = {
  applications: { label: "Applications", color: "var(--chart-1)" },
  hires: { label: "Hires", color: "var(--chart-2)" },
};

const funnelChartConfig: ChartConfig = {
  count: { label: "Applications", color: "var(--chart-1)" },
};

const REFRESH_INTERVAL_MS = 25_000;

function formatDay(day: string) {
  return new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default function SuperAdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [signups, setSignups] = useState<SignupPoint[]>([]);
  const [applications, setApplications] = useState<ApplicationPoint[]>([]);
  const [funnel, setFunnel] = useState<FunnelPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    const [kpisRes, signupsRes, appsRes, funnelRes] = await Promise.all([
      supabase.rpc("get_super_admin_dashboard_kpis"),
      supabase.rpc("get_super_admin_signups_timeseries", { p_days: 30 }),
      supabase.rpc("get_super_admin_applications_timeseries", { p_days: 30 }),
      supabase.rpc("get_super_admin_application_funnel"),
    ]);

    if (kpisRes.error) console.error("get_super_admin_dashboard_kpis:", kpisRes.error.message);
    if (signupsRes.error) console.error("get_super_admin_signups_timeseries:", signupsRes.error.message);
    if (appsRes.error) console.error("get_super_admin_applications_timeseries:", appsRes.error.message);
    if (funnelRes.error) console.error("get_super_admin_application_funnel:", funnelRes.error.message);

    // PostgREST serializes bigint/numeric columns as JSON strings (to avoid
    // JS float precision loss) — coerce to real numbers so animated counters
    // and chart axes work correctly instead of silently no-oping on strings.
    const row = kpisRes.data?.[0];
    if (row) {
      setKpis({
        total_recruiters: Number(row.total_recruiters),
        total_jobseekers: Number(row.total_jobseekers),
        total_jobs: Number(row.total_jobs),
        active_jobs: Number(row.active_jobs),
        total_applications: Number(row.total_applications),
        total_hires: Number(row.total_hires),
        total_revenue: Number(row.total_revenue),
        active_subscriptions: Number(row.active_subscriptions),
        new_recruiters_7d: Number(row.new_recruiters_7d),
        new_jobseekers_7d: Number(row.new_jobseekers_7d),
        new_applications_7d: Number(row.new_applications_7d),
      });
    }
    if (signupsRes.data) {
      setSignups(
        (signupsRes.data as SignupPoint[]).map((p) => ({
          day: p.day,
          recruiters: Number(p.recruiters),
          jobseekers: Number(p.jobseekers),
        }))
      );
    }
    if (appsRes.data) {
      setApplications(
        (appsRes.data as ApplicationPoint[]).map((p) => ({
          day: p.day,
          applications: Number(p.applications),
          hires: Number(p.hires),
        }))
      );
    }
    if (funnelRes.data) {
      setFunnel((funnelRes.data as FunnelPoint[]).map((f) => ({ status: f.status, count: Number(f.count) })));
    }
    setLoading(false);
    setLastSyncedAt(new Date());
  }, []);

  // Initial load + poll on an interval so the dashboard reflects new
  // signups/jobs/applications without a manual refresh.
  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Also refetch immediately whenever a real platform event happens, so the
  // numbers update the moment the live activity feed does.
  useEffect(() => {
    const channel = supabase
      .channel("super-admin-dashboard-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Tick the "X ago" label every 10s without refetching data.
  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <RefreshCw className="size-3" />
          </motion.span>
          Synced {timeAgo(lastSyncedAt)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={0}
          label="Total Recruiters"
          value={kpis?.total_recruiters ?? 0}
          icon={UsersRound}
          delta={kpis?.new_recruiters_7d}
          loading={loading}
        />
        <KpiCard
          index={1}
          label="Total Job Seekers"
          value={kpis?.total_jobseekers ?? 0}
          icon={UserRound}
          delta={kpis?.new_jobseekers_7d}
          loading={loading}
        />
        <KpiCard
          index={2}
          label="Jobs (Active)"
          value={`${kpis?.total_jobs ?? 0} (${kpis?.active_jobs ?? 0})`}
          icon={Briefcase}
          loading={loading}
        />
        <KpiCard
          index={3}
          label="Applications"
          value={kpis?.total_applications ?? 0}
          icon={FileStack}
          delta={kpis?.new_applications_7d}
          loading={loading}
        />
        <KpiCard index={4} label="Total Hires" value={kpis?.total_hires ?? 0} icon={Trophy} loading={loading} />
        <KpiCard
          index={5}
          label="Total Revenue"
          value={formatCurrency(kpis?.total_revenue ?? 0)}
          icon={IndianRupee}
          loading={loading}
        />
        <KpiCard
          index={6}
          label="Active Subscriptions"
          value={kpis?.active_subscriptions ?? 0}
          icon={CreditCard}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Signups (last 30 days)</CardTitle>
                <LiveDot />
              </CardHeader>
              <CardContent>
                <ChartContainer config={signupsChartConfig} className="h-[260px] w-full">
                  <AreaChart data={signups}>
                    <defs>
                      <linearGradient id="fillRecruiters" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-recruiters)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-recruiters)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillJobseekers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-jobseekers)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-jobseekers)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <ChartTooltip
                      cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                      content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="recruiters"
                      stroke="var(--color-recruiters)"
                      strokeWidth={2}
                      fill="url(#fillRecruiters)"
                      isAnimationActive
                      animationDuration={1000}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="jobseekers"
                      stroke="var(--color-jobseekers)"
                      strokeWidth={2}
                      fill="url(#fillJobseekers)"
                      isAnimationActive
                      animationDuration={1000}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Applications &amp; Hires (last 30 days)</CardTitle>
                <LiveDot />
              </CardHeader>
              <CardContent>
                <ChartContainer config={applicationsChartConfig} className="h-[260px] w-full">
                  <BarChart data={applications} barGap={4}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} />}
                    />
                    <Bar dataKey="applications" fill="var(--color-applications)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} />
                    <Bar dataKey="hires" fill="var(--color-hires)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.35, ease: "easeOut" }}
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Application Funnel</CardTitle>
                <LiveDot />
              </CardHeader>
              <CardContent>
                <ChartContainer config={funnelChartConfig} className="h-[280px] w-full">
                  <BarChart data={funnel} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="status" type="category" tickLine={false} axisLine={false} width={130} />
                    <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1000}>
                      {funnel.map((_, i) => (
                        <Cell key={i} fill="var(--color-count)" fillOpacity={1 - i * (0.7 / Math.max(funnel.length - 1, 1))} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          className="xl:col-span-1"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        >
          <ActivityFeed />
        </motion.div>
      </div>
    </div>
  );
}
