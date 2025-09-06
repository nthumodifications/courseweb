import useDictionary from "@/dictionaries/useDictionary";

const Intro = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/friendship.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">{dict.help.intro.title}</span>
      <span className="">{dict.help.intro.description}</span>
    </div>
  );
};

export default Intro;
