import { AlertTriangle } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

export const AISError = () => {
  const dict = useDictionary();
  return (
  <div className="w-full grid place-items-center h-[--content-height]">
    <div className="flex flex-col space-y-4 items-center">
      {/* <div className='animate-spin rounded-full h-16 w-16 border-2 border-border'></div> */}
      <AlertTriangle className="h-14 w-14 text-foreground " />
      <p className="text-foreground ">
        {dict.pages.ais_error}
      </p>
    </div>
  </div>
  );
};
