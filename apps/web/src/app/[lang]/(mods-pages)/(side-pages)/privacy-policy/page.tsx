import { PageHeader, PageShell, Section } from "@courseweb/ui";

import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const PrivacyPolicyPage = () => {
  const dict = useDictionary();

  return (
    <PageShell width="content">
      <PageHeader
        className="[&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {dict.privacy_policy_page.title}
          </span>
        }
        description={dict.privacy_policy_page.updated}
      />

      <p className="max-w-prose text-sm">{dict.privacy_policy_page.intro}</p>

      {dict.privacy_policy_page.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-sm">
              {paragraph}
            </p>
          ))}
          {section.items.length > 0 && (
            <ul className="max-w-prose list-disc space-y-3 pl-4 text-sm">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Section>
      ))}

      {dict.privacy_policy_page.closing && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {dict.privacy_policy_page.closing}
        </p>
      )}

      <Footer />
    </PageShell>
  );
};

export default PrivacyPolicyPage;
