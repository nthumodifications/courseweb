"use client";
import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface SponsorshipBannerProps {
  url?: string;
}

const SponsorshipBanner = ({
  url = "https://opencollective.com/nthumods/contribute",
}: SponsorshipBannerProps) => {
  const dict = useDictionary();
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-white dark:bg-neutral-800 border border-border rounded-md p-3 hover:border-primary/30 transition-colors group"
    >
      <div className="flex flex-col gap-1">
        <div className="font-medium text-sm">{dict.sponsorship.title}</div>
        <div className="text-xs text-muted-foreground">
          {dict.sponsorship.description}
        </div>
      </div>

      <div className="flex items-center mt-2">
        <div className="flex-1 relative h-4 overflow-hidden">
          <svg
            className="text-red-500 absolute"
            width="100%"
            height="16"
            viewBox="0 0 100 16"
            preserveAspectRatio="none"
          >
            <path
              d="M0,8 C20,3 40,13 60,8 C80,3 100,13 100,8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <ArrowRight size={16} className="text-gray-400" />
      </div>
    </Link>
  );
};

export default SponsorshipBanner;
