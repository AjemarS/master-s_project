interface Testimonial {
  author: { avatar: string; handle: string; name: string };
  text: string;
}

const ua: Testimonial[] = [
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      handle: "@olenka_tech",
      name: "Олена Ковальчук",
    },
    text: "Замовляла холодильник — привезли наступного дня. Все працює ідеально. Дуже задоволена сервісом!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      handle: "@andriy_ua",
      name: "Андрій Мельник",
    },
    text: "Купував пральну машину. Допомогли з вибором, не нав'язували найдорожчий варіант. Доставка швидка, дякую!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
      handle: "@marichka_design",
      name: "Марія Шевченко",
    },
    text: "Чудовий магазин техніки! Знайшла все необхідне для нової кухні. Ціни приємно здивували.",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      handle: "@dmytro_tech",
      name: "Дмитро Бондаренко",
    },
    text: "Мікросервісна архітектура — це кайф. А якщо серйозно, то магазин працює бездоганно. Рекомендую!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      handle: "@sofia_reviews",
      name: "Софія Кравченко",
    },
    text: "Нарешті магазин техніки, де не почуваєшся дурнем. Все зрозуміло пояснюють, підтримка на висоті!",
  },
];

const en: Testimonial[] = [
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      handle: "@olenka_tech",
      name: "Olena Kovalchuk",
    },
    text: "Ordered a refrigerator — delivered the next day. Everything works perfectly. Very satisfied with the service!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      handle: "@andriy_ua",
      name: "Andriy Melnyk",
    },
    text: "Bought a washing machine. They helped me choose without pushing the most expensive option. Fast delivery, thank you!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
      handle: "@marichka_design",
      name: "Mariya Shevchenko",
    },
    text: "Great appliance store! Found everything I needed for my new kitchen. The prices were pleasantly surprising.",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      handle: "@dmytro_tech",
      name: "Dmytro Bondarenko",
    },
    text: "Microservice architecture is awesome. But seriously, the store works flawlessly. Recommend!",
  },
  {
    author: {
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      handle: "@sofia_reviews",
      name: "Sofia Kravchenko",
    },
    text: "Finally an appliance store where you don't feel stupid. They explain everything clearly, top-notch support!",
  },
];

export function getTestimonials(locale: string): Testimonial[] {
  return locale === "en" ? en : ua;
}
