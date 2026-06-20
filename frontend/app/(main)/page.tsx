import { ArrowRight, Clock, ShoppingBag, Star, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { TestimonialsSection } from "~/ui/components/testimonials/testimonials-with-marquee";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";

import { testimonials } from "../mocks";
import { Category } from "../lib/types";

const features = [
  {
    description: "Безкоштовна доставка при замовленні від 1000 грн. Швидко та надійно.",
    icon: <Truck className="h-6 w-6 text-primary" />,
    title: "Безкоштовна доставка",
  },
  {
    description: "Ваші дані завжди в безпеці. Використовуємо сучасне шифрування.",
    icon: <ShoppingBag className="h-6 w-6 text-primary" />,
    title: "Безпечна оплата",
  },
  {
    description: "Підтримка 24/7 — завжди на зв'язку, щоб допомогти з вибором.",
    icon: <Clock className="h-6 w-6 text-primary" />,
    title: "Цілодобова підтримка",
  },
  {
    description: "Гарантія якості на кожен товар. Повернення протягом 30 днів.",
    icon: <Star className="h-6 w-6 text-primary" />,
    title: "Гарантія якості",
  },
];

async function getCategories(): Promise<Category[]> {
  try {
    const apiUrl = process.env.API_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";
    const response = await fetch(`${apiUrl}/categories/`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <main className="flex min-h-screen flex-col gap-y-16 bg-linear-to-b from-muted/50 via-muted/25 to-background">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="bg-grid-black/[0.02] absolute inset-0 bg-size-[20px_20px]" />
        <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:leading-[1.1]">
                  Побутова техніка для{" "}
                  <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    вашого дому
                  </span>
                </h1>
                <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
                  Надійна техніка від провідних виробників. Вигідні ціни, швидка доставка та професійний сервіс.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/products">
                  <Button className="h-12 gap-1.5 px-8 transition-colors duration-200" size="lg">
                    Каталог <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/admin/pos">
                  <Button className="h-12 px-8 transition-colors duration-200" size="lg" variant="outline">
                    POS-термінал
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-5 w-5 text-primary/70" />
                  <span>Доставка по всій Україні</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-5 w-5 text-primary/70" />
                  <span>Підтримка 24/7</span>
                </div>
              </div>
            </div>
            <div className="relative mx-auto hidden aspect-square w-full max-w-md overflow-hidden rounded-xl border shadow-lg lg:block">
              <div className="absolute inset-0 z-10 bg-linear-to-tr from-primary/20 via-transparent to-transparent" />
              <Image
                alt="Побутова техніка"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=60"
              />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      </section>

      {/* Категорії */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">Категорії</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-primary" />
            <p className="mt-4 max-w-2xl text-center text-muted-foreground">
              Обирайте з широкого асортименту побутової техніки
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {categories.map((category) => (
              <Link
                aria-label={`Переглянути ${category.name}`}
                className="group relative flex flex-col space-y-4 overflow-hidden rounded-2xl border bg-card shadow transition-all duration-300 hover:shadow-lg"
                href={`/products?category=${category.name.toLowerCase()}`}
                key={category.name}
              >
                <div className="relative aspect-4/3 overflow-hidden">
                  <div className="absolute inset-0 z-10 bg-linear-to-t from-background/80 to-transparent" />
                  <Image
                    alt={category.name}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    src={category.image}
                  />
                </div>
                <div className="relative z-20 -mt-6 p-4">
                  <div className="mb-1 text-lg font-medium">{category.name}</div>
                  <p className="text-sm text-muted-foreground">{category.product_count} товарів</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Переваги */}
      <section className="py-12 md:py-16" id="features">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">Чому обирають нас</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-primary" />
            <p className="mt-4 max-w-2xl text-center text-muted-foreground md:text-lg">
              Ми пропонуємо найкращий сервіс та якість
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card className="rounded-2xl border-none bg-background shadow transition-all duration-300 hover:shadow-lg" key={feature.title}>
                <CardHeader className="pb-2">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Відгуки */}
      <section className="bg-muted/50 py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TestimonialsSection
            className="py-0"
            description="Понад 10 000 задоволених клієнтів по всій Україні"
            testimonials={testimonials}
            title="Відгуки наших клієнтів"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl bg-primary/10 p-8 shadow-lg md:p-12">
            <div className="bg-grid-white/[0.05] absolute inset-0 bg-size-[16px_16px]" />
            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">
                Готуєтеся до оновлення?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                Приєднуйтесь до тисяч задоволених клієнтів. Зареєструйтеся сьогодні та отримуйте ексклюзивні пропозиції.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/sign-up">
                  <Button className="h-12 px-8 transition-colors duration-200" size="lg">Зареєструватися</Button>
                </Link>
                <Link href="/products">
                  <Button className="h-12 px-8 transition-colors duration-200" size="lg" variant="outline">Каталог</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
