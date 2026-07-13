"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "~/i18n/navigation";
import { toast } from "sonner";

import { signOut } from "~/lib/auth-client";
import { cn } from "~/lib/cn";
import { useMounted } from "~/lib/hooks/use-mounted";
import { Button, buttonVariants } from "~/ui/primitives/button";
import { Skeleton } from "~/ui/primitives/skeleton";

export function SignOutPageClient() {
  const t = useTranslations("signOut");
  const router = useRouter();
  const mounted = useMounted();

  const handlePageBack = async () => {
    router.back();
  };

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
          },
        },
      });
    } catch {
      toast.error(t("errorGeneric"));
    }
  };

  return (
    <div
      className={`
        flex w-auto flex-col-reverse justify-center gap-2
        sm:flex-row
      `}
    >
      <Button onClick={handlePageBack} size="default" variant="outline">
        {t("goBack")}
        <span className="sr-only">Previous page</span>
      </Button>
      {mounted ? (
        <Button onClick={handleSignOut} size="default" variant="secondary">
          {t("logOut")}
          <span className="sr-only">This action will log you out of your account.</span>
        </Button>
      ) : (
        <Skeleton
          className={cn(
            buttonVariants({ size: "default", variant: "secondary" }),
            "bg-muted text-muted-foreground"
          )}
        >
          {t("logOut")}
        </Skeleton>
      )}
    </div>
  );
}
