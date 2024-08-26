import { Button } from "@/components/ui/button";
import { Github, Link2, LinkedinIcon } from "lucide-react";
import Link from "next/link";
import team from "@/const/team.json";
import Footer from "@/components/Footer";

/**
 * Woah woah did you stumble here? Is this because you wanna join us!
 *
 * Leave your name at ./const/team.json and let everyone remember who you are!
 */

const Team = () => {
  return (
    <div className="flex flex-col px-3">
      <article className="prose prose-neutral dark:prose-invert">
        <h1>Who are we?</h1>
        <p>
          NTHUMods is a student-run project that aims to provide a better
          academic experience for students. We are dedicated to developing and
          maintaining a platform that helps students to plan their academic
          journey.
        </p>
        <p>
          Our team is always open to new ideas and suggestions. If you have any
          feedback or ideas, feel free to contact us at{" "}
          <a href="mailto:nthumods@gmail.com">nthumods@gmail.com</a> or our
          Github repository{" "}
          <a href="https://github.com/nthumodifications/courseweb">here</a>.
        </p>
        <h1>Core Team</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 mb-8">
          {team
            .filter((t) => t.active)
            .map((member, index) => (
              <div key={index} className="flex flex-row w-full items-center">
                <div className="relative inline-block">
                  <img
                    src={member.photo}
                    alt={member.name_en}
                    className="w-20 h-20 rounded-full m-0"
                  />
                  <div className="absolute -top-2 -right-2 text-xs p-1 rounded-lg shadow-lg bg-neutral-50 text-black dark:bg-neutral-700 dark:text-white">
                    {member.description}
                  </div>
                </div>
                <div className="pl-4 flex-1 flex flex-col gap-1">
                  <div className="">
                    <div className="font-bold text-xl">{member.name_zh}</div>
                    {member.name_en && (
                      <div className="text-sm">{member.name_en}</div>
                    )}
                  </div>
                  <div className="flex flex-row gap-2">
                    {member.link && (
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`${member.link}`} target="_blank">
                          <Link2 />
                        </Link>
                      </Button>
                    )}
                    {member.github && (
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`https://github.com/${member.github}`}
                          target="_blank"
                        >
                          <Github />
                        </Link>
                      </Button>
                    )}
                    {member.linkedin && (
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`https://linkedin.com/in/${member.linkedin}`}
                          target="_blank"
                        >
                          <LinkedinIcon />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
        <h1>Dedicated Members</h1>
        <div className="flex flex-row w-full">
          {team
            .filter((t) => !t.active)
            .map((member, index) => (
              <div key={index} className="flex flex-row w-full">
                <img
                  src={member.photo}
                  alt={member.name_en}
                  className="w-20 h-20 rounded-full"
                />
                <div className="pl-4 flex-1">
                  <div className="font-bold text-xl my-1">
                    {member.name_zh} ({member.name_en})
                  </div>
                  <div>{member.description}</div>
                  <div className="flex flex-row gap-2">
                    {member.link && (
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`${member.link}`}>
                          <Link2 />
                        </Link>
                      </Button>
                    )}
                    {member.github && (
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`https://github.com/${member.github}`}>
                          <Github />
                        </Link>
                      </Button>
                    )}
                    {member.linkedin && (
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`https://linkedin.com/i/${member.linkedin}`}
                        >
                          <LinkedinIcon />
                        </Link>
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
