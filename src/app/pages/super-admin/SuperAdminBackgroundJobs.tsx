import { useEffect, useState } from "react";
import { ListTodo } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";

interface CronJobRow {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
}

export default function SuperAdminBackgroundJobs() {
  const [rows, setRows] = useState<CronJobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_super_admin_background_jobs").then(({ data }) => {
      setRows((data as CronJobRow[]) ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Reads directly from pg_cron, the scheduler already running in this Supabase project (it
        currently runs the job-expiry sweep every 5 minutes). No fabricated job-queue metrics.
      </p>
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <ListTodo className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Scheduled Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Schedule (cron)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Last Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No scheduled jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.jobname}>
                    <TableCell className="font-medium">{row.jobname}</TableCell>
                    <TableCell className="font-mono text-xs">{row.schedule}</TableCell>
                    <TableCell>
                      <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Paused"}</Badge>
                    </TableCell>
                    <TableCell>{row.last_run_at ? new Date(row.last_run_at).toLocaleString() : "Never"}</TableCell>
                    <TableCell>
                      {row.last_status ? (
                        <Badge variant={row.last_status === "succeeded" ? "default" : "destructive"}>{row.last_status}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
