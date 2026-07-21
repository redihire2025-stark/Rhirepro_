import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Database as DatabaseIcon, Table as TableIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../../components/ui/chart";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface TableStat {
  table_name: string;
  row_estimate: number;
}

const chartConfig: ChartConfig = { row_estimate: { label: "Rows (est.)", color: "var(--chart-1)" } };

export default function SuperAdminDatabase() {
  const [stats, setStats] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_super_admin_table_stats").then(({ data }) => {
      setStats((data as TableStat[]) ?? []);
      setLoading(false);
    });
  }, []);

  const totalRows = stats.reduce((sum, s) => sum + Number(s.row_estimate), 0);
  const top10 = stats.slice(0, 10);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Row counts are Postgres's own planner estimates (<code>pg_class.reltuples</code>), the same
        numbers Supabase's own Table Editor uses — refreshed automatically by autovacuum, not exact
        live counts. A daily snapshot job (reusing the pg_cron extension already in this project)
        started collecting growth history today.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Tracked Tables" value={stats.length} icon={DatabaseIcon} loading={loading} />
        <KpiCard index={1} label="Total Rows (est.)" value={totalRows.toLocaleString()} icon={TableIcon} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Largest Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={top10} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="table_name" type="category" tickLine={false} axisLine={false} width={140} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="row_estimate" fill="var(--color-row_estimate)" radius={4} isAnimationActive />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Row Estimate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.table_name}>
                  <TableCell className="font-mono text-sm">{s.table_name}</TableCell>
                  <TableCell>{Number(s.row_estimate).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
