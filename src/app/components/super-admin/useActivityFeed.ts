import { useEffect, useState } from "react";
import { supabase, ActivityEvent } from "../../../lib/supabase";

export function useActivityFeed(limit = 30) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("activity_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (!cancelled) {
          setEvents((data as ActivityEvent[]) ?? []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel("super-admin-activity-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        (payload) => {
          setEvents((prev) => [payload.new as ActivityEvent, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { events, loading };
}
