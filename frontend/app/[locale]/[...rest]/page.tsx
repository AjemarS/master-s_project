import { notFound } from "next/navigation";

// Unknown URLs under a locale: without this Next shows its own English 404 instead of [locale]/not-found
export default function CatchAll() {
  notFound();
}
