import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download, Printer, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { exportRowsAsCsv } from "../../components/ui/data-table";
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
}

interface FunnelPoint {
  status: string;
  count: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function SuperAdminReports() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [funnel, setFunnel] = useState<FunnelPoint[]>([]);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.rpc("get_super_admin_dashboard_kpis"),
      supabase.rpc("get_super_admin_application_funnel"),
    ]).then(([kpisRes, funnelRes]) => {
      if (kpisRes.data?.[0]) setKpis(kpisRes.data[0] as DashboardKpis);
      if (funnelRes.data) setFunnel(funnelRes.data as FunnelPoint[]);
    });
  }, []);

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save(`rhirepro-platform-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const exportCsv = () => {
    if (!kpis) return;
    exportRowsAsCsv(
      "platform-summary",
      [
        { key: "metric", header: "Metric" },
        { key: "value", header: "Value" },
      ],
      [
        { metric: "Total Recruiters", value: kpis.total_recruiters },
        { metric: "Total Job Seekers", value: kpis.total_jobseekers },
        { metric: "Total Jobs", value: kpis.total_jobs },
        { metric: "Active Jobs", value: kpis.active_jobs },
        { metric: "Total Applications", value: kpis.total_applications },
        { metric: "Total Hires", value: kpis.total_hires },
        { metric: "Total Revenue", value: kpis.total_revenue },
        { metric: "Active Subscriptions", value: kpis.active_subscriptions },
        ...funnel.map((f) => ({ metric: `Applications — ${f.status}`, value: f.count })),
      ]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          On-demand exports of real platform data. Scheduled/recurring reports aren't included —
          this stack has no job-queue infrastructure to run them, so it isn't faked here.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!kpis}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={!kpis || generating}>
            <Printer className="size-3.5" /> {generating ? "Generating…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="bg-white text-black p-8 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="size-5 text-[#FF2B2B]" />
          <h2 className="text-lg font-semibold">RhirePro — Platform Summary Report</h2>
        </div>
        <p className="text-xs text-gray-500 mb-6">Generated {new Date().toLocaleString()}</p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpis &&
            [
              ["Recruiters", kpis.total_recruiters],
              ["Job Seekers", kpis.total_jobseekers],
              ["Jobs (Active)", `${kpis.total_jobs} (${kpis.active_jobs})`],
              ["Applications", kpis.total_applications],
              ["Hires", kpis.total_hires],
              ["Revenue", formatCurrency(kpis.total_revenue)],
              ["Active Subscriptions", kpis.active_subscriptions],
            ].map(([label, value]) => (
              <div key={label as string} className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            ))}
        </div>

        <h3 className="text-sm font-semibold mb-2">Application Funnel</h3>
        <table className="w-full text-sm">
          <tbody>
            {funnel.map((f) => (
              <tr key={f.status} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">{f.status}</td>
                <td className="py-1.5 text-right font-medium">{f.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
