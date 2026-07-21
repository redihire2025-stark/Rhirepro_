import { useLocation } from "react-router";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { findNavItemByPath } from "../../components/super-admin/nav-config";

export default function SuperAdminComingSoon() {
  const location = useLocation();
  const item = findNavItemByPath(location.pathname);
  const Icon = item?.icon ?? Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <Icon className="size-7" />
          </motion.div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold">{item?.label ?? "This module"}</h2>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item?.description ??
                "This module is planned for a future phase of the Super Admin portal."}
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70 pt-2">
            Phase 1 covers Dashboard, Recruiters, Job Seekers, Jobs, and Applications with real
            platform data. This section will ship with the same standard — real data only.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
