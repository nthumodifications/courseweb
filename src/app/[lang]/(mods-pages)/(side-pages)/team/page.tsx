import { Button } from "@/components/ui/button";
import { Github, LinkedinIcon } from "lucide-react";
import Link from "next/link";

const team = [
    {
        name_zh: '丘子輝',
        name_en: 'Chew Tzi Hwee',
        role: 'Professional Procrastrinator',
        github: 'https://github.com/ImJustChew',
        linkedin: 'https://www.linkedin.com/in/ImJustChew/',
    }
]

const Team = () => {
    return (
        <div className="flex flex-col">
        <article className="prose prose-neutral dark:prose-invert">
            <h1>Who are we?</h1>
            <p>NTHUMods is a student-run project that aims to provide a better academic experience for students. We are dedicated to developing and maintaining a platform that helps students to plan their academic journey.</p>
            <p>
                Our team is always open to new ideas and suggestions. If you have any feedback or ideas, feel free to contact us at <a href="mailto:nthumods@gmail.com">nthumods@gmail.com</a> or our Github repository <a href="https://github.com/nthumodifications/courseweb">here</a>.
            </p>
            <h1>Core Team</h1>
            <ul>
                {team.map((member, index) => (
                    <li key={index}>
                        <h2>{member.name_zh} ({member.name_en})</h2>
                        <p>{member.role}</p>
                        <div className="flex flex-row gap-2">
                            <Button asChild variant="ghost">
                                <Link href={member.github}>
                                    <Github />
                                </Link>
                            </Button>
                            <Button asChild variant="ghost">
                                <Link href={member.linkedin}>
                                    <LinkedinIcon />
                                </Link>
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </article>

        </div>
    )
}

export default Team;