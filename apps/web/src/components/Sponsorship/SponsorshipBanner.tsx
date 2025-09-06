"use client";
import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SponsorshipBanner = () => {
  const dict = useDictionary();
  return (
    <Link
      href="/contribute"
      className="block w-full bg-white dark:bg-neutral-800 border border-border rounded-md p-3 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-row gap-4 items-center">
        <Image
          src="/images/cerana_dc.png"
          alt={dict.sponsorship.cerana}
          width={48}
          height={48}
          className="rounded-lg"
        />
        <div className="flex flex-col gap-1">
          <div className="text-muted-foreground text-xs">
            {dict.sponsorship.title}
          </div>
          <div className="font-medium text-sm">{dict.sponsorship.cerana}</div>
        </div>
      </div>

      <div className="flex items-center mt-2 justify-end">
        <p className="text-xs text-muted-foreground mr-2">learn more</p>
        <ArrowRight size={16} className="text-gray-400" />
      </div>
    </Link>
  );
};

export default SponsorshipBanner;
