"use client";
import React, { useEffect, useState } from "react";
import { CategoryProvider, useCategories, Category } from "@/context/CategoryContext";
import Button from "@/components/ui/Button";
import { Plus, Pencil, Trash2, RefreshCw, X, Check, Tag } from "lucide-react";

/* ─── Loading Skeleton ─── */
const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-muted/60" />
    ))}
  </div>
);

/* ─── Main inner component (uses context) ─── */
const CategoriesInner = () => {
  const { categories, loading, fetchCategories, addCategory, editCategory, deleteCategory } = useCategories();

  const emptyForm = { name: "", description: "" };
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setFormLoading(true);
    let ok = false;
    if (editId) {
      ok = await editCategory(editId, form);
    } else {
      ok = await addCategory(form);
    }
    if (ok) {
      setForm(emptyForm);
      setEditId(null);
    }
    setFormLoading(false);
  };

  const startEdit = (cat: Category) => {
    setEditId(cat._id);
    setForm({ name: cat.name, description: cat.description || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    setDeleteConfirm(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your product categories</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* ── Form ── */}
      <div className="border rounded-2xl bg-card p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-1.5 text-primary">
            {editId ? <Pencil size={16} /> : <Plus size={16} />}
          </div>
          <h2 className="font-bold text-base">
            {editId ? "Edit Category" : "Add New Category"}
          </h2>
          {editId && (
            <button onClick={cancelEdit} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="category-name"
            placeholder="Category name *"
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <input
            id="category-description"
            placeholder="Description (optional)"
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Button
            id="category-submit-btn"
            onClick={handleSubmit}
            disabled={formLoading || !form.name.trim()}
            className="gap-2 shrink-0"
          >
            {formLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : editId ? (
              <Check size={14} />
            ) : (
              <Plus size={14} />
            )}
            {editId ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <Skeleton />
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Tag size={40} className="opacity-30" />
          <p className="text-sm font-medium">No categories yet. Add one above.</p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((cat, idx) => (
                  <tr
                    key={cat._id}
                    className={`hover:bg-muted/20 transition-colors ${editId === cat._id ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-6 py-4 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-semibold">{cat.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cat.description || <span className="italic opacity-40">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          id={`edit-cat-${cat._id}`}
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(cat)}
                          className="gap-1.5"
                        >
                          <Pencil size={12} /> Edit
                        </Button>
                        {deleteConfirm === cat._id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive font-bold text-xs"
                              onClick={() => handleDelete(cat._id)}
                            >
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                              <X size={12} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            id={`delete-cat-${cat._id}`}
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(cat._id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {categories.map((cat, idx) => (
              <div
                key={cat._id}
                className={`rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-3 transition-all ${editId === cat._id ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
                      #{idx + 1}
                    </span>
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(deleteConfirm === cat._id ? null : cat._id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                )}
                {deleteConfirm === cat._id && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <p className="text-xs text-destructive flex-1">Delete this category?</p>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => handleDelete(cat._id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Page wrapper (provides context) ─── */
const AdminCategoriesPage = () => (
  <CategoryProvider>
    <CategoriesInner />
  </CategoryProvider>
);

export default AdminCategoriesPage;
