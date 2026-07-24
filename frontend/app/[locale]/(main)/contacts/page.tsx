import { FadeIn } from "~/ui/components/motion/fade-in";

export default function ContactsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
              Контакти
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <p className="mb-4 text-lg text-muted-foreground">
                <strong>Телефон:</strong> 0 800 123 456
              </p>
              <p className="mb-4 text-muted-foreground">
                <strong>Email:</strong> info@techhub.ua
              </p>
              <p className="mb-4 text-muted-foreground">
                <strong>Графік роботи:</strong> Пн-Пт 9:00-18:00
              </p>
              <p className="text-muted-foreground">
                <strong>Адреса:</strong> м. Київ, вул. Хрещатик, 1
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
