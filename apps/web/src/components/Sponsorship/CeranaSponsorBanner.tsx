import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const CeranaSponsorBanner = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  return (
    <Link
      to={`/${lang}/contribute`}
      className="block w-full bg-card border border-border rounded-md p-2 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-row gap-2 items-center">
        <img
          src="/images/cerana_dc.png"
          alt={dict.sponsorship.cerana}
          width={36}
          height={36}
          className="rounded-lg"
        />
        <div className="flex flex-col">
          <div className="text-muted-foreground text-xs">
            {dict.sponsorship.title}
          </div>
          <div className="font-medium text-sm text-card-foreground">
            {dict.sponsorship.cerana}
          </div>
        </div>
        <ArrowRight size={14} className="text-muted-foreground" />
      </div>
    </Link>
  );
};

export default CeranaSponsorBanner;
