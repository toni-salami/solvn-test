import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Solvn — What guides us" },
      {
        name: "description",
        content:
          "The beliefs and values behind Solvn: simplicity, clarity, craftsmanship, innovation, focus, impact, integrity and empathy.",
      },
      { property: "og:title", content: "About Solvn — What guides us" },
      {
        property: "og:description",
        content: "The beliefs and values behind Solvn, a storefront platform for Nigerian sellers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    name: "Simplicity",
    body: "We reduce every product to its essential form, removing what is unnecessary so that what remains can serve the person without friction.",
  },
  {
    name: "Clarity",
    body: "Every solution we build makes its purpose unmistakable, so the people who use it never need to wonder what to do next.",
  },
  {
    name: "Craftsmanship",
    body: "We treat the smallest detail with the same care as the biggest idea, because the integrity of a product is measured in the quiet places few will ever notice.",
  },
  {
    name: "Innovation",
    body: "We build what has not yet been built, in service of human needs that have long been overlooked. Novelty without usefulness is decoration we refuse to make.",
  },
  {
    name: "Focus",
    body: "We commit fully to the problem in front of us and resist the temptation to solve everything at once, because depth is what turns ideas into products that hold up.",
  },
  {
    name: "Impact",
    body: "Every project we deliver must move a measurable thing for the people it serves. Outputs are easy to ship; outcomes are the work.",
  },
  {
    name: "Integrity",
    body: "We say what we will build, build what we said, and stand behind it once it ships, because trust is the foundation that allows an idea to become a product worth using.",
  },
  {
    name: "Empathy",
    body: "We design from the lived experience of the people we serve, never from assumptions about them. A solution that ignores the human at its centre is not a solution at all.",
  },
];

function AboutPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="border-b border-border py-16 sm:py-24">
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            We believe that...
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            &ldquo;Development lies in the minds of men, in the institutions where their thinking
            finds expression, and in the play of opportunities on men and institutions.&rdquo;
          </p>
        </section>

        <section className="py-14 sm:py-20">
          <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
            what <em className="italic">guides</em> us
          </h2>

          <ul className="mt-8">
            {values.map((v, i) => {
              const isOpen = open === i;
              const numeral = String(i + 1).padStart(2, "0");
              return (
                <li key={v.name} className="border-t border-border last:border-b">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`value-panel-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 py-5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {numeral}
                    </span>
                    <span className="flex-1 font-serif text-xl italic sm:text-2xl">{v.name}</span>
                    <span aria-hidden className="shrink-0 text-lg text-muted-foreground">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div id={`value-panel-${i}`} className="pb-6 pl-12 pr-8">
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {v.body}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
