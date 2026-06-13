import Link from "next/link";
import { isActive, mainNavigation } from "./header";
import { cn } from "~/lib/cn";
import { Skeleton } from "~/ui/primitives/skeleton";
import { User } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Menu, X } from "lucide-react";

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <Button
      className="md:hidden"
      onClick={onToggle}
      size="icon"
      variant="ghost"
      aria-label="Toggle menu"
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

interface MobileMenuProps {
  navigation: typeof mainNavigation;
  isPending: boolean;
  pathname: string;
  showAuth: boolean;
  user: User;
  onClose: () => void;
}

export function MobileMenu({ navigation, isPending, pathname, showAuth, user, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden">
      <nav className="space-y-1 border-b px-4 py-3">
        {isPending
          ? Array.from({ length: navigation.length }).map((_, i) => (
              <div className="py-2" key={i}>
                <Skeleton className="h-6 w-32" />
              </div>
            ))
          : navigation.map((item) => (
              <Link
                className={cn(
                  "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                  isActive(item.href, pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted/50 hover:text-primary"
                )}
                href={item.href}
                key={item.name}
                onClick={onClose}
              >
                {item.name}
              </Link>
            ))}
      </nav>

      {showAuth && !user && (
        <div className="space-y-1 border-b px-4 py-3">
          <Link
            className="block rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted/50"
            href="/sign-in"
            onClick={onClose}
          >
            Log in
          </Link>
          <Link
            className="block rounded-md bg-primary px-3 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            href="/sign-up"
            onClick={onClose}
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
