import { useEffect, useState, FormEvent } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { supabase } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

interface MaintenanceMode {
  enabled: boolean;
  message: string;
}
interface AnnouncementBanner {
  enabled: boolean;
  message: string;
}

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceMode>({ enabled: false, message: "" });
  const [announcement, setAnnouncement] = useState<AnnouncementBanner>({ enabled: false, message: "" });
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("*")
      .then(({ data }) => {
        (data ?? []).forEach((row) => {
          if (row.setting_key === "maintenance_mode") setMaintenance(row.setting_value as MaintenanceMode);
          if (row.setting_key === "announcement_banner") setAnnouncement(row.setting_value as AnnouncementBanner);
          if (row.setting_key === "support_contact_email") setSupportEmail(row.setting_value as string);
        });
        setLoading(false);
      });
  }, []);

  const saveSetting = async (key: string, value: unknown) => {
    setSaving(key);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString(), updated_by: userData.user?.id }, { onConflict: "setting_key" });
    setSaving(null);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    logAdminAction({ action: "settings.update", entityType: "platform_settings", entityId: key, afterValue: value });
    toast.success("Saved");
  };

  const handleSupportEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveSetting("support_contact_email", supportEmail);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        A few real, persisted platform toggles. SMTP, payment gateway, and API keys intentionally
        stay in Netlify environment variables — that's where secrets belong, and this page won't
        pretend to manage them.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance Mode</CardTitle>
          <CardDescription>Persisted platform-wide. Wire the public site to read this value when you're ready to enforce it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="maintenance-toggle">Enabled</Label>
            <Switch
              id="maintenance-toggle"
              checked={maintenance.enabled}
              disabled={loading}
              onCheckedChange={(checked) => {
                const next = { ...maintenance, enabled: checked };
                setMaintenance(next);
                saveSetting("maintenance_mode", next);
              }}
            />
          </div>
          <Textarea
            placeholder="Message shown to users during maintenance"
            value={maintenance.message}
            disabled={loading}
            onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
            onBlur={() => saveSetting("maintenance_mode", maintenance)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Announcement Banner</CardTitle>
          <CardDescription>A dismissible banner message for site-wide announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="announcement-toggle">Enabled</Label>
            <Switch
              id="announcement-toggle"
              checked={announcement.enabled}
              disabled={loading}
              onCheckedChange={(checked) => {
                const next = { ...announcement, enabled: checked };
                setAnnouncement(next);
                saveSetting("announcement_banner", next);
              }}
            />
          </div>
          <Textarea
            placeholder="Announcement text"
            value={announcement.message}
            disabled={loading}
            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            onBlur={() => saveSetting("announcement_banner", announcement)}
          />
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSupportEmailSubmit}>
          <CardHeader>
            <CardTitle className="text-base">Support Contact Email</CardTitle>
            <CardDescription>Shown wherever the app needs to point users to support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input type="email" value={supportEmail} disabled={loading} onChange={(e) => setSupportEmail(e.target.value)} />
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={saving === "support_contact_email"}>
              <SettingsIcon className="size-3.5" /> Save
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
