import { memo } from "react";
import Link from "next/link";
import { cn } from "~/lib/cn";
import { isActive, mainNavigation } from "./header";

interface DesktopNavigationProps {
  navigation: typeof mainNavigation;
  pathname: string;
}

export const DesktopNavigation = memo(function DesktopNavigation({ navigation, pathname }: DesktopNavigationProps) {
  return (
    <nav className="hidden md:flex">
      <ul className="flex items-center gap-6">
        {navigation.map((item) => (
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
});
