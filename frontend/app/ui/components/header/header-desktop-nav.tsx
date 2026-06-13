import Link from "next/link";
import { cn } from "~/lib/cn";
import { Skeleton } from "~/ui/primitives/skeleton";
import { isActive, mainNavigation } from "./header";

interface DesktopNavigationProps {
  navigation: typeof mainNavigation;
  isPending: boolean;
  pathname: string;
}

export function DesktopNavigation({ navigation, isPending, pathname }: DesktopNavigationProps) {
  return (
    <nav className="hidden md:flex">
      <ul className="flex items-center gap-6">
        {isPending
          ? Array.from({ length: navigation.length }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-6 w-20" />
              </li>
            ))
          : navigation.map((item) => (
              <li key={item.name}>
                <Link
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive(item.href, pathname)
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  )}
                  href={item.href}
                >
                  {item.name}
                </Link>
              </li>
            ))}
      </ul>
    </nav>
  );
}
