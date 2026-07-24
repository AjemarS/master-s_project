import { FadeIn } from "~/ui/components/motion/fade-in";

export default function DeliveryPaymentPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
              Доставка та оплата
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <p className="mb-4 text-lg text-muted-foreground">
                Доставка здійснюється Новою Поштою по всій Україні. Вартість доставки — від 100 грн. Безкоштовна доставка при замовленні від 3000 грн.
              </p>
              <p className="text-muted-foreground">
                Оплата готівкою при отриманні, банківською карткою онлайн або безготівковим розрахунком.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
