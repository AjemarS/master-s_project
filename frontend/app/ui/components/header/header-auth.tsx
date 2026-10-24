import { useTranslations } from "next-intl";
import { Link } from "~/i18n/navigation";
import { Button } from "~/ui/primitives/button";
import { HeaderUserDropdown } from "./header-user";
import { isInDashboardOrAdmin, NavigationSection } from "./header";
import { User } from "~/lib/auth-client";

interface AuthSectionProps {
  user: User | undefined;
  whereAmI: NavigationSection;
}

export function AuthSection({ user, whereAmI }: AuthSectionProps) {
  const t = useTranslations("common");

  if (user) {
    return (
      <div className="hidden md:block">
        <HeaderUserDropdown
          isDashboard={isInDashboardOrAdmin(whereAmI)}
          role={user.role || ""}
          userEmail={user.email}
          userImage={user.image}
          userName={user.name}
        />
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/sign-in">{t("signIn")}</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/sign-up">{t("signUp")}</Link>
      </Button>
    </div>
  );
}
