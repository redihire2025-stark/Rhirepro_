import {
  UserPlus,
  Briefcase,
  FileText,
  Repeat,
  CreditCard,
  Radio,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { useActivityFeed } from "./useActivityFeed";
import type { ActivityEvent } from "../../../lib/supabase";

const EVENT_ICON: Record<ActivityEvent["event_type"], typeof UserPlus> = {
  recruiter_signup: UserPlus,
  jobseeker_signup: UserPlus,
  job_posted: Briefcase,
  application_submitted: FileText,
  application_status_changed: Repeat,
  payment_success: CreditCard,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}

export function ActivityFeed() {
  const { events, loading } = useActivityFeed(30);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Live Activity</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="size-3.5 text-emerald-500" />
          Live
        </span>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No activity yet.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const Icon = EVENT_ICON[event.event_type] ?? FileText;
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0 overflow-hidden"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {timeAgo(event.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
