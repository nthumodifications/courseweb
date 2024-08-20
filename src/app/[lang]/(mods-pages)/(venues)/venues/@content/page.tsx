import { getDictionary } from "@/dictionaries/dictionaries";
import { LangProps } from "@/types/pages";

const Placeholder = async ({ params: { lang } }: LangProps) => {
  const dict = await getDictionary(lang);
  return (
    <div className="hidden h-full max-h-screen min-h-[500px] w-full md:grid place-content-center">
      <h1 className="text-xl font-semibold text-gray-400">
        {dict.venues.placeholder}
      </h1>
    </div>
  );
};

export default Placeholder;
