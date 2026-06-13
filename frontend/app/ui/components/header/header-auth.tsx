import Link from "next/link";
import { Button } from "~/ui/primitives/button";
import { Skeleton } from "~/ui/primitives/skeleton";
import { HeaderUserDropdown } from "./header-user";
import { isInDashboardOrAdmin, NavigationSection } from "./header";
import { User } from "~/lib/auth-client";

interface AuthSectionProps {
  user: User;
  isPending: boolean;
  whereAmI: NavigationSection;
}

export function AuthSection({ user, isPending, whereAmI }: AuthSectionProps) {
  return (
    <div className="hidden md:block">
      {user ? (
        <HeaderUserDropdown
          isDashboard={isInDashboardOrAdmin(whereAmI)}
          isAdmin={user.role === "admin"}
          userEmail={user.email}
          userImage={user.image}
          userName={user.name}
        />
      ) : isPending ? (
        <Skeleton className="h-10 w-32" />
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button size="sm" variant="ghost">
              Log in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
