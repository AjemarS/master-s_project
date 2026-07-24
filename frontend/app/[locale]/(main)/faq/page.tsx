import { FadeIn } from "~/ui/components/motion/fade-in";

export default function FaqPage() {
  const faqItems = [
    {
      question: "Як зробити замовлення?",
      answer: "Оберіть товар, додайте до кошика та оформте замовлення.",
    },
    {
      question: "Як довго триває доставка?",
      answer: "1-3 робочі дні по Україні.",
    },
    {
      question: "Чи можна повернути товар?",
      answer: "Так, протягом 14 днів.",
    },
    {
      question: "Які способи оплати?",
      answer: "Готівка, картка, безготівковий.",
    },
    {
      question: "Чи є гарантія?",
      answer: "Так, від 1 до 3 років залежно від виробника.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-10 text-4xl font-bold tracking-tight text-foreground">
              Поширені запитання
            </h1>
            <div className="space-y-0">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-border py-6 last:border-b-0"
                >
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
