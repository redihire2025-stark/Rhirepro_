import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Send, Undo2, Trash2, Pencil } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../components/ui/sheet";
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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("blogs").select("*", { count: "exact" });
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) toast.error(`Failed to load blogs: ${error.message}`);
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
    setSheetOpen(true);
  };

  const openEdit = (row: Blog) => {
    setEditing(row);
    setForm({
      title: row.title ?? "",
      category: row.category ?? "",
      summary: row.summary ?? "",
      key_takeaway: row.key_takeaway ?? "",
      content: row.content ?? "",
      cover_image_url: row.cover_image_url ?? "",
      author_name: row.author_name ?? "",
      read_time: row.read_time ?? 5,
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
    });
    setSheetOpen(true);
  };

  const save = async (publish: boolean) => {
    if (!form.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      category: form.category.trim() || "General",
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
      toast.error(`Save failed: ${error.message}`);
      return;
    }

    logAdminAction({
      action: editing ? "blog.update" : "blog.create",
      entityType: "blogs",
      entityId: editing?.id ?? form.title,
      afterValue: { title: form.title, status: payload.status },
    });

    toast.success(publish ? "Blog published" : "Draft saved");
    setSheetOpen(false);
    fetchRows();
  };

  const setStatus = async (row: Blog, status: "Published" | "Draft") => {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "Published" && !row.published_at) patch.published_at = new Date().toISOString();

    const { error } = await supabase.from("blogs").update(patch).eq("id", row.id);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }
    logAdminAction({
      action: status === "Published" ? "blog.publish" : "blog.unpublish",
      entityType: "blogs",
      entityId: row.id,
      beforeValue: { status: row.status },
      afterValue: { status },
    });
    toast.success(status === "Published" ? "Blog published" : "Moved back to draft");
    fetchRows();
  };

  const remove = async (row: Blog) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("blogs").delete().eq("id", row.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    logAdminAction({ action: "blog.delete", entityType: "blogs", entityId: row.id, beforeValue: { title: row.title } });
    toast.success("Blog deleted");
    fetchRows();
  };

  const columns: DataTableColumn<Blog>[] = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.author_name || "RhirePro"}</p>
        </div>
      ),
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

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {node}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Blogs</h1>
          <p className="text-sm text-muted-foreground">
            Platform posts shown at /blog. Recruiter-written Articles are separate and appear at /articles.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> New blog
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
                <Pencil /> Edit
              </DropdownMenuItem>
              {row.status === "Published" ? (
                <DropdownMenuItem onClick={() => setStatus(row, "Draft")}>
                  <Undo2 /> Move to draft
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setStatus(row, "Published")}>
                  <Send /> Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => remove(row)} className="text-destructive">
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit blog" : "New blog"}</SheetTitle>
            <SheetDescription>
              Drafts stay private. Only published posts appear on the public blog.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {field("Title *", <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />)}
            <div className="grid grid-cols-2 gap-3">
              {field("Category", <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />)}
              {field(
                "Read time (min)",
                <Input
                  type="number"
                  min={1}
                  value={form.read_time}
                  onChange={(e) => setForm({ ...form, read_time: Number(e.target.value) })}
                />,
              )}
            </div>
            {field("Author byline", <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} placeholder="e.g. RhirePro Editorial" />)}
            {field("Cover image URL", <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />)}
            {field("Tags (comma separated)", <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Hiring, Career Advice" />)}
            {field("Summary", <Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />)}
            {field("Key takeaway", <Textarea rows={2} value={form.key_takeaway} onChange={(e) => setForm({ ...form, key_takeaway: e.target.value })} />)}
            {field("Content (HTML supported)", <Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />)}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" disabled={saving} onClick={() => save(false)} className="flex-1">
                Save draft
              </Button>
              <Button disabled={saving} onClick={() => save(true)} className="flex-1">
                <Send className="size-4" /> Publish
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
