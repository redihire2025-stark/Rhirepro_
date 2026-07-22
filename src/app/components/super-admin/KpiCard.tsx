import { useEffect, useRef, useState } from "react";
import { type LucideIcon, ArrowUpRight } from "lucide-react";
import { motion, animate } from "motion/react";
import { Card, CardContent } from "../ui/card";
import { cn } from "../ui/utils";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  index?: number;
}

export function KpiCard({ label, value, icon: Icon, delta, deltaLabel, loading, index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              {loading ? (
                <div className="h-8 w-20 mt-1 rounded bg-accent animate-pulse" />
              ) : (
                <p className="text-2xl font-semibold mt-1 tabular-nums">
                  {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
                </p>
              )}
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="size-5" />
            </div>
          </div>
          {typeof delta === "number" && !loading && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                delta >= 0 ? "text-emerald-600" : "text-destructive"
              )}
            >
              <ArrowUpRight className={cn("size-3.5", delta < 0 && "rotate-90")} />
              {delta >= 0 ? "+" : ""}
              {delta} {deltaLabel ?? "this week"}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
