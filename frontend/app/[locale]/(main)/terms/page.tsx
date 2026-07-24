import { FadeIn } from "~/ui/components/motion/fade-in";

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-10 text-4xl font-bold tracking-tight text-foreground">
              Умови використання
            </h1>
            <div className="prose prose-gray max-w-none dark:prose-invert">
              <h2 className="text-2xl font-semibold text-foreground">
                Загальні положення
              </h2>
              <p className="mb-4 text-muted-foreground">
                Використовуючи цей веб-сайт, ви погоджуєтесь з умовами цієї угоди. Якщо ви не згодні з будь-якою частиною умов, будь ласка, не використовуйте наш сервіс.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Реєстрація та обліковий запис
              </h2>
              <p className="mb-4 text-muted-foreground">
                Для оформлення замовлення ви можете створити обліковий запис або зробити замовлення як гість. Ви несете відповідальність за збереження конфіденційності вашого пароля.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Ціни та оплата
              </h2>
              <p className="mb-4 text-muted-foreground">
                Всі ціни на сайті вказані в гривнях з урахуванням ПДВ. Ми залишаємо за собою право змінювати ціни без попередження.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Доставка
              </h2>
              <p className="mb-4 text-muted-foreground">
                Доставка здійснюється Новою Поштою по всій Україні. Терміни доставки залежать від регіону та наявності товару на складі.
              </p>

              <h2 className="mt-8 text-2xl font-semibold text-foreground">
                Повернення та обмін
              </h2>
              <p className="text-muted-foreground">
                Повернення товару можливе протягом 14 днів з моменту отримання за умови збереження товарного вигляду, споживчих властивостей та упаковки.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
