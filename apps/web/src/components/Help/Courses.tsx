import useDictionary from "@/dictionaries/useDictionary";

const Courses = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/list.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-xl">{dict.help.courses.title}</span>
      <p className="leading-relaxed">{dict.help.courses.description}</p>
    </div>
  );
};

export default Courses;
