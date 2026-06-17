/**
 * Build the absolute URL for a product image.
 *
 * The product-service serializers now return relative paths
 * (e.g. "/media/product_images/photo.avif") so that the hostname
 * does not leak internal Docker service names.  This helper
 * prepends the configured API origin to produce a browser-addressable URL.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";

/** Extract origin from the configured API base URL. */
function getApiOrigin(): string {
  try {
    const url = new URL(API_BASE);
    return url.origin;
  } catch {
    return "http://localhost";
  }
}

/**
 * Return a fully-qualified URL suitable for use in an `<img>` or
 * `next/image` `src` attribute.
 *
 * - `null` / `undefined` / empty  →  `""`
 * - Already absolute (`http://…`)  →  returned unchanged
 * - Relative path (`/media/…`)     →  prepended with the API origin
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const origin = getApiOrigin();
  // Ensure exactly one slash between origin and path
  const sep = imageUrl.startsWith("/") ? "" : "/";
  return `${origin}${sep}${imageUrl}`;
}
