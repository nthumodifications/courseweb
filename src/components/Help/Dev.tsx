import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const Dev = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/crane.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">{dict.help.dev.title}</span>
      <span className="">{dict.help.dev.description}</span>
      <div>
        <Link target="_blank" href="https://forms.gle/LKYiVhLVwRGL44pz6">
          <Button variant="outline">{dict.help.dev.feedback}</Button>
        </Link>
      </div>
    </div>
  );
};

export default Dev;
