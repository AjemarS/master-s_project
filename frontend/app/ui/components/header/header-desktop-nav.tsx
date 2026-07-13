import { memo } from "react";
import { Link } from "~/i18n/navigation";
import { cn } from "~/lib/cn";
import { isActive, type NavItem } from "./header";

interface DesktopNavigationProps {
  navigation: NavItem[];
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
                "text-sm font-medium transition-colors hover:text-accent-electric",
                isActive(item.href, pathname)
                  ? "font-semibold text-accent-electric"
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
