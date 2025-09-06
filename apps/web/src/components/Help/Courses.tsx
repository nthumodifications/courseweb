import useDictionary from "@/dictionaries/useDictionary";

const Courses = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/list.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">{dict.help.courses.title}</span>
      <span className="">{dict.help.courses.description}</span>
    </div>
  );
};

export default Courses;
