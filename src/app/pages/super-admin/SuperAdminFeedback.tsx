import { useEffect, useState, useCallback } from "react";
import { Star } from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase, Feedback } from "../../../lib/supabase";

const PAGE_SIZE = 20;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function SuperAdminFeedback() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("feedback").select("*", { count: "exact" });
    if (ratingFilter !== "all") query = query.eq("rating", Number(ratingFilter));
    if (userTypeFilter !== "all") query = query.eq("user_type", userTypeFilter);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count } = await query;
    setRows((data as Feedback[]) ?? []);
    setTotalCount(count ?? 0);

    const { data: allRatings } = await supabase.from("feedback").select("rating").limit(2000);
    if (allRatings && allRatings.length > 0) {
      setAvgRating(allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length);
    }
    setLoading(false);
  }, [page, ratingFilter, userTypeFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => setPage(1), [ratingFilter, userTypeFilter]);

  const columns: DataTableColumn<Feedback>[] = [
    { key: "user_email", header: "User", render: (row) => row.user_email || "—" },
    { key: "user_type", header: "Type", render: (row) => <Badge variant="outline">{row.user_type}</Badge> },
    { key: "rating", header: "Rating", render: (row) => <Stars rating={row.rating} /> },
    { key: "comment", header: "Comment", render: (row) => <span className="line-clamp-1 max-w-sm">{row.comment || "—"}</span> },
    { key: "created_at", header: "Date", render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard index={0} label="Total Feedback" value={totalCount} icon={Star} loading={loading} />
        <KpiCard index={1} label="Average Rating" value={avgRating ? avgRating.toFixed(2) : "—"} icon={Star} loading={loading} />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        filters={[
          {
            key: "rating",
            label: "Rating",
            value: ratingFilter,
            onChange: setRatingFilter,
            options: [
              { label: "All ratings", value: "all" },
              { label: "5 stars", value: "5" },
              { label: "4 stars", value: "4" },
              { label: "3 stars", value: "3" },
              { label: "2 stars", value: "2" },
              { label: "1 star", value: "1" },
            ],
          },
          {
            key: "user_type",
            label: "User type",
            value: userTypeFilter,
            onChange: setUserTypeFilter,
            options: [
              { label: "All", value: "all" },
              { label: "Recruiters", value: "recruiter" },
              { label: "Job seekers", value: "jobseeker" },
            ],
          },
        ]}
        onExportCsv={() =>
          exportRowsAsCsv(
            "feedback",
            [
              { key: "user_email", header: "User" },
              { key: "user_type", header: "Type" },
              { key: "rating", header: "Rating" },
              { key: "comment", header: "Comment" },
              { key: "created_at", header: "Date" },
            ],
            rows
          )
        }
      />
    </div>
  );
}
