import { getTranslations } from "next-intl/server";
import { ArrowRight, Clock, ShoppingBag, Star, Truck } from "lucide-react";
import Image from "next/image";
import { Link } from "~/i18n/navigation";

import { FadeIn } from "~/ui/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "~/ui/components/motion/stagger";
import { TestimonialsSection } from "~/ui/components/testimonials/testimonials-with-marquee";
import { Button } from "~/ui/primitives/button";
import { CtaButtons } from "./cta-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/primitives/card";
import { CategoryImage } from "~/ui/components/category-image";
import { ProductCard } from "~/ui/components/product-card";

import { getTestimonials } from "~/data/testimonials";
import { Category, Product } from "../../lib/types";

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

async function getLatestProducts(): Promise<Product[]> {
  try {
    const apiUrl = process.env.API_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost/api";
    const response = await fetch(
      `${apiUrl}/products/?ordering=-created_at&page_size=8`,
      { next: { revalidate: 60 } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();
  const latestProducts = await getLatestProducts();
  const t = await getTranslations("home");
  const tTestimonials = await getTranslations("testimonials");
  const testimonials = getTestimonials(tTestimonials);

  const features = [
    {
      description: t("freeShippingDesc"),
      icon: <Truck className="h-6 w-6 text-primary" />,
      title: t("freeShippingTitle"),
    },
    {
      description: t("securePaymentDesc"),
      icon: <ShoppingBag className="h-6 w-6 text-primary" />,
      title: t("securePaymentTitle"),
    },
    {
      description: t("support247Desc"),
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: t("support247Title"),
    },
    {
      description: t("qualityGuaranteeDesc"),
      icon: <Star className="h-6 w-6 text-primary" />,
      title: t("qualityGuaranteeTitle"),
    },
  ];

  return (
    <main className="flex min-h-screen flex-col gap-y-16 bg-linear-to-b from-muted/50 via-muted/25 to-background">
      {/* Hero */}
      <FadeIn direction="none" duration={0.6}>
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-electric/5 blur-3xl" />
        <div className="bg-grid-black/[0.02] absolute inset-0 bg-size-[20px_20px]" />
        <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <FadeIn delay={0.1} direction="up">
                  <h1 className=" text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:leading-[1.1]">
                    {t("heroTitle")}{" "}
                    <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {t("heroTitleHighlight")}
                    </span>
                  </h1>
                </FadeIn>
                <FadeIn delay={0.2} direction="up">
                  <p className="max-w-175 text-lg text-muted-foreground md:text-xl">
                    {t("heroSubtitle")}
                  </p>
                </FadeIn>
              </div>
              <FadeIn delay={0.3} direction="up">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 gap-1.5 px-8 transition-colors duration-200" size="lg">
                    <Link href="/products">
                      {t("heroCatalog")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-5 w-5 text-primary/70" />
                    <span>{t("heroDelivery")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-5 w-5 text-primary/70" />
                    <span>{t("heroSupport")}</span>
                  </div>
                </div>
              </FadeIn>
            </div>
            <FadeIn delay={0.15} direction="right">
              <div className="relative mx-auto hidden aspect-square w-full max-w-md overflow-hidden rounded-xl border shadow-xl shadow-primary/10 lg:block">
              <div className="absolute inset-0 z-10 bg-linear-to-tr from-primary/20 via-transparent to-transparent" />
              <Image
                alt={t("heroTitle")}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=60"
              />
            </div>
          </FadeIn>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-accent-electric/20 to-transparent" />
      </section>
      </FadeIn>

      {/* Categories */}
      <FadeIn direction="up">
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className=" text-3xl leading-tight font-bold tracking-tight md:text-4xl">{t("categoriesTitle")}</h2>
          <div className="mt-2 h-1 w-12 rounded-full bg-primary shadow-xs shadow-primary/50" />
          <p className="mt-4 max-w-2xl text-center text-muted-foreground">
              {t("categoriesSubtitle")}
            </p>
          </div>
          <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {categories.map((category) => (
              <StaggerItem key={category.id}>
                <Link
                  aria-label={`${t("categoriesTitle")} ${category.name}`}
                  className="group relative flex flex-col space-y-4 overflow-hidden rounded-2xl border bg-card shadow transition-all duration-300 hover:shadow-lg"
                  href={`/products?category=${category.id}`}
                >
                  <div className="relative aspect-4/3 overflow-hidden">
                    <div className="absolute inset-0 z-10 bg-linear-to-t from-background/80 to-transparent" />
                    <CategoryImage
                      categoryId={category.id ?? 0}
                      categoryName={category.name}
                      className="group-hover:scale-105"
                      fill
                      imageUrl={category.image_url}
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    />
                  </div>
                  <div className="relative z-20 -mt-6 p-4">
                    <div className="mb-1 text-lg font-medium">{category.name}</div>
                    <p className="text-sm text-muted-foreground">{t("categoriesProducts", { count: category.product_count })}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      </FadeIn>

      {/* New Arrivals */}
      {latestProducts.length > 0 && (
        <FadeIn direction="up">
        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <h2 className=" text-3xl leading-tight font-bold tracking-tight md:text-4xl">
                {t("newArrivalsTitle")}
              </h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-primary shadow-xs shadow-primary/50" />
              <p className="mt-4 max-w-2xl text-center text-muted-foreground">
                {t("newArrivalsSubtitle")}
              </p>
            </div>
            <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {latestProducts.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} variant="compact" />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
        </FadeIn>
      )}

      {/* Features */}
      <FadeIn direction="up">
      <section className="py-12 md:py-16" id="features">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h2 className=" text-3xl leading-tight font-bold tracking-tight md:text-4xl">{t("featuresTitle")}</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-primary shadow-xs shadow-primary/50" />
            <p className="mt-4 max-w-2xl text-center text-muted-foreground md:text-lg">
              {t("featuresSubtitle")}
            </p>
          </div>
          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <Card className="rounded-2xl border-none bg-background shadow transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">{feature.icon}</div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      </FadeIn>

      {/* Testimonials */}
      <FadeIn direction="up">
      <section className="bg-muted/50 py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TestimonialsSection
            className="py-0"
            description={t("testimonialsSubtitle")}
            testimonials={testimonials}
            title={t("testimonialsTitle")}
          />
        </div>
      </section>
      </FadeIn>

      {/* CTA */}
      <FadeIn direction="up">
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl bg-primary/10 p-8 shadow-lg md:p-12">
            <div className="bg-grid-white/[0.05] absolute inset-0 bg-size-[16px_16px]" />
            <div className="relative z-10 mx-auto max-w-2xl text-center">
              <h2 className=" text-3xl leading-tight font-bold tracking-tight md:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                {t("ctaSubtitle")}
              </p>
              <CtaButtons />
            </div>
          </div>
        </div>
      </section>
      </FadeIn>
    </main>
  );
}
