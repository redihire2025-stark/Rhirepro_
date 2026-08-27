import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Send, Undo2, Trash2, Pencil, Upload, BookOpen, Loader2 } from "lucide-react";
import { DataTable, DataTableColumn } from "../../components/ui/data-table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { supabase, Blog } from "../../../lib/supabase";
import { logAdminAction } from "../../../lib/admin-audit";

/**
 * Authoring for Super Admin blog posts.
 *
 * Blogs live in their own `blogs` table, separate from recruiter-authored
 * `recruiter_articles`. Before this existed there was no blogs table at all and
 * both listings read the same rows, which is why "View More" could only ever
 * reach one kind of content.
 *
 * Writes rely on the "Super admins manage blogs" RLS policy; drafts are
 * invisible to the public because the read policy filters on status.
 */

const PAGE_SIZE = 15;

const SEED_OR_PLATFORM_TITLES = new Set([
  "building a strong employer brand for better hiring",
  "why remote work continues to grow in 2026",
  "top interview mistakes candidates should avoid",
  "how companies are adapting to hiring challenges",
  "how to make your resume stand out in 2026",
  "10 proven strategies to attract and hire top software engineers",
  "5 interview tips every job seeker should know",
  "how to build a strong employer brand to attract top talent",
]);

function formatPostedBy(row: Blog, companyMap: Record<string, string> = {}): string {
  const cleanTitle = (row.title || "").trim().toLowerCase();
  let author = (row.author_name || "").trim();

  if (SEED_OR_PLATFORM_TITLES.has(cleanTitle)) {
    return "Super Admin";
  }

  if (!author || author === "RhirePro Editorial" || author === "RhirePro" || author.toLowerCase() === "super admin") {
    return "Super Admin";
  }

  if (author.toLowerCase() === "monkey" || author.toLowerCase() === "org admin - monkey") {
    author = "DOODLE";
  }

  // Look up company name from profile map or cleaned author string
  const resolvedCompany =
    (row.author_id ? companyMap[row.author_id] : null) ||
    companyMap[author] ||
    (author.toLowerCase().startsWith("org admin")
      ? author.replace(/^org admin\s*[-:]?\s*/i, "").trim()
      : author);

  let finalName = (resolvedCompany || author).trim();

  if (finalName.toLowerCase() === "monkey") {
    finalName = "DOODLE";
  }

  if (!finalName || finalName.toLowerCase() === "super admin" || finalName === "RhirePro") {
    return "Super Admin";
  }

  return `Org Admin - ${finalName}`;
}

const EMPTY_DRAFT = {
  title: "",
  category: "Industry Insights",
  summary: "",
  key_takeaway: "",
  content: "",
  cover_image_url: "",
  author_name: "",
  read_time: 5,
  tags: "",
};

type DraftForm = typeof EMPTY_DRAFT;

export default function SuperAdminBlogs() {
  const [rows, setRows] = useState<Blog[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const formSnapshotRef = useRef<DraftForm>(EMPTY_DRAFT);

  const fetchRows = useCallback(async () => {
    setLoading(true);

    // Auto-fix legacy database rows where author_name was saved as recruiter_name 'monkey'
    try {
      await supabase.from("blogs").update({ author_name: "DOODLE" }).eq("author_name", "monkey");
    } catch (_) {
      // Ignore if RLS prevents silent background repair
    }

    let query = supabase.from("blogs").select("*", { count: "exact" });
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) toast.error(`Failed to load blogs: ${error.message}`);

    // Resolve recruiter profile and company names from recruiter_profiles, jobs, and invitations
    const map: Record<string, string> = { monkey: "DOODLE" };

    const [profilesRes, jobsRes, invsRes] = await Promise.all([
      supabase.from("recruiter_profiles").select("id, email, company_name, recruiter_name"),
      supabase.from("jobs").select("recruiter_id, company_name"),
      supabase.from("recruiter_invitations").select("org_admin_id, company_name"),
    ]);

    if (jobsRes.data) {
      jobsRes.data.forEach((j) => {
        if (j.recruiter_id && j.company_name?.trim()) {
          map[j.recruiter_id] = j.company_name.trim();
        }
      });
    }

    if (invsRes.data) {
      invsRes.data.forEach((inv) => {
        if (inv.org_admin_id && inv.company_name?.trim()) {
          map[inv.org_admin_id] = inv.company_name.trim();
        }
      });
    }

    if (profilesRes.data) {
      profilesRes.data.forEach((p) => {
        const cName = (p.company_name || "").trim();
        const rName = (p.recruiter_name || "").trim();
        const comp = cName || rName;
        if (comp) {
          if (p.id) map[p.id] = comp;
          if (p.email) map[p.email] = comp;
          if (rName) map[rName] = comp;
        }
      });
    }

    setCompanyMap(map);

    setRows((data as Blog[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_DRAFT);
    formSnapshotRef.current = EMPTY_DRAFT;
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (row: Blog) => {
    setEditing(row);
    const draft = {
      title: row.title ?? "",
      category: row.category ?? "Industry Insights",
      summary: row.summary ?? "",
      key_takeaway: row.key_takeaway ?? "",
      content: row.content ?? "",
      cover_image_url: row.cover_image_url ?? "",
      author_name: row.author_name ?? "",
      read_time: row.read_time ?? 5,
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
    };
    setForm(draft);
    formSnapshotRef.current = draft;
    setFormError("");
    setModalOpen(true);
  };

  // A stray click on the overlay or the Cancel button used to close the
  // dialog immediately, silently discarding whatever was typed. Now it only
  // closes outright when the form still matches what it was opened with;
  // otherwise it asks for confirmation first.
  const hasUnsavedBlogChanges = () =>
    JSON.stringify(form) !== JSON.stringify(formSnapshotRef.current);

  const requestCloseModal = () => {
    if (hasUnsavedBlogChanges()) {
      setDiscardConfirmOpen(true);
    } else {
      setModalOpen(false);
    }
  };

  const save = async (publish: boolean) => {
    if (!form.title.trim()) {
      setFormError("Blog title is required.");
      toast.error("Blog title is required.");
      return;
    }
    if (!form.summary.trim()) {
      setFormError("Blog summary is required.");
      toast.error("Blog summary is required.");
      return;
    }
    if (!form.cover_image_url.trim()) {
      setFormError("Cover image is required. Please upload an image from your device.");
      toast.error("Cover image is required. Please upload an image from your device.");
      return;
    }
    if (!form.content.trim()) {
      setFormError("Blog content is required.");
      toast.error("Blog content is required.");
      return;
    }
    setSaving(true);
    setFormError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      category: form.category.trim() || "Industry Insights",
      summary: form.summary.trim() || null,
      key_takeaway: form.key_takeaway.trim() || null,
      content: form.content,
      cover_image_url: form.cover_image_url.trim() || null,
      author_name: form.author_name.trim() || null,
      read_time: Number(form.read_time) || 5,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: publish ? "Published" : "Draft",
      updated_at: new Date().toISOString(),
    };

    // Stamp published_at the first time it goes live, and leave it alone
    // afterwards so re-editing a live post does not reorder the listing.
    if (publish && !(editing && editing.published_at)) {
      payload.published_at = new Date().toISOString();
    }

    let error;
    if (editing) {
      ({ error } = await supabase.from("blogs").update(payload).eq("id", editing.id));
    } else {
      payload.author_id = user?.id ?? null;
      ({ error } = await supabase.from("blogs").insert(payload));
    }

    setSaving(false);
    if (error) {
      setFormError(`Save failed: ${error.message}`);
      toast.error(`Save failed: ${error.message}`);
      return;
    }

    if (user) {
      logAdminAction(
        user.id,
        user.email ?? "admin",
        editing ? "update_blog" : "create_blog",
        "blogs",
        editing?.id,
        { title: payload.title, status: payload.status },
      );
    }

    toast.success(editing ? "Blog updated successfully." : "Blog published successfully.");
    setModalOpen(false);
    fetchRows();
  };

  const setStatus = async (row: Blog, status: "Published" | "Draft") => {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "Published" && !row.published_at) {
      payload.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from("blogs").update(payload).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
      return;
    }
    toast.success(`Blog status changed to ${status}.`);
    fetchRows();
  };

  const remove = async (row: Blog) => {
    if (!confirm(`Are you sure you want to delete "${row.title}"?`)) return;
    const { error } = await supabase.from("blogs").delete().eq("id", row.id);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success("Blog deleted.");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      logAdminAction(user.id, user.email ?? "admin", "delete_blog", "blogs", row.id, {
        title: row.title,
      });
    }

    fetchRows();
  };

  const columns: DataTableColumn<Blog>[] = [
    { key: "title", header: "Blog", render: (row) => row.title },
    {
      key: "author_name",
      header: "Posted By",
      render: (row) => {
        const postedByText = formatPostedBy(row, companyMap);
        const isSuperAdmin = postedByText === "Super Admin";
        return (
          <Badge
            className={
              isSuperAdmin
                ? "bg-purple-100 text-purple-700 border-purple-200 font-medium"
                : "bg-blue-50 text-blue-700 border-blue-200 font-medium"
            }
          >
            {postedByText}
          </Badge>
        );
      },
    },
    { key: "category", header: "Category", render: (row) => row.category || "—" },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.status === "Published" ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Published</Badge>
        ) : (
          <Badge variant="secondary">Draft</Badge>
        ),
    },
    {
      key: "published_at",
      header: "Published",
      render: (row) => (row.published_at ? new Date(row.published_at).toLocaleDateString() : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Blogs</h1>
          <p className="text-sm text-muted-foreground">
            Platform posts shown at /blog. Recruiter-written Articles are separate and appear at /articles.
          </p>
        </div>
        <Button onClick={openNew} className="bg-[#FF2B2B] hover:bg-[#e02525] text-white rounded-full">
          <Plus className="size-4 mr-1" /> Create Blog
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title..."
        filters={[
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All", value: "all" },
              { label: "Published", value: "Published" },
              { label: "Draft", value: "Draft" },
            ],
          },
        ]}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Pencil className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              {row.status === "Published" ? (
                <DropdownMenuItem onClick={() => setStatus(row, "Draft")}>
                  <Undo2 className="size-4 mr-2" /> Move to draft
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setStatus(row, "Published")}>
                  <Send className="size-4 mr-2" /> Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => remove(row)} className="text-destructive">
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={(open) => { if (open) setModalOpen(true); else requestCloseModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3A1F1F]">
              <BookOpen className="h-5 w-5 text-[#FF2B2B]" />
              {editing ? "Edit Blog" : "Create New Blog"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {formError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">
                {formError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Blog Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setFormError("");
                }}
                placeholder="e.g., 10 Strategies for Hiring Top Software Engineers"
                className="rounded-xl bg-[#F6F6F6] border-gray-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                  Category
                </label>
                <select
                  value={form.category || "Industry Insights"}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs font-medium text-[#3A1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
                >
                  <option value="Career Advice">Career Advice</option>
                  <option value="Hiring Trends">Hiring Trends</option>
                  <option value="Interview Tips">Interview Tips</option>
                  <option value="Employer Tips">Employer Tips</option>
                  <option value="Work Trends">Work Trends</option>
                  <option value="Industry Insights">Industry Insights</option>
                  <option value="Technology & Product">Technology & Product</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                  Tags <span className="text-[#8A8A8A] font-normal">(comma-separated)</span>
                </label>
                <Input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g., hiring, engineering, recruitment"
                  className="rounded-xl bg-[#F6F6F6] border-gray-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Cover Image <span className="text-red-500">*</span>
              </label>
              <label className="aspect-video max-h-[160px] w-full rounded-xl bg-[#F6F6F6] border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 overflow-hidden relative transition-colors">
                {form.cover_image_url ? (
                  <img src={form.cover_image_url} alt="Cover preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center px-4 py-6">
                    <Upload className="h-7 w-7 text-[#FF2B2B] mx-auto mb-1.5" />
                    <p className="text-xs text-[#8A8A8A]">Upload cover image from device</p>
                    <p className="text-[10px] text-[#A0A0A0] mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setForm((prev) => ({ ...prev, cover_image_url: typeof reader.result === "string" ? reader.result : "" }));
                      setFormError("");
                    };
                    reader.readAsDataURL(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {form.cover_image_url && (
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-xs text-[#8A8A8A] truncate">Cover image attached</p>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, cover_image_url: "" }))}
                    className="text-xs font-medium text-[#FF2B2B] hover:underline flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Short Summary / Excerpt <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={form.summary}
                onChange={(e) => {
                  setForm({ ...form, summary: e.target.value });
                  setFormError("");
                }}
                placeholder="Brief 1-2 sentence description summarizing the main takeaways..."
                className="w-full p-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs text-[#3A1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3A1F1F] block mb-1">
                Blog Content <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={8}
                value={form.content}
                onChange={(e) => {
                  setForm({ ...form, content: e.target.value });
                  setFormError("");
                }}
                placeholder="Write your detailed blog content here..."
                className="w-full p-3 rounded-xl bg-[#F6F6F6] border border-gray-200 text-xs text-[#3A1F1F] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FF2B2B]"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={requestCloseModal}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#FF2B2B] hover:bg-[#e02525] rounded-full text-white"
                onClick={() => save(true)}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  editing ? "Update Blog" : "Publish Blog"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Confirmation */}
      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#3A1F1F]">Discard changes?</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-[#8A8A8A]">
              You have unsaved changes to this blog. Closing now will discard them.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Keep Editing
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              onClick={() => { setDiscardConfirmOpen(false); setModalOpen(false); }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
