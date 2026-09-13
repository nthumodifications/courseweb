import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight, Heart } from "lucide-react";
const OpenCollectiveSponsorBanner = () => {
  const dict = useDictionary();
  return (
    <a
      href="https://opencollective.com/nthumods"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-card border border-border rounded-md p-2 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
          <div className="flex flex-col">
            <div className="font-medium text-sm text-card-foreground">
              {dict.sponsorship.opencollective.title}
            </div>
            <div className="text-muted-foreground text-xs">
              {dict.sponsorship.opencollective.subtitle}
            </div>
          </div>
        </div>
        <ArrowRight size={14} className="text-muted-foreground" />
      </div>
    </a>
  );
};

export default OpenCollectiveSponsorBanner;
