import { getTranslations } from "next-intl/server";

import { FadeIn } from "~/ui/components/motion/fade-in";

type Section = { heading?: string; body: string };

/** Text pages (about, terms, FAQ…) read title and sections from messages: pages.<name> */
export async function StaticPage({ name }: { name: string }) {
  const t = await getTranslations(`pages.${name}`);
  const sections = t.raw("sections") as Section[];

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-warm">
      <FadeIn direction="up">
        <section className="py-8 md:py-10">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-10 text-4xl font-bold tracking-tight text-foreground">{t("title")}</h1>
            <div className="space-y-8">
              {sections.map((s, i) => (
                <section key={i}>
                  {s.heading && <h2 className="mb-2 text-xl font-semibold text-foreground">{s.heading}</h2>}
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
