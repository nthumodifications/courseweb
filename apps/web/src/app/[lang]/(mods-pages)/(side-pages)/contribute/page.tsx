import { Button, PageHeader, PageShell, Section } from "@courseweb/ui";
import {
  BugIcon,
  Code,
  DollarSign,
  Github,
  Heart,
  Instagram,
  Lightbulb,
  Mail,
  MessageSquare,
  Paperclip,
  Sparkles,
  Users,
} from "lucide-react";

import IssueFormDialog from "@/components/Forms/IssueFormDialog";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const ContributePage = () => {
  const dict = useDictionary();

  return (
    <PageShell width="content">
      <PageHeader
        className="text-center [&>div:first-child]:justify-center [&_h1]:overflow-visible [&_h1]:text-clip [&_h1]:whitespace-normal"
        title={
          <span className="text-4xl font-bold tracking-tight">
            {dict.contribute.title}
          </span>
        }
        description={dict.contribute.subtitle}
      />

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Heart
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            {dict.contribute.sponsors.title}
          </span>
        }
        description={dict.contribute.sponsors.description}
        variant="card"
      >
        <div className="flex flex-wrap items-start justify-center gap-8">
          <div className="flex min-w-32 flex-col items-center gap-2 text-center">
            <div className="rounded-lg border border-border bg-background p-4">
              <img
                src="/images/Algolia-mark-blue.png"
                alt={dict.contribute.sponsors.algolia_name}
                width={64}
                height={64}
              />
            </div>
            <h3 className="text-base font-semibold">
              {dict.contribute.sponsors.algolia_name}
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              {dict.contribute.sponsors.algolia}
            </p>
          </div>

          <div className="flex min-w-32 flex-col items-center gap-2 text-center">
            <div className="rounded-lg border border-border bg-background p-4">
              <img
                src="/images/cerana_dc.png"
                alt={dict.sponsorship.cerana}
                width={64}
                height={64}
                className="rounded-lg"
              />
            </div>
            <h3 className="text-base font-semibold">
              {dict.sponsorship.cerana}
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              {dict.contribute.sponsors.cerana}
            </p>
          </div>
        </div>
      </Section>

      <Section title={dict.contribute.stats.title}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <Users
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="mt-2 text-xl font-medium tabular-nums text-primary">
              19k+
            </div>
            <div className="text-xs text-muted-foreground">
              {dict.contribute.stats.active_users}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <Code
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="mt-2 text-xl font-medium tabular-nums text-primary">
              100%
            </div>
            <div className="text-xs text-muted-foreground">
              {dict.contribute.stats.open_source}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <Sparkles
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="mt-2 text-xl font-medium tabular-nums text-primary">
              2+
            </div>
            <div className="text-xs text-muted-foreground">
              {dict.contribute.stats.years_running}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <MessageSquare
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="mt-2 text-xl font-medium tabular-nums text-primary">
              24/7
            </div>
            <div className="text-xs text-muted-foreground">
              {dict.contribute.stats.community}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={dict.contribute.how_to_contribute.title}
        description={dict.contribute.how_to_contribute.description}
      >
        <Section
          title={dict.contribute.financial_support.title}
          description={dict.contribute.financial_support.description}
        >
          <Button variant="outline" asChild>
            <a
              href="https://opencollective.com/nthumods"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DollarSign aria-hidden="true" />
              {dict.contribute.financial_support.opencollective}
            </a>
          </Button>
        </Section>
      </Section>

      <Section title={dict.contribute.for_everyone.title}>
        <Section
          title={dict.contribute.for_everyone.feedback.title}
          description={dict.contribute.for_everyone.feedback.description}
        >
          <div className="flex flex-wrap gap-3">
            <IssueFormDialog>
              <Button variant="outline">
                <Paperclip aria-hidden="true" />
                {dict.contribute.for_everyone.feedback.form}
              </Button>
            </IssueFormDialog>
            <Button variant="outline" asChild>
              <a href="mailto:nthumods@gmail.com">
                <Mail aria-hidden="true" />
                {dict.contribute.for_everyone.feedback.email}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://instagram.com/nthumods"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram aria-hidden="true" />
                {dict.contribute.for_everyone.feedback.instagram}
              </a>
            </Button>
          </div>
        </Section>
      </Section>

      <Section title={dict.contribute.for_developers.title}>
        <Section
          title={dict.contribute.for_developers.bug_reports.title}
          description={dict.contribute.for_developers.bug_reports.description}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=bug_report.md&title="
                target="_blank"
                rel="noopener noreferrer"
              >
                <BugIcon aria-hidden="true" />
                <span>{dict.contribute.for_developers.bug_reports.bug}</span>
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=feature_request.md&title="
                target="_blank"
                rel="noopener noreferrer"
              >
                <Lightbulb aria-hidden="true" />
                <span>
                  {dict.contribute.for_developers.bug_reports.feature}
                </span>
              </a>
            </Button>
          </div>
        </Section>

        <Section
          title={dict.contribute.for_developers.code_design.title}
          description={dict.contribute.for_developers.code_design.description}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nthumodifications/courseweb"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github aria-hidden="true" />
                {dict.contribute.for_developers.code_design.github_repo}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://github.com/nthumodifications/courseweb/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Sparkles aria-hidden="true" />
                {dict.contribute.for_developers.code_design.good_first_issues}
              </a>
            </Button>
          </div>
        </Section>
      </Section>

      <Section title={dict.contribute.call_to_action.title} variant="card">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {dict.contribute.call_to_action.description}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a
                href="https://github.com/nthumodifications/courseweb"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dict.contribute.call_to_action.start_contributing}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://opencollective.com/nthumods"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dict.contribute.call_to_action.support_us}
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Footer />
    </PageShell>
  );
};

export default ContributePage;
