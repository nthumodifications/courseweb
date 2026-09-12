import { PageHeader, PageShell, Section } from "@courseweb/ui";

import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const PrivacyPolicyPage = () => {
  const dict = useDictionary();

  return (
    <PageShell width="content">
      <PageHeader
        title={dict.privacy_policy_page.title}
        description={dict.privacy_policy_page.updated}
      />

      {dict.privacy_policy_page.sections.map((section, index) => (
        <Section key={section.title} title={section.title}>
          {index === 0 && (
            <p className="max-w-prose text-sm">
              {dict.privacy_policy_page.intro}
            </p>
          )}
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
          {index === dict.privacy_policy_page.sections.length - 1 &&
            dict.privacy_policy_page.closing && (
              <p className="max-w-prose text-sm text-muted-foreground">
                {dict.privacy_policy_page.closing}
              </p>
            )}
        </Section>
      ))}

      <Footer />
    </PageShell>
  );
};

export default PrivacyPolicyPage;
