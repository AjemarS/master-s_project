import { Facebook, Instagram, Twitter } from "lucide-react";
import Link from "next/link";

import { cn } from "~/lib/cn";
import { Button } from "~/ui/primitives/button";

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t bg-background", className)}>
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link className="flex items-center gap-2" href="/">
              <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                TechHub
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Надійна побутова техніка для вашого дому. Кращі ціни та сервіс в Україні.
            </p>
            <div className="flex space-x-4">
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Button>
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Button>
              <Button className="h-8 w-8 rounded-full" size="icon" variant="ghost">
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Button>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Категорії</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products">Усі товари</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products?category=Холодильники">Холодильники</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products?category=Пральні+машини">Пральні машини</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products?category=Духовки">Духовки</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/products?category=Дрібна+техніка">Дрібна техніка</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Інформація</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href="/about">Про нас</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/shipping">Доставка та оплата</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/warranty">Гарантія</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/contact">Контакти</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Підтримка</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-muted-foreground hover:text-foreground" href="/help">Допомога</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/orders">Мої замовлення</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/privacy">Політика конфіденційності</Link></li>
              <li><Link className="text-muted-foreground hover:text-foreground" href="/terms">Умови використання</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TechHub. Усі права захищено.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/privacy">Конфіденційність</Link>
              <Link className="hover:text-foreground" href="/terms">Умови</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
