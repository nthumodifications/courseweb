"use client";
import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const CeranaSponsorBanner = () => {
  const dict = useDictionary();
  return (
    <Link
      href="/contribute"
      className="block w-full bg-white dark:bg-neutral-800 border border-border rounded-md p-2 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-row gap-2 items-center">
        <Image
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
          <div className="font-medium text-sm">{dict.sponsorship.cerana}</div>
        </div>
        <ArrowRight size={14} className="text-gray-400" />
      </div>
    </Link>
  );
};

export default CeranaSponsorBanner;
