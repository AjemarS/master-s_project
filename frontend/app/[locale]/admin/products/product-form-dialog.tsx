"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "~/ui/primitives/dialog";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/ui/primitives/select";
import { Textarea } from "~/ui/primitives/textarea";
import { Alert, AlertDescription } from "~/ui/primitives/alert";
import { AlertCircle, Plus, X, Upload } from "lucide-react";
import { productApi, categoryApi } from "~/lib/api/admin-api";
import { API_URL } from "~/lib/api/client";
import type { Product, Category } from "~/lib/types";

interface SpecRow {
  key: string;
  value: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
  onCategoryCreated: (cat: Category) => void;
}

function FeaturesInput({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState("");

  const addFeature = () => {
    const val = input.trim();
    if (val && !features.includes(val)) {
      onChange([...features, val]);
    }
    setInput("");
  };

  return (
    <div className="col-span-3">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {features.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {f}
            <button type="button" onClick={() => onChange(features.filter((_, j) => j !== i))} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addFeature(); } }}
        placeholder="Type and press Enter to add..."
      />
    </div>
  );
}

function SpecsEditor({ specs, onChange }: { specs: SpecRow[]; onChange: (s: SpecRow[]) => void }) {
  const addRow = () => onChange([...specs, { key: "", value: "" }]);
  const removeRow = (i: number) => onChange(specs.filter((_, j) => j !== i));
  const updateRow = (i: number, field: "key" | "value", val: string) =>
    onChange(specs.map((s, j) => (j === i ? { ...s, [field]: val } : s)));

  return (
    <div className="col-span-3 space-y-2">
      {specs.map((spec, i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="Key" value={spec.key} onChange={(e) => updateRow(i, "key", e.target.value)} className="flex-1" />
          <Input placeholder="Value" value={spec.value} onChange={(e) => updateRow(i, "value", e.target.value)} className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="shrink-0" type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow} className="w-full" type="button">
        <Plus className="h-4 w-4 mr-2" /> Add Specification
      </Button>
    </div>
  );
}

function CategoryCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (cat: Category) => void;
}) {
  const [name, setName] = useState("");
  const [nameUk, setNameUk] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await categoryApi.create({
        name: name.trim(),
        name_uk: nameUk.trim() || undefined,
        name_en: nameEn.trim() || undefined,
      });
      if (res.error) {
        toast.error("Failed to create category", { description: res.error.message });
      } else if (res.data) {
        onCreated(res.data);
        onOpenChange(false);
        setName("");
        setNameUk("");
        setNameEn("");
        toast.success("Категорію створено", { description: `Категорію "${name.trim()}" створено.` });
      }
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Додати категорію</DialogTitle>
          <DialogDescription>Створіть нову категорію товарів.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div>
            <Label htmlFor="cat-name">Назва (основна)</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва категорії" className="mt-2" autoFocus />
          </div>
          <div>
            <Label htmlFor="cat-name-uk">Назва (укр.)</Label>
            <Input id="cat-name-uk" value={nameUk} onChange={(e) => setNameUk(e.target.value)} placeholder="Назва українською" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="cat-name-en">Назва (англ.)</Label>
            <Input id="cat-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Назва англійською" className="mt-2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating} type="button">Скасувати</Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()} type="button">
            {creating ? "Створення..." : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  categories,
  onSuccess,
  onCategoryCreated,
}: ProductFormDialogProps) {
  const [name, setName] = useState(mode === "edit" ? product?.name ?? "" : "");
  const [nameUk, setNameUk] = useState(mode === "edit" ? product?.name_uk ?? "" : "");
  const [nameEn, setNameEn] = useState(mode === "edit" ? product?.name_en ?? "" : "");
  const [description, setDescription] = useState(mode === "edit" ? product?.description ?? "" : "");
  const [descriptionUk, setDescriptionUk] = useState(mode === "edit" ? product?.description_uk ?? "" : "");
  const [descriptionEn, setDescriptionEn] = useState(mode === "edit" ? product?.description_en ?? "" : "");
  const [categoryId, setCategoryId] = useState(() => {
    if (mode === "edit" && product) {
      const cid = typeof product.category === "object" ? product.category?.id : product.category;
      return String(cid ?? "");
    }
    return "";
  });
  const [price, setPrice] = useState(mode === "edit" ? String(product?.price ?? "") : "");
  const [originalPrice, setOriginalPrice] = useState(mode === "edit" ? String(product?.original_price ?? "") : "");
  const [stock, setStock] = useState(mode === "edit" ? String(product?.stock ?? "0") : "0");
  const [rating, setRating] = useState(mode === "edit" ? String(product?.rating ?? "0.0") : "0.0");
  const [features, setFeatures] = useState<string[]>(mode === "edit" ? (product?.features ?? []) : []);
  const [specs, setSpecs] = useState<SpecRow[]>(() => {
    if (mode === "edit" && product?.specs && typeof product.specs === "object") {
      return Object.entries(product.specs).map(([key, value]) => ({ key, value: String(value) }));
    }
    return [];
  });
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const resetForm = () => {
    if (mode === "create") {
      setName("");
      setNameUk("");
      setNameEn("");
      setDescription("");
      setDescriptionUk("");
      setDescriptionEn("");
      setCategoryId("");
      setPrice("");
      setOriginalPrice("");
      setStock("0");
      setRating("0.0");
      setFeatures([]);
      setSpecs([]);
      setImage(null);
    }
    setFormError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Name is required.";
    if (!description.trim()) return "Description is required.";
    if (!categoryId) return "Category is required.";
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) return "Price must be greater than zero.";
    const origNum = parseFloat(originalPrice);
    if (!originalPrice || isNaN(origNum) || origNum < 0) return "Original price is required.";
    if (origNum < priceNum) return "Original price cannot be less than price.";
    const ratingNum = parseFloat(rating);
    if (rating && (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5)) return "Rating must be between 0 and 5.";
    return null;
  };

  const buildPayload = () => ({
    name: name.trim(),
    name_uk: nameUk.trim() || undefined,
    name_en: nameEn.trim() || undefined,
    description: description.trim(),
    description_uk: descriptionUk.trim() || undefined,
    description_en: descriptionEn.trim() || undefined,
    category: parseInt(categoryId, 10),
    price: parseFloat(price),
    original_price: parseFloat(originalPrice),
    stock: parseInt(stock || "0", 10),
    rating: parseFloat(rating || "0.0"),
    features,
    specs: specs.reduce<Record<string, string>>((acc, s) => {
      if (s.key.trim()) acc[s.key.trim()] = s.value;
      return acc;
    }, {}),
  });

  const handleSave = async () => {
    const error = validate();
    if (error) { setFormError(error); return; }
    setFormError(null);
    setSaving(true);

    try {
      const payload = buildPayload();
      let response;

      if (image) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, val]) => {
          formData.append(key, typeof val === "object" ? JSON.stringify(val) : String(val));
        });
        formData.append("image", image);

        const url = mode === "create"
          ? `${API_URL}/products/`
          : `${API_URL}/products/${product!.id}/`;

        const fetchRes = await fetch(url, {
          method: mode === "create" ? "POST" : "PUT",
          credentials: "include",
          body: formData,
        });

        if (!fetchRes.ok) {
          const errorData = await fetchRes.json().catch(() => ({ message: "Request failed" }));
          response = {
            error: { message: errorData.message || errorData.detail || "Request failed", status: fetchRes.status, details: errorData },
          };
        } else {
          const data = await fetchRes.json();
          response = { data };
        }
      } else {
        response = mode === "create"
          ? await productApi.create(payload)
          : await productApi.update(product!.id, payload);
      }

      if (response.error) {
        toast.error(mode === "create" ? "Failed to create product" : "Failed to update product", {
          description: response.error.message,
        });
      } else {
        toast.success(mode === "create" ? "Product created" : "Product updated", {
          description: `${name.trim()} has been ${mode === "create" ? "created" : "updated"}.`,
        });
        handleOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Fill in the details to create a new product."
                : "Update the product details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-name" className="text-right">Name *</Label>
              <Input id="pd-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-xs text-slate-500">UK</Label>
              <Input value={nameUk} onChange={(e) => setNameUk(e.target.value)} placeholder="Назва українською" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-xs text-slate-500">EN</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name in English" className="col-span-3" />
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="pd-description" className="text-right pt-2">Description *</Label>
              <Textarea id="pd-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 min-h-20" />
            </div>
            <div className="grid grid-cols-4 items-start gap-2">
              <Label className="text-right text-xs text-slate-500 pt-1">UK</Label>
              <Textarea value={descriptionUk} onChange={(e) => setDescriptionUk(e.target.value)} placeholder="Опис українською" className="col-span-3 min-h-15" />
            </div>
            <div className="grid grid-cols-4 items-start gap-2">
              <Label className="text-right text-xs text-slate-500 pt-1">EN</Label>
              <Textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Description in English" className="col-span-3 min-h-15" />
            </div>

            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-category" className="text-right">Category *</Label>
              <div className="col-span-3 flex gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="pd-category" className="flex-1"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)} type="button" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-price" className="text-right">Price *</Label>
              <Input id="pd-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" />
            </div>

            {/* Original Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-original-price" className="text-right">Orig. Price *</Label>
              <Input id="pd-original-price" type="number" step="0.01" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="col-span-3" />
            </div>

            {/* Stock */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-stock" className="text-right">Stock</Label>
              <Input id="pd-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="col-span-3" />
            </div>

            {/* Rating */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-rating" className="text-right">Rating</Label>
              <Input id="pd-rating" type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} className="col-span-3" />
            </div>

            {/* Features */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-1">Features</Label>
              <FeaturesInput features={features} onChange={setFeatures} />
            </div>

            {/* Specifications */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-1">Specs</Label>
              <SpecsEditor specs={specs} onChange={setSpecs} />
            </div>

            {/* Image */}
              <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pd-image" className="text-right">Image</Label>
              <div className="col-span-3 flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => document.getElementById("pd-image")?.click()} type="button">
                  <Upload className="h-4 w-4 mr-1" /> {image ? "Change" : "Upload"}
                </Button>
                {image && <span className="text-sm text-muted-foreground truncate max-w-50">{image.name}</span>}
                {imageError && <span className="text-sm text-destructive">{imageError}</span>}
                <input
                  id="pd-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageError(null);
                    if (file) {
                      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                      if (!allowed.includes(file.type)) {
                        setImageError("Only JPEG, PNG, WebP, GIF allowed");
                        setImage(null);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setImageError("Image must not exceed 5 MB");
                        setImage(null);
                        return;
                      }
                    }
                    setImage(file);
                  }}
                />
              </div>
            </div>
          </div>

          {formError && (
            <Alert variant="destructive" className="mx-6 mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving} type="button">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !description.trim() || !categoryId || !price || parseFloat(price) <= 0 || !originalPrice} type="button">
              {saving ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryCreateDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onCreated={(cat) => {
          onCategoryCreated(cat);
          setCategoryId(String(cat.id));
        }}
      />
    </>
  );
}
