import { FadeIn } from "~/ui/components/motion/fade-in";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
              Про нас
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <p className="mb-4 text-lg text-muted-foreground">
                TechHub — інтернет-магазин побутової техніки. Ми пропонуємо широкий асортимент товарів для дому за найкращими цінами.
              </p>
              <p className="text-muted-foreground">
                Швидка доставка по всій Україні, гарантія якості та професійна підтримка клієнтів — ось що робить нас надійним вибором для вашого дому.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
