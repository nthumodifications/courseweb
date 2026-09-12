import { Section } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const TeamContainer = () => {
  const dict = useDictionary();

  return (
    <Section title={dict.team.about_title}>
      <p className="max-w-prose text-sm">{dict.team.about_description}</p>
    </Section>
  );
};

export default TeamContainer;
