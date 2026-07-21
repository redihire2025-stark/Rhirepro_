import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase } from "../../../lib/supabase";

interface BucketUsage {
  bucket_id: string;
  object_count: number;
  total_bytes: number;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const BUCKET_LABELS: Record<string, string> = {
  reports: "Hiring Reports (public)",
  resumes: "Resumes (private)",
  "offer-letters": "Offer Letters (private)",
};

export default function SuperAdminStorage() {
  const [buckets, setBuckets] = useState<BucketUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_super_admin_storage_usage").then(({ data }) => {
      setBuckets((data as BucketUsage[]) ?? []);
      setLoading(false);
    });
  }, []);

  const totalBytes = buckets.reduce((sum, b) => sum + Number(b.total_bytes), 0);
  const totalObjects = buckets.reduce((sum, b) => sum + Number(b.object_count), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Total Storage Used" value={formatBytes(totalBytes)} icon={HardDrive} loading={loading} />
        <KpiCard index={1} label="Total Objects" value={totalObjects} icon={HardDrive} loading={loading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {buckets.map((bucket) => (
          <Card key={bucket.bucket_id}>
            <CardContent className="pt-6 space-y-1">
              <p className="text-sm text-muted-foreground">{BUCKET_LABELS[bucket.bucket_id] || bucket.bucket_id}</p>
              <p className="text-2xl font-semibold">{formatBytes(bucket.total_bytes)}</p>
              <p className="text-xs text-muted-foreground">{bucket.object_count.toLocaleString()} objects</p>
            </CardContent>
          </Card>
        ))}
        {!loading && buckets.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">No files uploaded to storage yet.</p>
        )}
      </div>
    </div>
  );
}
