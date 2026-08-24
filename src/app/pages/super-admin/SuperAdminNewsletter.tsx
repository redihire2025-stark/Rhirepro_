import { useEffect, useState, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Newspaper,
  Users,
  Mail,
  Send,
  Sparkles,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutList,
} from "lucide-react";
import { DataTable, DataTableColumn, exportRowsAsCsv } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { KpiCard } from "../../components/super-admin/KpiCard";
import { supabase, NewsletterSubscriber } from "../../../lib/supabase";
import {
  SAMPLE_NEWSLETTER_TEMPLATES,
  NewsletterTemplate,
  sendNewsletterBroadcast,
  wrapNewsletterHtml,
} from "../../../lib/newsletterBroadcast";

const PAGE_SIZE = 20;

export default function SuperAdminNewsletter() {
  const [activeTab, setActiveTab] = useState<"composer" | "subscribers">("composer");
  const [rows, setRows] = useState<NewsletterSubscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Campaign Composer State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("strategy-email-marketing");
  const [subject, setSubject] = useState<string>(SAMPLE_NEWSLETTER_TEMPLATES[0].subject);
  const [content, setContent] = useState<string>(SAMPLE_NEWSLETTER_TEMPLATES[0].content);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "idle"; message: string }>({
    type: "idle",
    message: "",
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("newsletter_subscribers").select("*", { count: "exact" });
    if (search.trim()) {
      query = query.ilike("email", `%${search.trim()}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    setRows((data as NewsletterSubscriber[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Handle template selection
  const handleSelectTemplate = (template: NewsletterTemplate) => {
    setSelectedTemplateId(template.id);
    setSubject(template.subject);
    setContent(template.content);
    setFeedback({ type: "idle", message: "" });
  };

  // Handle broadcast send
  const handleSendBroadcast = async () => {
    setFeedback({ type: "idle", message: "" });

    if (!subject.trim()) {
      setFeedback({ type: "error", message: "Please enter a subject line for the newsletter." });
      return;
    }

    if (!content.trim()) {
      setFeedback({ type: "error", message: "Please write or select content for your newsletter." });
      return;
    }

    setIsSending(true);
    const result = await sendNewsletterBroadcast({
      subject,
      contentHtml: content,
      templateId: selectedTemplateId,
    });
    setIsSending(false);

    if (result.success) {
      setFeedback({ type: "success", message: result.message });
      fetchRows(); // refresh count
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  const previewHtml = useMemo(() => {
    const rawHtml = wrapNewsletterHtml(subject, content, selectedTemplateId);
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
    });
  }, [subject, content, selectedTemplateId]);

  const columns: DataTableColumn<NewsletterSubscriber>[] = [
    {
      key: "email",
      header: "Subscriber Email",
      render: (row) => (
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Mail className="size-4 text-muted-foreground" />
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          Subscribed
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Subscribed Date",
      render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : "N/A"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Newspaper className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Newsletter & Email Broadcasts</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Create, preview, and send official newsletter campaigns to all subscribed users on RhirePro.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-foreground shadow-sm">
          <Users className="size-4 text-emerald-600" />
          <span>{totalCount} Total Audience</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard index={0} label="Total Subscribers" value={totalCount} icon={Users} loading={loading} />
        <KpiCard index={1} label="Active Channels" value="Email Broadcast" icon={Mail} loading={loading} />
        <KpiCard index={2} label="Pre-built Templates" value={SAMPLE_NEWSLETTER_TEMPLATES.length} icon={FileText} loading={loading} />
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <Button
          variant={activeTab === "composer" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("composer")}
          className="gap-2"
        >
          <Send className="size-4" />
          Create & Send
        </Button>
        <Button
          variant={activeTab === "subscribers" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("subscribers")}
          className="gap-2"
        >
          <LayoutList className="size-4" />
          Subscribers ({totalCount})
        </Button>
      </div>

      {/* TAB 1: COMPOSER & SEND */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 space-y-5 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Send className="size-4 text-primary" /> Campaign Composer
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="gap-1.5"
              >
                <Eye className="size-4" />
                {isPreviewMode ? "Edit HTML / Text" : "Live HTML Preview"}
              </Button>
            </div>

            {/* Template Quick Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const tmpl = SAMPLE_NEWSLETTER_TEMPLATES.find((t) => t.id === e.target.value);
                  if (tmpl) handleSelectTemplate(tmpl);
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SAMPLE_NEWSLETTER_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Subject Line
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter campaign subject line..."
                className="font-medium"
              />
            </div>

            {/* Content Field or Live Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Newsletter Content (HTML / Text)
              </label>
              {isPreviewMode ? (
                <div className="border border-border rounded-lg bg-muted/30 overflow-hidden min-h-[400px]">
                  <iframe
                    title="Newsletter Live Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[520px] border-0"
                  />
                </div>
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={14}
                  placeholder="Type newsletter content or HTML..."
                  className="font-mono text-xs leading-relaxed"
                />
              )}
            </div>

            {/* Feedback Message */}
            {feedback.message && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="size-5 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-4 text-emerald-600" />
                <span>
                  Targeting <strong>{totalCount}</strong> active subscriber{totalCount === 1 ? "" : "s"}
                </span>
              </div>

              <Button
                onClick={handleSendBroadcast}
                disabled={isSending || totalCount === 0}
                className="bg-[#FF2B2B] hover:bg-[#e02525] text-white px-6 gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending Broadcast...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send Newsletter Now
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar Info & Template Cards */}
          <div className="space-y-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" /> Campaign Summary
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between py-1 border-b border-border">
                  <span>Target Recipients:</span>
                  <span className="font-semibold text-foreground">{totalCount} subscribers</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span>Broadcast Status:</span>
                  <span className="font-semibold text-emerald-600">Ready to Send</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Sample Templates</h4>
              <div className="space-y-2.5">
                {SAMPLE_NEWSLETTER_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplateId === tmpl.id
                        ? "border-primary bg-primary/5 text-foreground font-semibold"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">{tmpl.name}</p>
                    <p className="text-[11px] line-clamp-2 mt-1">{tmpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIBERS LIST */}
      {activeTab === "subscribers" && (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id || row.email}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search subscriber emails..."
          onExportCsv={() =>
            exportRowsAsCsv(
              "newsletter_subscribers",
              [
                { key: "email", header: "Email" },
                { key: "created_at", header: "Subscribed Date" },
              ],
              rows
            )
          }
        />
      )}
    </div>
  );
}
