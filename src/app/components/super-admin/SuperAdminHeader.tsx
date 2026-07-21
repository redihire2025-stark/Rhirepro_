import { useNavigate, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, User } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSuperAdminAuth } from "../../../lib/super-admin-auth-context";
import { findNavItemByPath } from "./nav-config";

function pageTitleForPath(pathname: string): string {
  const item = findNavItemByPath(pathname);
  if (item) return item.label;
  if (pathname.startsWith("/super-admin/recruiters")) return "Recruiters";
  if (pathname.startsWith("/super-admin/jobseekers")) return "Job Seekers";
  if (pathname.startsWith("/super-admin/jobs")) return "Jobs";
  if (pathname.startsWith("/super-admin/applications")) return "Applications";
  return "Dashboard";
}

export function SuperAdminHeader() {
  const { superAdmin, signOut } = useSuperAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/super-admin/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.h1
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-lg font-semibold"
          >
            {pageTitleForPath(location.pathname)}
          </motion.h1>
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Live
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="hidden sm:inline max-w-[160px] truncate">
                {superAdmin?.email ?? "Admin"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{superAdmin?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
