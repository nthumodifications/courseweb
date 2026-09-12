import { Button } from "@courseweb/ui";
import { Github, Link2, LinkedinIcon } from "lucide-react";
import team from "@/const/team.json";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";
import { Link, useParams } from "react-router-dom";

/**
 * Woah woah did you stumble here? Is this because you wanna join us!
 *
 * Leave your name at ./const/team.json and let everyone remember who you are!
 */

const Team = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();

  return (
    <div className="flex flex-col gap-4 px-4">
      <article className="flex flex-col gap-4 leading-relaxed">
        <h1 className="text-base font-bold">{dict.team.about_title}</h1>
        <p>{dict.team.about_description}</p>
        <p>
          {dict.team.contact_before}{" "}
          <a href="mailto:nthumods@gmail.com">nthumods@gmail.com</a>{" "}
          {dict.team.or_our} {dict.team.github_repository}{" "}
          <a href="https://github.com/nthumodifications/courseweb">
            {dict.team.github_link}
          </a>
          .
        </p>
        <p>
          {dict.team.recruitment_intro}{" "}
          <Link to={`/${lang}/recruit`}>{dict.team.recruitment_link}</Link>
        </p>
        <h1 className="text-base font-bold">{dict.team.core_team}</h1>
        <div className="flex flex-col divide-y divide-border">
          {team
            .filter((t) => t.active)
            .map((member, index) => (
              <div
                key={index}
                className="flex flex-row w-full items-center gap-4 py-4"
              >
                <div className="shrink-0">
                  <img
                    src={member.photo}
                    alt={member.name_en}
                    className="w-20 h-20 rounded-full"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="">
                    <div className="font-bold">{member.name_zh}</div>
                    {member.name_en && (
                      <div className="text-sm">{member.name_en}</div>
                    )}
                  </div>
                  <div className="flex flex-row gap-2">
                    {member.link && (
                      <Button asChild variant="ghost" size="icon">
                        <a href={`${member.link}`} target="_blank">
                          <Link2 />
                        </a>
                      </Button>
                    )}
                    {member.github && (
                      <Button asChild variant="ghost" size="icon">
                        <a
                          href={`https://github.com/${member.github}`}
                          target="_blank"
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
        <h1 className="text-base font-bold">{dict.team.dedicated_members}</h1>
        <div className="flex flex-col divide-y divide-border">
          {team
            .filter((t) => !t.active)
            .map((member, index) => (
              <div key={index} className="flex flex-row w-full gap-4 py-4">
                <img
                  src={member.photo}
                  alt={member.name_en}
                  className="w-20 h-20 rounded-full shrink-0"
                />
                <div className="flex-1">
                  <div className="font-bold">
                    {member.name_zh} ({member.name_en})
                  </div>
                  <div>{member.description}</div>
                  <div className="flex flex-row gap-2">
                    {member.link && (
                      <Button asChild variant="ghost" size="icon">
                        <a href={`${member.link}`}>
                          <Link2 />
                        </a>
                      </Button>
                    )}
                    {member.github && (
                      <Button asChild variant="ghost" size="icon">
                        <a href={`https://github.com/${member.github}`}>
                          <Github />
                        </a>
                      </Button>
                    )}
                    {member.linkedin && (
                      <Button asChild variant="ghost" size="icon">
                        <a href={`https://linkedin.com/in/${member.linkedin}`}>
                          <LinkedinIcon />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default Team;
