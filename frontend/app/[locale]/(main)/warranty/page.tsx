import { FadeIn } from "~/ui/components/motion/fade-in";

export default function WarrantyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
              Гарантія та повернення
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <p className="mb-4 text-lg text-muted-foreground">
                На всю техніку надається офіційна гарантія виробника від 1 до 3 років.
              </p>
              <p className="text-muted-foreground">
                Повернення товару можливе протягом 14 днів з моменту покупки за умови збереження товарного вигляду та упаковки.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
