import { NavLink } from "react-router";
import { motion } from "motion/react";
import { Badge } from "../ui/badge";
import { superAdminNavGroups } from "./nav-config";
import { cn } from "../ui/utils";
import logoImage from "../../../logo/logo.png";

export function SuperAdminSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <img src={logoImage} alt="RhirePro" className="w-9 h-9 rounded-lg" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">RhirePro</p>
          <p className="text-xs text-muted-foreground">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {superAdminNavGroups.map((group, groupIndex) => (
          <div key={group.label}>
            <p className="px-2.5 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: 0.02 * (groupIndex * 4 + itemIndex),
                      ease: "easeOut",
                    }}
                  >
                    <NavLink
                      to={item.path}
                      end={item.path === "/super-admin"}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                        )
                      }
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="size-4 transition-transform group-hover:scale-110" />
                        {item.label}
                      </span>
                      {item.status === "soon" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          Soon
                        </Badge>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
