import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
const OpenCollectiveSponsorBanner = () => {
  const dict = useDictionary();
  return (
    <a
      href="https://opencollective.com/nthumods"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-white dark:bg-neutral-800 border border-border rounded-md p-2 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg text-center w-7">❤️</div>
          <div className="flex flex-col">
            <div className="font-medium text-sm">
              {dict.sponsorship.opencollective.title}
            </div>
            <div className="text-muted-foreground text-xs">
              {dict.sponsorship.opencollective.subtitle}
            </div>
          </div>
        </div>
        <ArrowRight size={14} className="text-gray-400" />
      </div>
    </a>
  );
};

export default OpenCollectiveSponsorBanner;
