# Frontend Fix Plan — Step by Step

This document outlines all fixes needed for the frontend codebase, ordered by priority. Each step is self-contained. Complete them in order.

---

## Phase 1: Critical Bugs (must fix)

### Step 1 — Fix admin products search

**File:** `frontend/app/admin/products/page.tsx`

**Problem:** The `useEffect` guard `if (debouncedSearchTerm !== searchTerm) return;` prevents the fetch from ever running.

**Fix:** Remove the guard and the second `useEffect`. Keep only one effect that depends on `debouncedSearchTerm`:

```ts
// Replace both useEffects with this single one:
useEffect(() => {
  fetchProducts();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [debouncedSearchTerm]);
```

Also remove the initial fetch `useEffect(() => { fetchProducts(); }, []);` at line 40 — it's now redundant.

---

### Step 2 — Fix client-side re-filter in admin products

**File:** `frontend/app/admin/products/page.tsx`

**Problem:** After fetching from API with `search` param, you re-filter client-side with the same term. Causes duplicated logic.

**Fix:** Remove the client-side `.filter()` at lines 116–120 and the `filteredProducts` variable. Use `products` directly:

```ts
// Before:
const filteredProducts = products.filter(...);

// After: just use `products` everywhere instead of `filteredProducts`
```

If you want instant client-side filtering without API calls, remove `search` from the API request and keep the client filter. Choose one strategy.

---

### Step 3 — Fix social login loading state

**File:** `frontend/app/sign-in/page.client.tsx`

**Problems:**
1. `loading` never resets to `false` on success
2. The `catch` block won't fire because `signIn.social()` returns a promise, not throws
3. `void` suppresses the unhandled promise

**Fix:** Await the call and check the return value:

```ts
const handleGitHubLogin = async () => {
  setLoading(true);
  setError("");
  try {
    const result = await signIn.social({ provider: "github" });
    if (result?.error) {
      setError(result.error.message || "Failed to sign in with GitHub");
    }
    // On success the page will redirect via OAuth
  } catch (err) {
    setError("Failed to sign in with GitHub");
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

Same fix for `handleGoogleLogin`.

---

### Step 4 — Fix email sign-in error handling

**File:** `frontend/app/sign-in/page.client.tsx`, lines 24–41

**Problem:** `signIn.email()` likely returns `{ error }`, not throws. The hardcoded error message masks real errors.

**Fix:** Check the return value:

```ts
const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const result = await signIn.email({ email, password });
    if (result?.error) {
      setError(result.error.message || "Invalid email or password");
      return;
    }
    router.push("/dashboard/profile");
  } catch (err) {
    setError("An unexpected error occurred");
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

---

### Step 5 — Wire cart UI to real CartProvider

**Files:**
- `frontend/app/ui/components/cart/cart.tsx`
- `frontend/app/ui/components/cart/cart-client.tsx` (assumed — read it)
- `frontend/app/lib/hooks/use-cart.tsx`

**Problem:** The `Cart` component uses `mockCart` and ignores the `CartProvider` that's already mounted in `layout.tsx`.

**Fix:**
1. Remove `mockCart` from `cart.tsx`
2. Have the `Cart` component (or its child `CartClient`) use `useCart()` from the provider instead of receiving props

```tsx
// cart.tsx — simplified
import { CartClient } from "./cart-client";

export function Cart({ className }: CartProps) {
  return (
    <div className={cn("relative", className)}>
      <CartClient />
    </div>
  );
}
```

```tsx
// cart-client.tsx — use the context
import { useCart } from "~/lib/hooks/use-cart";

export function CartClient() {
  const { items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart } = useCart();
  // ... render using real items
}
```

If `CartClient` has its own state that conflicts, refactor it to consume the context.

---

### Step 6 — Unify Product type definitions

**Files:**
- `frontend/app/lib/types/index.ts`
- `frontend/app/lib/api/admin-api.ts`

**Problem:** Two incompatible `Product` interfaces.

**Fix:** Move the single canonical `Product` type to `~/lib/types/index.ts`:

```ts
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  stock: number;
  inStock: boolean;
  rating: number;
  image: string | null;
  category: number;
  categoryName?: string;
  features?: string[];
  specs?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}
```

Then `import { Product } from "~/lib/types"` from `admin-api.ts` instead of redefining it.

---

## Phase 2: High Priority (architectural)

### Step 7 — Create a unified API client

**Problem:** Three different API patterns (raw fetch, `admin-api.ts`, better-auth client).

**Fix:** Extract the `apiCall` helper from `admin-api.ts` into `~/lib/api/client.ts`. All components use this:

```ts
// ~/lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

interface ApiResponse<T> { data?: T; error?: ApiError; }

async function apiCall<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  // ... same as current implementation
}

export { apiCall, API_URL };
export type { ApiResponse, ApiError };
```

Then:
- `admin-api.ts` imports `apiCall` from `./client`
- `page.tsx` (homepage) imports `apiCall` and uses it
- `products/page.tsx` imports `apiCall` and uses it

Remove all hardcoded `"http://localhost/api/"` strings.

---

### Step 8 — Replace hardcoded URLs with env var

**File:** `frontend/app/products/page.tsx`, line 34

**Change:** `"http://localhost/api/products/"` → `` `${process.env.NEXT_PUBLIC_API_URL}/products/` ``

Also audit the entire codebase for any other hardcoded URLs.

---

### Step 9 — Fix dark mode in admin pages

**Files:** All `frontend/app/admin/*` pages

**Problem:** Hardcoded `text-slate-*`, `bg-slate-*` colors bypass theme variables.

**Fix:** Replace all hardcoded slate colors with Tailwind theme tokens:
- `text-slate-900` → `text-foreground`
- `text-slate-600` → `text-muted-foreground`
- `bg-slate-50` → `bg-muted/50` or use `@apply`
- `bg-linear-to-br from-slate-50 to-slate-100` → drop or use theme-aware gradients

---

### Step 10 — Fix `useSearchParams` without Suspense boundary

**File:** `frontend/app/products/page.tsx`

**Problem:** Next.js requires a Suspense boundary when using `useSearchParams`.

**Fix:** Either:
(a) Wrap the page export in `<Suspense>` in the parent layout, or
(b) Create a separate client component that uses `useSearchParams` and wrap *that* in Suspense:

```tsx
// products/page.tsx
import { Suspense } from "react";
import ProductsPageContent from "./page-content";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
```

Move the current page logic into `products/page-content.tsx`.

---

## Phase 3: Medium Priority (code quality)

### Step 11 — Remove unnecessary `useEffect` for category param

**File:** `frontend/app/products/page.tsx`, lines 78–82

**Fix:** Derive `selectedCategory` from the URL param during render instead of using an effect:

```tsx
const [selectedCategory, setSelectedCategory] = useState<Product["categoryName"]>("All");

// Compute initial value from URL
const params = useSearchParams();
const categoryParam = params.get("category");

// On mount, if URL has a category, use it
useEffect(() => {
  if (categoryParam) {
    setSelectedCategory(categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1));
  }
}, []); // empty deps — runs once on mount
```

Or even better, make `selectedCategory` derived state (not state) that syncs with the URL.

---

### Step 12 — Fix `useDebounce` pattern in admin

**File:** `frontend/app/admin/products/page.tsx`

After Step 1, ensure the debounce is working correctly. The pattern should be:

```ts
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  fetchProducts();
}, [debouncedSearchTerm]); // fires only when debounced value settles
```

No guard needed.

---

### Step 13 — Fix `void` promise patterns

**Files:** `frontend/app/sign-in/page.client.tsx`, any other files

**Problem:** `void signIn.social(...)` suppresses unhandled rejections.

**Fix:** Already addressed in Step 3. After that fix, search the codebase for any other `void` patterns and fix them.

---

### Step 14 — Add React Error Boundary

**File:** `frontend/app/layout.tsx` (or create `~/lib/components/error-boundary.tsx`)

Add a global error boundary:

```tsx
// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <button onClick={() => reset()}>Try again</button>
      </div>
    </div>
  );
}
```

---

### Step 15 — Fix `useCurrentUserOrRedirect` dependency array

**File:** `frontend/app/lib/auth-client.ts`, line 72

**Problem:** `router` is a new reference each render, causing the effect to re-run.

**Fix:** Remove `router` from the dependency array. Next.js `useRouter()` is stable, but ESLint will warn. Use `// eslint-disable-next-line` or wrap in `useRef`:

```ts
const routerRef = useRef(router);
routerRef.current = router;

useEffect(() => {
  if (!isPending && routerRef.current) {
    // ...
  }
}, [isPending, data?.user, forbiddenUrl, okUrl, ignoreForbidden]);
```

---

## Phase 4: Low Priority (polish)

### Step 16 — Normalize language to English

**File:** `frontend/app/admin/users/actions.ts`

Translate comments from Ukrainian to English.

---

### Step 17 — Implement real pagination

**File:** `frontend/app/products/page.tsx`

The API returns `next`, `previous`, and `count`. Wire pagination into state and use it for the Previous/Next buttons.

---

### Step 18 — Consolidate CSS variables

**File:** `frontend/app/lib/css/globals.css`

Remove the duplicate `--color-background` and `--color-foreground` from `@theme inline` since they are already in `:root` and `.dark`.

---

### Step 19 — Add loading guard to `useCurrentUserOrRedirect`

**File:** `frontend/app/lib/auth-client.ts`

Consider adding a built-in loading UI or return a `shouldRender` flag so callers can show skeletons instead of flashing protected content.

---

## Execution Order Summary

```
Phase 1 (Critical)         Phase 2 (High)          Phase 3 (Medium)        Phase 4 (Low)
─────────────────────      ───────────────         ────────────────        ─────────────
Step 1  Search fix         Step 7  API client      Step 11 URL effect      Step 16 i18n
Step 2  Re-filter fix      Step 8  Env var URL     Step 12 Debounce        Step 17 Pagination
Step 3  Social loading     Step 9  Dark mode       Step 13 void patterns   Step 18 CSS dups
Step 4  Sign-in errors     Step 10 Suspense        Step 14 Error boundary  Step 19 Loading guard
Step 5  Cart wiring                                  Step 15 Dep array
Step 6  Types unify
```

Total estimated effort: **2–3 days** for a single developer working full-time on these fixes.