import useDictionary from "@/dictionaries/useDictionary";

const Waitlist = () => {
  const dict = useDictionary();
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex flex-col max-w-xl space-y-2 w-[min(100vw,64rem)] px-2 py-4">
        <span className="font-bold text-4xl">
          {dict.pages.waitlist_title}
        </span>
        <span>{dict.pages.waitlist_message}</span>
      </div>
    </div>
  );
};

export default Waitlist;
