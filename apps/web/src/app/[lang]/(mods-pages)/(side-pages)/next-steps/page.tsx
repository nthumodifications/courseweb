import { PageHeader, PageShell, Section } from "@courseweb/ui";

import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const NextSteps = () => {
  const dict = useDictionary();
  const copy = dict.next_steps_page;

  return (
    <PageShell width="content">
      <PageHeader title={copy.title} description={copy.updated} />

      {copy.sections.map((section, index) => (
        <Section key={section.title} title={section.title}>
          {index === 0 && <p className="max-w-prose text-sm">{copy.intro}</p>}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-sm">
              {paragraph}
            </p>
          ))}
          {index === copy.sections.length - 1 && (
            <div className="max-w-prose space-y-3 text-sm">
              {copy.closing.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>{copy.signoff}</p>
            </div>
          )}
        </Section>
      ))}

      <Footer />
    </PageShell>
  );
};

export default NextSteps;
