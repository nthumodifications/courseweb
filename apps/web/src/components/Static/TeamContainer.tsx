import useDictionary from "@/dictionaries/useDictionary";

const TeamContainer = () => {
  const dict = useDictionary();

  return (
    <div>
      <h1 className="text-xl font-bold pl-4">{dict.static.team_title}</h1>
      <p className="leading-relaxed">{dict.static.team_description}</p>
      <h2 className="text-xl font-bold pl-4">{dict.static.core_title}</h2>
    </div>
  );
};

export default TeamContainer;
