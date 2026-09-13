import { Button } from "@courseweb/ui";
import {
  BugIcon,
  Lightbulb,
  Mail,
  Paperclip,
  Heart,
  DollarSign,
  Users,
  Code,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import IssueFormDialog from "@/components/Forms/IssueFormDialog";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const ContributePage = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-4 px-4">
      <article className="flex flex-col gap-4">
        {/* Sponsors Section */}
        <section className="flex flex-col gap-4">
          <h1 className="text-base font-bold flex items-center gap-2">
            <Heart className="w-4 h-4" />
            {dict.contribute.sponsors.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {dict.contribute.sponsors.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Algolia */}
            <div className="flex flex-row items-center gap-4 py-4">
              <div className="shrink-0">
                <img
                  src="/images/Algolia-mark-blue.png"
                  alt={dict.contribute.sponsors.algolia_name}
                  width={64}
                  height={64}
                />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-bold">
                  {dict.contribute.sponsors.algolia_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dict.contribute.sponsors.algolia}
                </p>
              </div>
            </div>

            {/* Cerana Studios */}
            <div className="flex flex-row items-center gap-4 py-4">
              <div className="shrink-0">
                <img
                  src="/images/cerana_dc.png"
                  alt={dict.contribute.sponsors.cerana_name}
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-bold">
                  {dict.contribute.sponsors.cerana_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dict.contribute.sponsors.cerana}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="flex flex-row items-center gap-4 py-4">
            <Users className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-bold">
                {dict.contribute.stats.active_users_value}
              </div>
              <div className="text-sm text-muted-foreground">
                {dict.contribute.stats.active_users}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4 py-4">
            <Code className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-bold">
                {dict.contribute.stats.open_source_value}
              </div>
              <div className="text-sm text-muted-foreground">
                {dict.contribute.stats.open_source}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4 py-4">
            <Sparkles className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-bold">
                {dict.contribute.stats.years_running_value}
              </div>
              <div className="text-sm text-muted-foreground">
                {dict.contribute.stats.years_running}
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4 py-4">
            <MessageSquare className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-bold">
                {dict.contribute.stats.community_value}
              </div>
              <div className="text-sm text-muted-foreground">
                {dict.contribute.stats.community}
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-base font-bold">
          {dict.contribute.how_to_contribute.title}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {dict.contribute.how_to_contribute.description}
        </p>

        <h2 className="text-base font-bold">
          {dict.contribute.financial_support.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {dict.contribute.financial_support.description}
        </p>
        <div className="flex flex-row gap-4">
          <Button variant="outline" asChild>
            <a href="https://opencollective.com/nthumods">
              <DollarSign className="w-4 h-4 mr-2" />
              <span>{dict.contribute.financial_support.opencollective}</span>
            </a>
          </Button>
        </div>

        <h1 className="text-base font-bold">
          {dict.contribute.for_everyone.title}
        </h1>
        <h2 className="text-base font-bold">
          {dict.contribute.for_everyone.feedback.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {dict.contribute.for_everyone.feedback.description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <IssueFormDialog>
            <div className="flex flex-row items-center gap-2 py-4 cursor-pointer">
              <Paperclip className="w-4 h-4" />
              <div className="text-sm">
                {dict.contribute.for_everyone.feedback.form}
              </div>
            </div>
          </IssueFormDialog>
          <a href="mailto:nthumods@gmail.com">
            <div className="flex flex-row items-center gap-2 py-4 cursor-pointer">
              <Mail className="w-4 h-4" />
              <div className="text-sm">
                {dict.contribute.for_everyone.feedback.email}
              </div>
            </div>
          </a>
          <a href="https://instagram.com/nthumods">
            <div className="flex flex-row items-center gap-2 py-4 cursor-pointer">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <div className="text-sm">
                {dict.contribute.for_everyone.feedback.instagram}
              </div>
            </div>
          </a>
        </div>

        <h1 className="text-base font-bold">
          {dict.contribute.for_developers.title}
        </h1>
        <h2 className="text-base font-bold">
          {dict.contribute.for_developers.bug_reports.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {dict.contribute.for_developers.bug_reports.description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <a href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=">
            <div className="cursor-pointer flex flex-row items-center gap-4 py-4">
              <BugIcon className="w-4 h-4" />
              <div className="flex flex-col">
                <div className="font-bold">
                  {dict.contribute.for_developers.bug_reports.bug}
                </div>
                <div className="text-sm">
                  {dict.contribute.for_developers.bug_reports.bug_description}
                </div>
              </div>
            </div>
          </a>
          <a
            href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=feature_request.md&title="
            className="text-inherit no-underline"
          >
            <div className="cursor-pointer flex flex-row items-center gap-4 py-4">
              <Lightbulb className="w-4 h-4" />
              <div className="flex flex-col">
                <div className="font-bold">
                  {dict.contribute.for_developers.bug_reports.feature}
                </div>
                <div className="text-sm">
                  {
                    dict.contribute.for_developers.bug_reports
                      .feature_description
                  }
                </div>
              </div>
            </div>
          </a>
        </div>

        <h2 className="text-base font-bold">
          {dict.contribute.for_developers.code_design.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {dict.contribute.for_developers.code_design.description}
        </p>
        <div className="flex flex-row gap-4">
          <Button variant="outline" asChild>
            <a href="https://github.com/nthumodifications/courseweb">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>
                {dict.contribute.for_developers.code_design.github_repo}
              </span>
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://github.com/nthumodifications/courseweb/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22">
              <Sparkles />
              <span>
                {dict.contribute.for_developers.code_design.good_first_issues}
              </span>
            </a>
          </Button>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="text-base font-bold">
            {dict.contribute.call_to_action.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {dict.contribute.call_to_action.description}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <a href="https://github.com/nthumodifications/courseweb">
                {dict.contribute.call_to_action.start_contributing}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://opencollective.com/nthumods">
                {dict.contribute.call_to_action.support_us}
              </a>
            </Button>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default ContributePage;
