import { Button, PageHeader, PageShell, Section } from "@courseweb/ui";
import { Github, Link2, LinkedinIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import team from "@/const/team.json";
import useDictionary from "@/dictionaries/useDictionary";
import Footer from "@/components/Footer";

const Team = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const coreMembers = team.filter((member) => member.active);
  const dedicatedMembers = team.filter((member) => !member.active);

  return (
    <PageShell width="content">
      <PageHeader title={dict.team.title} />

      <Section title={dict.team.about_title}>
        <div className="max-w-prose space-y-3 text-sm">
          <p>{dict.team.about_description}</p>
          <p>
            {dict.team.contact_intro}{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="mailto:nthumods@gmail.com"
            >
              {dict.team.email_link}
            </a>{" "}
            {dict.team.recruitment_intro}{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={`/${lang}/recruit`}
            >
              {dict.team.recruitment_link}
            </Link>
          </p>
        </div>
      </Section>

      <Section title={dict.team.core_title}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coreMembers.map((member) => (
            <div
              key={member.name_en}
              className="flex h-full min-w-0 items-start gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex shrink-0 flex-col items-start">
                <img
                  src={member.photo}
                  alt={member.name_en}
                  className="h-16 w-16 rounded-full object-cover"
                />
              </div>
              <div className="flex min-h-24 min-w-0 flex-1 flex-col gap-3">
                <div>
                  <h3 className="text-base font-semibold">{member.name_zh}</h3>
                  <p className="text-sm text-muted-foreground">
                    {member.name_en}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  {member.link && (
                    <Button asChild variant="ghost" size="icon">
                      <a
                        href={member.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${dict.team.profile_link}: ${member.name_en}`}
                      >
                        <Link2 />
                      </a>
                    </Button>
                  )}
                  {member.github && (
                    <Button asChild variant="ghost" size="icon">
                      <a
                        href={`https://github.com/${member.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${dict.team.github_profile}: ${member.name_en}`}
                      >
                        <Github />
                      </a>
                    </Button>
                  )}
                  {member.linkedin && (
                    <Button asChild variant="ghost" size="icon">
                      <a
                        href={`https://linkedin.com/in/${member.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${dict.team.linkedin_profile}: ${member.name_en}`}
                      >
                        <LinkedinIcon />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {dedicatedMembers.length > 0 && (
        <Section title={dict.team.dedicated_title}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dedicatedMembers.map((member) => (
              <div
                key={member.name_en}
                className="flex h-full min-w-0 items-start gap-4 rounded-lg border border-border bg-card p-4"
              >
                <img
                  src={member.photo}
                  alt={member.name_en}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
                <div className="flex min-h-24 min-w-0 flex-1 flex-col gap-3">
                  <div>
                    <h3 className="text-base font-semibold">
                      {member.name_zh}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {member.name_en}
                    </p>
                    <p className="mt-2 text-sm">{member.description}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {member.link && (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={member.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dict.team.profile_link}: ${member.name_en}`}
                        >
                          <Link2 />
                        </a>
                      </Button>
                    )}
                    {member.github && (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={`https://github.com/${member.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dict.team.github_profile}: ${member.name_en}`}
                        >
                          <Github />
                        </a>
                      </Button>
                    )}
                    {member.linkedin && (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={`https://linkedin.com/in/${member.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dict.team.linkedin_profile}: ${member.name_en}`}
                        >
                          <LinkedinIcon />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Footer />
    </PageShell>
  );
};

export default Team;
