import { FadeIn } from "~/ui/components/motion/fade-in";

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-10 text-4xl font-bold tracking-tight text-foreground">
              Політика конфіденційності
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <h2 className="text-2xl font-semibold text-foreground">
                Які дані ми збираємо
              </h2>
              <p className="mb-4 text-muted-foreground">
                Ми збираємо інформацію, яку ви надаєте при реєстрації, оформленні замовлення або підписці на розсилку: ім&apos;я, електронна пошта, номер телефону, адреса доставки.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Як ми використовуємо ваші дані
              </h2>
              <p className="mb-4 text-muted-foreground">
                Ваші дані використовуються для обробки замовлень, доставки товарів, комунікації щодо статусу замовлення та покращення нашого сервісу. Ми не передаємо ваші дані третім особам без вашої згоди.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Захист даних
              </h2>
              <p className="mb-4 text-muted-foreground">
                Ми вживаємо всіх необхідних технічних та організаційних заходів для захисту ваших персональних даних від несанкціонованого доступу, втрати або розголошення.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Контакти
              </h2>
              <p className="text-muted-foreground">
                Якщо у вас виникли питання щодо політики конфіденційності, зв&apos;яжіться з нами за адресою info@techhub.ua.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
