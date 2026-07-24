"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("subscribeError"));
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));
    localStorage.setItem("newsletter_email", email);
    toast.success(t("subscribeSuccess"));
    setEmail("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <Input
        type="email"
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 min-w-0"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "..." : t("subscribe")}
      </Button>
    </form>
  );
}
