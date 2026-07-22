import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Bell, MessageCircle, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";

export default function SuperAdminCommunications() {
  const navigate = useNavigate();
  const [emailsToday, setEmailsToday] = useState<number | null>(null);
  const [notificationsTotal, setNotificationsTotal] = useState<number | null>(null);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", todayStart.toISOString())
      .then(({ count }) => setEmailsToday(count ?? 0));
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setNotificationsTotal(count ?? 0));
  }, []);

  const channels = [
    {
      label: "Email",
      icon: Mail,
      status: "live" as const,
      description: `${emailsToday ?? "…"} sent today via Brevo`,
      onClick: () => navigate("/super-admin/emails"),
    },
    {
      label: "In-app Notifications",
      icon: Bell,
      status: "live" as const,
      description: `${notificationsTotal ?? "…"} total delivered`,
      onClick: () => navigate("/super-admin/notifications"),
    },
    {
      label: "SMS",
      icon: MessageCircle,
      status: "not-integrated" as const,
      description: "No SMS provider is wired into this app yet.",
    },
    {
      label: "WhatsApp",
      icon: Smartphone,
      status: "not-integrated" as const,
      description: "Future-ready per the product spec — no integration exists yet.",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        A unified overview of every channel RhirePro can reach users through. Email and in-app
        notifications are real and already flowing — click through for logs. SMS and WhatsApp are
        shown honestly as not-yet-integrated rather than faked.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <Card
              key={channel.label}
              className={channel.onClick ? "cursor-pointer transition-shadow hover:shadow-md" : "opacity-70"}
              onClick={channel.onClick}
            >
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{channel.label}</CardTitle>
                    {channel.status === "live" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Live</Badge>
                    ) : (
                      <Badge variant="secondary">Not integrated</Badge>
                    )}
                  </div>
                  <CardDescription>{channel.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
