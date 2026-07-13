interface Testimonial {
  author: { avatar: string; handle: string; name: string };
  text: string;
}

const authors = [
  {
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    handle: "@olenka_tech",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    handle: "@andriy_ua",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    handle: "@marichka_design",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    handle: "@dmytro_tech",
  },
  {
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    handle: "@sofia_reviews",
  },
];

export function getTestimonials(t: (key: string) => string): Testimonial[] {
  return authors.map((author, index) => ({
    author: {
      avatar: author.avatar,
      handle: author.handle,
      name: t(`${index}_name`),
    },
    text: t(`${index}_text`),
  }));
}
