import { PageHeader, PageShell, Section } from "@courseweb/ui";
import { ExternalLink } from "lucide-react";

import EmptyIssueForm from "./EmptyIssueForm";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const IssuesPage = () => {
  const dict = useDictionary();

  return (
    <PageShell width="content">
      <PageHeader
        className="[&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {dict.issues.title}
          </span>
        }
      />

      <Section
        title={dict.issues.data_sources.title}
        description={dict.issues.data_sources.intro}
      >
        <div className="space-y-3">
          {dict.issues.data_sources.sources.map((source) => (
            <div key={source.url} className="space-y-1">
              <h3 className="text-sm font-semibold">{source.title}</h3>
              <a
                className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.link_label}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ))}
          <p className="max-w-prose text-sm text-muted-foreground">
            {dict.issues.data_sources.update_note}
          </p>
        </div>
      </Section>

      <Section
        title={dict.issues.form.title}
        description={dict.issues.form.description}
      >
        <EmptyIssueForm />
      </Section>

      <Footer />
    </PageShell>
  );
};

export default IssuesPage;
