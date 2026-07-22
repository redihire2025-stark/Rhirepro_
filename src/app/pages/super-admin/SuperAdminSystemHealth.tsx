import { useEffect, useState } from "react";
import { Database, Zap, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface HealthRow {
  db_connected: boolean;
  db_response_ms: number;
  checked_at: string;
}

export default function SuperAdminSystemHealth() {
  const [health, setHealth] = useState<HealthRow | null>(null);
  const [checking, setChecking] = useState(true);

  const check = async () => {
    setChecking(true);
    const { data, error } = await supabase.rpc("get_super_admin_system_health");
    if (!error && data?.[0]) {
      setHealth(data[0] as HealthRow);
    } else {
      setHealth({ db_connected: false, db_response_ms: 0, checked_at: new Date().toISOString() });
    }
    setChecking(false);
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-2xl">
        This app runs on Netlify Functions (stateless, no persistent server) with Supabase as the
        only backend — there is no CPU/RAM/Redis/queue infrastructure to report on honestly. What's
        shown below is real: live Supabase connectivity and response time, checked every 30s.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          index={0}
          label="Database Connectivity"
          value={health?.db_connected ? "Connected" : "Unreachable"}
          icon={health?.db_connected ? CheckCircle2 : XCircle}
          loading={checking && !health}
        />
        <KpiCard
          index={1}
          label="DB Response Time"
          value={health ? `${health.db_response_ms.toFixed(1)} ms` : "—"}
          icon={Zap}
          loading={checking && !health}
        />
        <KpiCard index={2} label="Backend" value="Supabase (managed)" icon={Database} loading={false} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last checked</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge variant={health?.db_connected ? "default" : "destructive"}>
            {health?.db_connected ? "Healthy" : "Degraded"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {health ? new Date(health.checked_at).toLocaleString() : "—"} · re-checks every 30s
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
