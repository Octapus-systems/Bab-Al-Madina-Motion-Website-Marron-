import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Product } from "../lib/supabase";
import { Loader2, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Bab Al Baraka" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf6f0]">
        <Loader2 className="w-6 h-6 animate-spin text-[#8b1a1a]" />
      </div>
    );
  }

  return session ? <AdminDashboard /> : <LoginForm />;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf6f0] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl border border-[#e8ddd0] p-8 shadow-lg">
        <h1 className="font-serif text-2xl text-[#1a1a1a] mb-1">Admin Login</h1>
        <p className="text-sm text-[#777] mb-6">Bab Al Baraka product management</p>

        <label className="block text-xs font-medium text-[#555] mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#e8ddd0] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30"
          placeholder="admin@babalbarka.ae"
        />

        <label className="block text-xs font-medium text-[#555] mb-1.5">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#e8ddd0] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#8b1a1a] hover:bg-[#a02222] text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("sort_order", { ascending: true });
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  };

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <header className="bg-white border-b border-[#e8ddd0] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-[#1a1a1a]">Product Management</h1>
          <p className="text-xs text-[#777]">Bab Al Baraka</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#8b1a1a] transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Products ({products.length})</h2>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 bg-[#8b1a1a] hover:bg-[#a02222] text-white text-sm px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#8b1a1a]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-[#999]">No products yet. Add your first one.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#e8ddd0] overflow-hidden group">
                <div className="aspect-square bg-[#f5efe6] relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ccc] text-xs">No image</div>
                  )}
                  {!p.is_active && (
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] uppercase tracking-wide px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditing(p)}
                      className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#1a1a1a]" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[#1a1a1a] text-sm mb-1">{p.name}</h3>
                  <p className="text-xs text-[#999] mb-2">SKU: {p.sku}</p>
                  <p className="text-[#8b1a1a] font-semibold">{p.unit_price_b2c} AED</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [price, setPrice] = useState(product?.unit_price_b2c?.toString() ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        finalImageUrl = data.publicUrl;
      }

      const payload = {
        name,
        sku,
        unit_price_b2c: Number(price),
        is_active: isActive,
        image_url: finalImageUrl || null,
      };

      const { error: dbError } = product
        ? await supabase.from("products").update(payload).eq("id", product.id)
        : await supabase.from("products").insert(payload);

      if (dbError) throw dbError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-xl text-[#1a1a1a]">{product ? "Edit Product" : "Add Product"}</h3>
          <button type="button" onClick={onClose} className="text-[#999] hover:text-[#1a1a1a]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block text-xs font-medium text-[#555] mb-1.5">Image</label>
        <div className="mb-4">
          {imagePreview ? (
            <img src={imagePreview} alt="" className="w-full h-40 object-cover rounded-lg mb-2 bg-[#f5efe6]" />
          ) : (
            <div className="w-full h-40 rounded-lg mb-2 bg-[#f5efe6] flex items-center justify-center text-[#ccc] text-xs">
              No image selected
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        </div>

        <label className="block text-xs font-medium text-[#555] mb-1.5">Product Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#e8ddd0] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30"
        />

        <label className="block text-xs font-medium text-[#555] mb-1.5">SKU</label>
        <input
          type="text"
          required
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#e8ddd0] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30"
        />

        <label className="block text-xs font-medium text-[#555] mb-1.5">Price (AED)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 rounded-lg border border-[#e8ddd0] text-sm focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30"
        />

        <label className="flex items-center gap-2 mb-5 text-sm text-[#555]">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Visible on website
        </label>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#8b1a1a] hover:bg-[#a02222] text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Product"}
        </button>
      </form>
    </div>
  );
}
