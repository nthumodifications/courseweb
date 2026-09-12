import { PageHeader, PageShell, Section } from "@courseweb/ui";

import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const NextSteps = () => {
  const dict = useDictionary();
  const copy = dict.next_steps_page;

  return (
    <PageShell width="content">
      <PageHeader
        className="[&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {copy.title}
          </span>
        }
        description={copy.updated}
      />

      <p className="max-w-prose text-sm">{copy.intro}</p>

      {copy.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-sm">
              {paragraph}
            </p>
          ))}
        </Section>
      ))}

      <div className="max-w-prose space-y-3 text-sm">
        {copy.closing.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="text-right">{copy.signoff}</p>
      </div>

      <Footer />
    </PageShell>
  );
};

export default NextSteps;
