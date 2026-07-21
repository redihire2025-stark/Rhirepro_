import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, Shield, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { supabase } from "../../../lib/supabase";

const ROLES = [
  {
    key: "owner",
    label: "Owner",
    icon: ShieldCheck,
    description: "Full platform access, including managing other admins and their roles.",
  },
  {
    key: "admin",
    label: "Admin",
    icon: Shield,
    description: "Full access to manage recruiters, job seekers, jobs, and applications.",
  },
  {
    key: "viewer",
    label: "Viewer",
    icon: Eye,
    description: "Read-only access — intended for stakeholders who need visibility without edit rights.",
  },
];

export default function SuperAdminRoles() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from("super_admins")
      .select("role")
      .then(({ data }) => {
        const next: Record<string, number> = {};
        (data ?? []).forEach((r) => {
          next[r.role] = (next[r.role] ?? 0) + 1;
        });
        setCounts(next);
      });
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        A fixed set of three roles, not a dynamic permission builder — that's a deliberately scoped
        first step rather than a half-built granular system. Manage who holds which role from{" "}
        <button className="text-primary underline" onClick={() => navigate("/super-admin/admin-team")}>
          Admin Team
        </button>
        .
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.key}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{role.label}</CardTitle>
                  <Badge variant="secondary" className="ml-auto">
                    {counts[role.key] ?? 0}
                  </Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/super-admin/admin-team")}>
                  Manage admins
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
