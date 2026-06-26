import Link from "next/link";
import { Button } from "~/ui/primitives/button";
import { HeaderUserDropdown } from "./header-user";
import { isInDashboardOrAdmin, NavigationSection } from "./header";
import { User } from "~/lib/auth-client";

interface AuthSectionProps {
  user: User | undefined;
  whereAmI: NavigationSection;
}

export function AuthSection({ user, whereAmI }: AuthSectionProps) {
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
      <Link href="/sign-in">
        <Button size="sm" variant="ghost">
          Log in
        </Button>
      </Link>
      <Link href="/sign-up">
        <Button size="sm">Sign up</Button>
      </Link>
    </div>
  );
}
